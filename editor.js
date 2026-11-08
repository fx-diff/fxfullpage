import { getCapture } from './db.js';
import { buildPdf } from './pdf.js';

const $ = (sel) => document.querySelector(sel);
const HISTORY_LIMIT = 15;

const ui = {
  title: $('#title'),
  source: $('#source'),
  parts: $('#parts'),
  notice: $('#notice'),
  wrap: $('#wrap'),
  sel: $('#sel'),
  selSize: $('#sel-size'),
  cropActions: $('#crop-actions'),
  undo: $('#undo'),
  zoom: $('#zoom'),
  color: $('#color'),
  toast: $('#toast'),
};

let record = null;
let parts = []; // { canvas, history: HTMLCanvasElement[] }
let current = 0;
let tool = 'crop';
let actualSize = false;
let selection = null; // en pixels du canvas { x, y, w, h }
let drag = null;

// ---------- Utilitaires ----------

function cloneCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

async function blobToCanvas(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close();
  return c;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    if (type === 'image/jpeg') {
      // Le JPEG n'a pas de transparence : fond blanc.
      const flat = document.createElement('canvas');
      flat.width = canvas.width;
      flat.height = canvas.height;
      const ctx = flat.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, flat.width, flat.height);
      ctx.drawImage(canvas, 0, 0);
      canvas = flat;
    }
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage impossible'))), type, quality);
  });
}

let toastTimer;
function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toast.hidden = true), 2500);
}

function baseFilename() {
  const d = new Date(record.createdAt);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  let host = 'page';
  try { host = new URL(record.url).hostname.replace(/^www\./, '') || 'page'; } catch { /* ignore */ }
  return `capture-${host}-${stamp}`.replace(/[^\w.-]+/g, '_');
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------- Affichage ----------

function activeCanvas() {
  return parts[current].canvas;
}

function applyCanvasSize() {
  const c = activeCanvas();
  const ratio = actualSize ? window.devicePixelRatio || 1 : record.scale || 1;
  c.style.width = `${c.width / ratio}px`;
  ui.wrap.classList.toggle('actual', actualSize);
  ui.zoom.textContent = actualSize ? 'Ajuster' : 'Taille réelle';
  renderSelection();
}

function showPart(index) {
  clearSelection();
  current = index;
  ui.wrap.querySelector('canvas')?.remove();
  ui.wrap.prepend(activeCanvas());
  applyCanvasSize();
  [...ui.parts.children].forEach((b, i) => b.classList.toggle('active', i === index));
  updateButtons();
}

function updateButtons() {
  ui.undo.disabled = parts[current].history.length === 0;
}

function setTool(name) {
  tool = name;
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === name));
  clearSelection();
}

// ---------- Sélection ----------

function cssScale() {
  const c = activeCanvas();
  return c.getBoundingClientRect().width / c.width;
}

function renderSelection() {
  if (!selection) {
    ui.sel.hidden = true;
    ui.cropActions.hidden = true;
    return;
  }
  const k = cssScale();
  const { x, y, w, h } = selection;
  Object.assign(ui.sel.style, {
    left: `${x * k}px`, top: `${y * k}px`, width: `${w * k}px`, height: `${h * k}px`,
  });
  ui.sel.classList.toggle('annotate', tool !== 'crop');
  ui.sel.hidden = false;
  ui.selSize.textContent = `${Math.round(w)} × ${Math.round(h)}`;
  ui.selSize.style.top = y * k < 24 ? '4px' : '-22px';
  ui.selSize.style.left = y * k < 24 ? '4px' : '0';

  const showActions = tool === 'crop' && !drag && w > 2 && h > 2;
  ui.cropActions.hidden = !showActions;
  if (showActions) {
    const wrapH = ui.wrap.clientHeight;
    const bottom = (y + h) * k;
    const top = bottom + 40 > wrapH ? Math.max(4, bottom - 40) : bottom + 6;
    ui.cropActions.style.top = `${top}px`;
    ui.cropActions.style.left = `${Math.max(4, (x + w) * k - 150)}px`;
  }
}

function clearSelection() {
  selection = null;
  renderSelection();
}

function pointToCanvas(clientX, clientY) {
  const c = activeCanvas();
  const r = c.getBoundingClientRect();
  const k = c.width / r.width;
  return {
    x: Math.min(c.width, Math.max(0, (clientX - r.left) * k)),
    y: Math.min(c.height, Math.max(0, (clientY - r.top) * k)),
  };
}

function updateDragSelection() {
  const p = pointToCanvas(drag.clientX, drag.clientY);
  selection = {
    x: Math.min(drag.start.x, p.x),
    y: Math.min(drag.start.y, p.y),
    w: Math.abs(p.x - drag.start.x),
    h: Math.abs(p.y - drag.start.y),
  };
  renderSelection();
}

// Défilement automatique quand on tire la sélection vers le bord de la fenêtre.
function autoScrollLoop() {
  if (!drag) return;
  const edge = 40;
  let dy = 0;
  if (drag.clientY > window.innerHeight - edge) dy = Math.ceil((drag.clientY - (window.innerHeight - edge)) / 2);
  else if (drag.clientY < 80 + edge) dy = -Math.ceil((80 + edge - drag.clientY) / 2);
  if (dy) {
    window.scrollBy(0, dy);
    updateDragSelection();
  }
  drag.raf = requestAnimationFrame(autoScrollLoop);
}

ui.wrap.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.crop-actions')) return;
  e.preventDefault();
  ui.wrap.setPointerCapture(e.pointerId);
  drag = { start: pointToCanvas(e.clientX, e.clientY), clientX: e.clientX, clientY: e.clientY };
  updateDragSelection();
  drag.raf = requestAnimationFrame(autoScrollLoop);
});

ui.wrap.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.clientX = e.clientX;
  drag.clientY = e.clientY;
  updateDragSelection();
});

function endDrag() {
  if (!drag) return;
  cancelAnimationFrame(drag.raf);
  drag = null;
  if (!selection || selection.w < 3 || selection.h < 3) {
    clearSelection();
    return;
  }
  if (tool === 'crop') renderSelection();
  else applyAnnotation();
}
ui.wrap.addEventListener('pointerup', endDrag);
ui.wrap.addEventListener('pointercancel', endDrag);

// ---------- Opérations ----------

function pushHistory() {
  const part = parts[current];
  part.history.push(cloneCanvas(part.canvas));
  if (part.history.length > HISTORY_LIMIT) part.history.shift();
}

function replaceCanvas(next) {
  const part = parts[current];
  part.canvas.remove();
  part.canvas = next;
  ui.wrap.prepend(next);
  applyCanvasSize();
  updateButtons();
}

function rounded(sel) {
  const x = Math.round(sel.x);
  const y = Math.round(sel.y);
  return { x, y, w: Math.round(sel.x + sel.w) - x, h: Math.round(sel.y + sel.h) - y };
}

function applyCrop() {
  if (!selection) return;
  const { x, y, w, h } = rounded(selection);
  if (w < 1 || h < 1) return;
  pushHistory();
  const next = document.createElement('canvas');
  next.width = w;
  next.height = h;
  next.getContext('2d').drawImage(activeCanvas(), -x, -y);
  clearSelection();
  replaceCanvas(next);
  window.scrollTo({ top: 0 });
}

function applyAnnotation() {
  const { x, y, w, h } = rounded(selection);
  const canvas = activeCanvas();
  const ctx = canvas.getContext('2d');
  pushHistory();

  if (tool === 'box') {
    const lw = Math.max(2, Math.round(3 * (record.scale || 1)));
    ctx.save();
    ctx.strokeStyle = ui.color.value;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeRect(x + lw / 2, y + lw / 2, Math.max(0, w - lw), Math.max(0, h - lw));
    ctx.restore();
  } else if (tool === 'pixelate') {
    const block = Math.max(6, Math.round(10 * (record.scale || 1)));
    const sw = Math.max(1, Math.ceil(w / block));
    const sh = Math.max(1, Math.ceil(h / block));
    const small = document.createElement('canvas');
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext('2d');
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(canvas, x, y, w, h, 0, 0, sw, sh);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, sw, sh, x, y, w, h);
    ctx.restore();
  }
  clearSelection();
  updateButtons();
}

function undo() {
  const part = parts[current];
  const prev = part.history.pop();
  if (!prev) return;
  clearSelection();
  replaceCanvas(prev);
}

async function resetToOriginal() {
  const part = parts[current];
  pushHistory();
  clearSelection();
  replaceCanvas(await blobToCanvas(record.parts[current]));
  toast('Image originale restaurée (Ctrl+Z pour annuler)');
}

// ---------- Export ----------

async function exportImages(type, ext) {
  const base = baseFilename();
  for (let i = 0; i < parts.length; i++) {
    const blob = await canvasToBlob(parts[i].canvas, type, 0.92);
    const suffix = parts.length > 1 ? `-partie${i + 1}` : '';
    download(blob, `${base}${suffix}.${ext}`);
  }
}

async function exportPdf() {
  toast('Génération du PDF…');
  const blob = await buildPdf(parts.map((p) => p.canvas));
  download(blob, `${baseFilename()}.pdf`);
  toast('PDF prêt');
}

async function copyToClipboard() {
  try {
    const blobPromise = canvasToBlob(activeCanvas(), 'image/png');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
    toast('Image copiée dans le presse-papiers');
  } catch (err) {
    console.error(err);
    toast(`Copie impossible : ${err.message}`);
  }
}

function guard(fn) {
  return async (...args) => {
    try { await fn(...args); } catch (err) { console.error(err); toast(`Erreur : ${err.message}`); }
  };
}

// ---------- Câblage ----------

document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
$('#crop-apply').addEventListener('click', applyCrop);
$('#crop-cancel').addEventListener('click', clearSelection);
ui.undo.addEventListener('click', undo);
$('#reset').addEventListener('click', guard(resetToOriginal));
ui.zoom.addEventListener('click', () => { actualSize = !actualSize; applyCanvasSize(); });
$('#copy').addEventListener('click', guard(copyToClipboard));
$('#dl-png').addEventListener('click', guard(() => exportImages('image/png', 'png')));
$('#dl-jpg').addEventListener('click', guard(() => exportImages('image/jpeg', 'jpg')));
$('#dl-pdf').addEventListener('click', guard(exportPdf));
window.addEventListener('resize', renderSelection);

document.addEventListener('keydown', (e) => {
  if (!record || e.target.matches('input')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); guard(() => exportImages('image/png', 'png'))(); }
  else if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); guard(copyToClipboard)(); }
  else if (mod) return;
  else if (e.key === 'Enter' && selection && tool === 'crop') { e.preventDefault(); applyCrop(); }
  else if (e.key === 'Escape') clearSelection();
  else if (e.key === 'c') setTool('crop');
  else if (e.key === 'r') setTool('box');
  else if (e.key === 'b') setTool('pixelate');
  else if (e.key === 'z') { actualSize = !actualSize; applyCanvasSize(); }
});

// ---------- Chargement ----------

async function init() {
  const id = new URLSearchParams(location.search).get('id');
  record = id ? await getCapture(id) : null;
  if (!record) {
    ui.title.textContent = 'Capture introuvable (seules les 10 dernières sont conservées).';
    return;
  }
  document.title = `Capture – ${record.title || record.url}`;
  ui.title.textContent = record.title || 'Sans titre';
  ui.source.textContent = record.url;
  ui.source.href = record.url;

  parts = [];
  for (const blob of record.parts) parts.push({ canvas: await blobToCanvas(blob), history: [] });

  if (parts.length > 1) {
    ui.parts.hidden = false;
    parts.forEach((_, i) => {
      const b = document.createElement('button');
      b.textContent = `Partie ${i + 1}`;
      b.addEventListener('click', () => showPart(i));
      ui.parts.appendChild(b);
    });
  }

  const notes = [];
  if (parts.length > 1) notes.push(`La page est trop haute pour une seule image : elle a été découpée en ${parts.length} parties.`);
  if (record.truncated) notes.push('La page était extrêmement longue : la capture a été tronquée.');
  if (notes.length) { ui.notice.textContent = notes.join(' '); ui.notice.hidden = false; }

  showPart(0);
}

init().catch((err) => {
  console.error(err);
  ui.title.textContent = `Erreur de chargement : ${err.message}`;
});

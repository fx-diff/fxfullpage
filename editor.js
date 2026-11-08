import { getCapture } from './db.js';
import { buildPdf, drawStamp, stampHeight } from './pdf.js';

const $ = (sel) => document.querySelector(sel);
const t = (key, ...subs) => chrome.i18n.getMessage(key, subs.map(String)) || key;

document.documentElement.lang = chrome.i18n.getUILanguage();
document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
document.querySelectorAll('[data-i18n-title]').forEach((el) => (el.title = t(el.dataset.i18nTitle)));
document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel)));
document.title = t('editorTitle');
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
  size: $('#size'),
  stamp: $('#stamp'),
  overlay: $('#overlay'),
  arrowPreview: $('#arrow-preview'),
  textInput: $('#text-input'),
  toast: $('#toast'),
};

let record = null;
let parts = []; // { canvas, history: HTMLCanvasElement[] }
let current = 0;
let tool = 'crop';
let actualSize = false;
let selection = null; // in canvas pixels { x, y, w, h }
let drag = null;
let textAt = null; // canvas position of the text being typed

// ---------- Utilities ----------

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
      // JPEG has no transparency: use a white background.
      const flat = document.createElement('canvas');
      flat.width = canvas.width;
      flat.height = canvas.height;
      const ctx = flat.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, flat.width, flat.height);
      ctx.drawImage(canvas, 0, 0);
      canvas = flat;
    }
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t('encodeFailed')))), type, quality);
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

// ---------- Display ----------

function activeCanvas() {
  return parts[current].canvas;
}

function applyCanvasSize() {
  const c = activeCanvas();
  const ratio = actualSize ? window.devicePixelRatio || 1 : record.scale || 1;
  c.style.width = `${c.width / ratio}px`;
  ui.overlay.setAttribute('viewBox', `0 0 ${c.width} ${c.height}`);
  ui.wrap.classList.toggle('actual', actualSize);
  ui.zoom.textContent = actualSize ? t('zoomFit') : t('zoomActual');
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
  commitText();
  tool = name;
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === name));
  ui.wrap.classList.toggle('text-mode', name === 'text');
  clearSelection();
}

// Stroke and text sizes follow the capture's pixel density and the S / M / L choice.
function sizeFactor() {
  return parseFloat(ui.size.value) || 1;
}
function lineWidth() {
  return Math.max(2, Math.round(3 * (record.scale || 1) * sizeFactor()));
}
function fontPx() {
  return Math.max(10, Math.round(20 * (record.scale || 1) * sizeFactor()));
}

// ---------- Selection ----------

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
    // Below the selection, unless that falls outside the window or the image: then inside it.
    const wrapRect = ui.wrap.getBoundingClientRect();
    const bottom = (y + h) * k;
    const outside = bottom + 40 > wrapRect.height || wrapRect.top + bottom + 50 > window.innerHeight;
    const visibleBottom = window.innerHeight - wrapRect.top - 50;
    const top = outside ? Math.max(y * k + 4, Math.min(bottom - 40, visibleBottom)) : bottom + 6;
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
  if (tool === 'arrow') {
    drag.end = p;
    renderArrowPreview(drag.start, p);
    return;
  }
  selection = {
    x: Math.min(drag.start.x, p.x),
    y: Math.min(drag.start.y, p.y),
    w: Math.abs(p.x - drag.start.x),
    h: Math.abs(p.y - drag.start.y),
  };
  renderSelection();
}

// Auto-scroll while dragging the selection toward the window edge.
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
  if (e.button !== 0 || e.target.closest('.crop-actions') || e.target === ui.textInput) return;
  e.preventDefault();
  if (tool === 'text') {
    commitText();
    startText(e.clientX, e.clientY);
    return;
  }
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
  const finished = drag;
  drag = null;
  if (tool === 'arrow') {
    ui.arrowPreview.style.display = 'none';
    const end = finished.end;
    if (end && Math.hypot(end.x - finished.start.x, end.y - finished.start.y) >= 5) applyArrow(finished.start, end);
    return;
  }
  if (!selection || selection.w < 3 || selection.h < 3) {
    clearSelection();
    return;
  }
  if (tool === 'crop') renderSelection();
  else applyAnnotation();
}
ui.wrap.addEventListener('pointerup', endDrag);
ui.wrap.addEventListener('pointercancel', endDrag);

// ---------- Operations ----------

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

// Arrow from `a` to `b` (canvas pixels): a shaft ending at the base of a filled head.
function arrowGeometry(a, b, lw) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const head = Math.min(lw * 4.5, len * 0.6);
  const half = head * 0.55;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const base = { x: b.x - head * cos, y: b.y - head * sin };
  return {
    base,
    head: [b, { x: base.x - half * sin, y: base.y + half * cos }, { x: base.x + half * sin, y: base.y - half * cos }],
  };
}

function renderArrowPreview(a, b) {
  const lw = lineWidth();
  const g = arrowGeometry(a, b, lw);
  const [line, poly] = ui.arrowPreview.children;
  for (const [k, v] of Object.entries({ x1: a.x, y1: a.y, x2: g.base.x, y2: g.base.y, stroke: ui.color.value, 'stroke-width': lw })) line.setAttribute(k, v);
  poly.setAttribute('points', g.head.map((p) => `${p.x},${p.y}`).join(' '));
  poly.setAttribute('fill', ui.color.value);
  ui.arrowPreview.style.display = '';
}

function applyArrow(a, b) {
  const lw = lineWidth();
  const g = arrowGeometry(a, b, lw);
  const ctx = activeCanvas().getContext('2d');
  pushHistory();
  ctx.save();
  ctx.strokeStyle = ui.color.value;
  ctx.fillStyle = ui.color.value;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(g.base.x, g.base.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(g.head[0].x, g.head[0].y);
  ctx.lineTo(g.head[1].x, g.head[1].y);
  ctx.lineTo(g.head[2].x, g.head[2].y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  updateButtons();
}

// Text: click places an input over the image; Enter (or clicking elsewhere) draws it.
function startText(clientX, clientY) {
  const p = pointToCanvas(clientX, clientY);
  const k = cssScale();
  textAt = p;
  Object.assign(ui.textInput.style, {
    left: `${p.x * k}px`,
    top: `${p.y * k}px`,
    fontSize: `${Math.max(10, fontPx() * k)}px`,
    color: ui.color.value,
  });
  ui.textInput.value = '';
  ui.textInput.placeholder = t('textPlaceholder');
  ui.textInput.hidden = false;
  requestAnimationFrame(() => ui.textInput.focus());
}

function contrastFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? 'rgba(0,0,0,.85)' : 'rgba(255,255,255,.9)';
}

function commitText() {
  if (ui.textInput.hidden) return;
  const text = ui.textInput.value.trim();
  ui.textInput.hidden = true;
  const at = textAt;
  textAt = null;
  if (!text || !at) return;
  const fs = fontPx();
  // The input has 1px border + 4px/2px padding: start the drawn text at the same spot.
  const k = cssScale();
  const x = at.x + 5 / k;
  const y = at.y + 3 / k;
  const ctx = activeCanvas().getContext('2d');
  pushHistory();
  ctx.save();
  ctx.font = `600 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, fs * 0.16);
  ctx.strokeStyle = contrastFor(ui.color.value);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = ui.color.value;
  ctx.fillText(text, x, y);
  ctx.restore();
  updateButtons();
}

function cancelText() {
  ui.textInput.hidden = true;
  textAt = null;
}

ui.textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); commitText(); }
  else if (e.key === 'Escape') { e.preventDefault(); cancelText(); }
});
ui.textInput.addEventListener('blur', () => commitText());

async function resetToOriginal() {
  const part = parts[current];
  pushHistory();
  clearSelection();
  replaceCanvas(await blobToCanvas(record.parts[current]));
  toast(t('toastOriginalRestored'));
}

// ---------- Export ----------

function formatCaptureDate(ms) {
  const d = new Date(ms);
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const zone = `UTC${off >= 0 ? '+' : '-'}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${zone}`;
}

function stampText() {
  return ui.stamp.checked ? `${record.url || ''}  ·  ${formatCaptureDate(record.createdAt)}` : '';
}

// Returns the canvas to export: unchanged, or with the URL / date band on top.
function withStamp(canvas) {
  const text = stampText();
  if (!text) return canvas;
  const band = stampHeight(canvas.width);
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height + band;
  const ctx = out.getContext('2d');
  ctx.drawImage(canvas, 0, band);
  drawStamp(ctx, canvas.width, text);
  return out;
}

async function exportImages(type, ext) {
  const base = baseFilename();
  for (let i = 0; i < parts.length; i++) {
    const blob = await canvasToBlob(withStamp(parts[i].canvas), type, 0.92);
    const suffix = parts.length > 1 ? `-${t('partSuffix')}${i + 1}` : '';
    download(blob, `${base}${suffix}.${ext}`);
  }
}

async function exportPdf() {
  toast(t('toastPdfGenerating'));
  const blob = await buildPdf(parts.map((p) => p.canvas), { stamp: stampText() });
  download(blob, `${baseFilename()}.pdf`);
  toast(t('toastPdfReady'));
}

async function copyToClipboard() {
  try {
    const blobPromise = canvasToBlob(withStamp(activeCanvas()), 'image/png');
    let item;
    try {
      // Chrome accepts a promise, which keeps the user activation while encoding.
      item = new ClipboardItem({ 'image/png': blobPromise });
    } catch {
      item = new ClipboardItem({ 'image/png': await blobPromise });
    }
    await navigator.clipboard.write([item]);
    toast(t('toastCopied'));
  } catch (err) {
    console.error(err);
    toast(t('toastCopyFailed', err.message));
  }
}

function guard(fn) {
  return async (...args) => {
    try { await fn(...args); } catch (err) { console.error(err); toast(t('toastError', err.message)); }
  };
}

// ---------- Wiring ----------

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
const STAMP_KEY = 'fxfp.stamp';
try { ui.stamp.checked = localStorage.getItem(STAMP_KEY) === '1'; } catch { /* storage unavailable */ }
ui.stamp.addEventListener('change', () => {
  try { localStorage.setItem(STAMP_KEY, ui.stamp.checked ? '1' : '0'); } catch { /* storage unavailable */ }
});
window.addEventListener('resize', renderSelection);
window.addEventListener('scroll', () => { if (selection && !drag) renderSelection(); }, { passive: true });

document.addEventListener('keydown', (e) => {
  if (!record || e.target.matches('input, select')) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); guard(() => exportImages('image/png', 'png'))(); }
  else if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); guard(copyToClipboard)(); }
  else if (mod) return;
  else if (e.key === 'Enter' && selection && tool === 'crop') { e.preventDefault(); applyCrop(); }
  else if (e.key === 'Escape') clearSelection();
  else if (e.key === 'c') setTool('crop');
  else if (e.key === 'r') setTool('box');
  else if (e.key === 'a') setTool('arrow');
  else if (e.key === 't') setTool('text');
  else if (e.key === 'b') setTool('pixelate');
  else if (e.key === 'z') { actualSize = !actualSize; applyCanvasSize(); }
});

// ---------- Loading ----------

async function init() {
  const id = new URLSearchParams(location.search).get('id');
  record = id ? await getCapture(id) : null;
  if (!record) {
    ui.title.textContent = t('notFound');
    return;
  }
  document.title = t('editorTitleFor', record.title || record.url);
  ui.title.textContent = record.title || t('untitled');
  ui.source.textContent = record.url;
  ui.source.href = record.url;

  parts = [];
  for (const blob of record.parts) parts.push({ canvas: await blobToCanvas(blob), history: [] });

  if (parts.length > 1) {
    ui.parts.hidden = false;
    parts.forEach((_, i) => {
      const b = document.createElement('button');
      b.textContent = t('partLabel', i + 1);
      b.addEventListener('click', () => showPart(i));
      ui.parts.appendChild(b);
    });
  }

  const notes = [];
  if (parts.length > 1) notes.push(t('noticeSplit', parts.length));
  if (record.truncated) notes.push(t('noticeTruncated'));
  if (notes.length) { ui.notice.textContent = notes.join(' '); ui.notice.hidden = false; }

  showPart(0);
}

init().catch((err) => {
  console.error(err);
  ui.title.textContent = t('loadError', err.message);
});

import { newCaptureId, saveCapture } from './db.js';

// Firefox exposes promise-based APIs on `browser`; Chrome on `chrome`.
const api = globalThis.browser ?? globalThis.chrome;

// Chrome limits captureVisibleTab to 2 calls per second (harmless in Firefox).
const MIN_CAPTURE_INTERVAL_MS = 550;
// Canvas limits: 32,767 px per side in Chrome and Firefox; area is capped
// conservatively so the same build works in both browsers.
const MAX_PART_DIM = 32000;
const MAX_PART_AREA = 120_000_000;
const MAX_FRAMES = 400;

const busyTabs = new Set();
let lastCaptureAt = 0;

// ---------- Entry points ----------

const MODES = {
  full: (tab) => captureFullPage(tab),
  visible: (tab) => captureVisible(tab),
  selection: (tab) => startSelection(tab),
};

function launch(mode, tab) {
  if (!tab?.id || !MODES[mode]) return;
  MODES[mode](tab).catch((err) => console.error('[FX Full Page Screenshot]', err));
}

// One click on the toolbar icon (or its shortcut) keeps capturing the full page.
api.action.onClicked.addListener((tab) => launch('full', tab));

// Right-click menu on the toolbar icon offers every mode.
api.runtime.onInstalled.addListener(async () => {
  await api.contextMenus.removeAll();
  for (const [id, key] of [['full', 'menuFull'], ['visible', 'menuVisible'], ['selection', 'menuSelection']]) {
    api.contextMenus.create({ id, title: api.i18n.getMessage(key), contexts: ['action'] });
  }
});
api.contextMenus.onClicked.addListener((info, tab) => launch(info.menuItemId, tab));

api.commands.onCommand.addListener(async (command, tab) => {
  const mode = { 'capture-visible': 'visible', 'capture-selection': 'selection' }[command];
  if (!mode) return;
  if (!tab) [tab] = await api.tabs.query({ active: true, currentWindow: true });
  launch(mode, tab);
});

// The selection overlay reports back by message, so the background does not have to
// stay alive while the user is choosing an area.
api.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'fxfp-selection' && sender.tab) {
    captureSelection(sender.tab, msg.rect).catch((err) => console.error('[FX Full Page Screenshot]', err));
  }
});

// ---------- Helpers ----------

async function run(tabId, func, args = []) {
  const [res] = await api.scripting.executeScript({ target: { tabId }, func, args });
  return res?.result;
}

async function setBadge(tabId, text, color = '#2563eb') {
  try {
    await api.action.setBadgeBackgroundColor({ tabId, color });
    await api.action.setBadgeText({ tabId, text });
  } catch { /* tab closed */ }
}

async function throttledCapture(windowId) {
  const wait = lastCaptureAt + MIN_CAPTURE_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCaptureAt = Date.now();
  return api.tabs.captureVisibleTab(windowId, { format: 'png' });
}

async function captureBitmap(tab) {
  const dataUrl = await throttledCapture(tab.windowId);
  return createImageBitmap(await (await fetch(dataUrl)).blob());
}

function positions(max, step) {
  const out = [];
  step = Math.max(1, Math.floor(step));
  for (let p = 0; p < max; p += step) out.push(p);
  out.push(max);
  return [...new Set(out)];
}

function makeParts(width, height) {
  const partHeight = Math.max(1, Math.min(MAX_PART_DIM, Math.floor(MAX_PART_AREA / width), height));
  const parts = [];
  for (let y = 0; y < height; y += partHeight) {
    const h = Math.min(partHeight, height - y);
    const canvas = new OffscreenCanvas(width, h);
    parts.push({ y, canvas, ctx: canvas.getContext('2d') });
  }
  return parts;
}

// Runs one capture with the shared busy flag, badge and error reporting.
async function withCapture(tab, work) {
  const tabId = tab.id;
  if (busyTabs.has(tabId)) return;
  busyTabs.add(tabId);
  try {
    await setBadge(tabId, '…');
    const result = await work();
    if (result) await openEditor(tab, result);
    await setBadge(tabId, '');
  } catch (err) {
    console.error('[FX Full Page Screenshot]', err);
    await setBadge(tabId, '!', '#dc2626');
    try {
      await api.action.setTitle({ tabId, title: api.i18n.getMessage('errCaptureFailed', [err.message]) });
    } catch { /* ignore */ }
    setTimeout(() => setBadge(tabId, ''), 5000);
  } finally {
    busyTabs.delete(tabId);
  }
}

async function openEditor(tab, { scale, width, height, truncated = false, mode, canvases }) {
  const blobs = [];
  for (const canvas of canvases) blobs.push(await canvas.convertToBlob({ type: 'image/png' }));
  const id = newCaptureId();
  await saveCapture({
    id,
    createdAt: Date.now(),
    url: tab.url,
    title: tab.title,
    mode,
    scale,
    width,
    height,
    truncated,
    parts: blobs,
  });
  await api.tabs.create({
    url: api.runtime.getURL(`editor.html?id=${encodeURIComponent(id)}`),
    index: tab.index + 1,
    openerTabId: tab.id,
  });
}

// Crops a viewport capture to a rectangle given in CSS pixels.
function cropBitmap(bmp, scale, rect) {
  const sx = Math.max(0, Math.round(rect.x * scale));
  const sy = Math.max(0, Math.round(rect.y * scale));
  const sw = Math.max(1, Math.min(bmp.width - sx, Math.round(rect.width * scale)));
  const sh = Math.max(1, Math.min(bmp.height - sy, Math.round(rect.height * scale)));
  const canvas = new OffscreenCanvas(sw, sh);
  canvas.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

const measureViewport = () => ({
  width: document.documentElement.clientWidth,
  height: document.documentElement.clientHeight,
  innerWidth: window.innerWidth,
});

// ---------- Full page ----------

function captureFullPage(tab) {
  const tabId = tab.id;
  return withCapture(tab, async () => {
    let prepared = false;
    try {
      await api.scripting.executeScript({ target: { tabId }, files: ['capture-page.js'] });
      const info = await run(tabId, () => window.__fxfp.prepare());
      prepared = true;

      const xs = positions(info.maxScrollX, info.clip.width);
      let ys = positions(info.maxScrollY, info.clip.height);
      let truncated = false;
      if (xs.length * ys.length > MAX_FRAMES) {
        ys = ys.slice(0, Math.max(1, Math.floor(MAX_FRAMES / xs.length)));
        truncated = true;
      }
      const total = xs.length * ys.length;

      let scale = 0;
      let parts = null;
      let outW = 0;
      let outH = 0;
      let done = 0;

      for (const y of ys) {
        for (const x of xs) {
          const actual = await run(tabId, (sx, sy, hide) => window.__fxfp.scrollTo(sx, sy, hide), [x, y, done > 0]);

          const current = await api.tabs.get(tabId);
          if (!current.active) throw new Error(api.i18n.getMessage('errTabLeft'));

          const bmp = await captureBitmap(tab);

          if (!parts) {
            scale = bmp.width / info.innerWidth;
            outW = Math.round(info.totalWidth * scale);
            const lastY = ys[ys.length - 1];
            const capturedH = truncated ? lastY + info.offsetY + info.clip.height : info.totalHeight;
            outH = Math.round(Math.min(info.totalHeight, capturedH) * scale);
            parts = makeParts(outW, outH);
          }

          const sx = Math.round(info.clip.x * scale);
          const sy = Math.round(info.clip.y * scale);
          const sw = Math.round(info.clip.width * scale);
          const sh = Math.round(info.clip.height * scale);
          const dx = Math.round((actual.x + info.offsetX) * scale);
          const dy = Math.round((actual.y + info.offsetY) * scale);
          for (const part of parts) {
            if (dy + sh <= part.y || dy >= part.y + part.canvas.height) continue;
            part.ctx.drawImage(bmp, sx, sy, sw, sh, dx, dy - part.y, sw, sh);
          }
          bmp.close();

          done++;
          await setBadge(tabId, `${Math.round((done / total) * 100)}%`);
        }
      }

      await run(tabId, () => window.__fxfp.restore());
      prepared = false;
      return { scale, width: outW, height: outH, truncated, mode: 'full', canvases: parts.map((p) => p.canvas) };
    } finally {
      if (prepared) {
        try { await run(tabId, () => window.__fxfp.restore()); } catch { /* ignore */ }
      }
    }
  });
}

// ---------- Visible area ----------

function captureVisible(tab) {
  return withCapture(tab, async () => {
    // Measuring first also fails early, with a clear error, on pages extensions cannot access.
    const view = await run(tab.id, measureViewport);
    const bmp = await captureBitmap(tab);
    const scale = bmp.width / view.innerWidth;
    const canvas = cropBitmap(bmp, scale, { x: 0, y: 0, width: view.width, height: view.height });
    bmp.close();
    return { scale, width: canvas.width, height: canvas.height, mode: 'visible', canvases: [canvas] };
  });
}

// ---------- Selected area ----------

async function startSelection(tab) {
  try {
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['select-area.js'] });
  } catch (err) {
    // Same feedback as a failed capture (restricted page, for example).
    await withCapture(tab, async () => { throw err; });
  }
}

function captureSelection(tab, rect) {
  return withCapture(tab, async () => {
    const view = await run(tab.id, measureViewport);
    const bmp = await captureBitmap(tab);
    const scale = bmp.width / view.innerWidth;
    const canvas = cropBitmap(bmp, scale, rect);
    bmp.close();
    return { scale, width: canvas.width, height: canvas.height, mode: 'selection', canvases: [canvas] };
  });
}

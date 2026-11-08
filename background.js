import { newCaptureId, saveCapture } from './db.js';

// Chrome limits captureVisibleTab to 2 calls per second.
const MIN_CAPTURE_INTERVAL_MS = 550;
// Chrome canvas limits: 32,767 px per side, ~268 Mpx of area.
const MAX_PART_DIM = 32000;
const MAX_PART_AREA = 200_000_000;
const MAX_FRAMES = 400;

const busyTabs = new Set();
let lastCaptureAt = 0;

chrome.action.onClicked.addListener((tab) => {
  captureTab(tab).catch((err) => console.error('[FX Full Page Screenshot]', err));
});

async function run(tabId, func, args = []) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return res?.result;
}

async function setBadge(tabId, text, color = '#2563eb') {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setBadgeText({ tabId, text });
  } catch { /* tab closed */ }
}

async function throttledCapture(windowId) {
  const wait = lastCaptureAt + MIN_CAPTURE_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCaptureAt = Date.now();
  return chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
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

async function captureTab(tab) {
  const tabId = tab.id;
  if (busyTabs.has(tabId)) return;
  busyTabs.add(tabId);
  let prepared = false;

  try {
    await setBadge(tabId, '…');
    await chrome.scripting.executeScript({ target: { tabId }, files: ['capture-page.js'] });
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

        const current = await chrome.tabs.get(tabId);
        if (!current.active) throw new Error(chrome.i18n.getMessage('errTabLeft'));

        const dataUrl = await throttledCapture(tab.windowId);
        const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob());

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

    const blobs = [];
    for (const part of parts) blobs.push(await part.canvas.convertToBlob({ type: 'image/png' }));

    const id = newCaptureId();
    await saveCapture({
      id,
      createdAt: Date.now(),
      url: tab.url,
      title: tab.title,
      scale,
      width: outW,
      height: outH,
      truncated,
      parts: blobs,
    });

    await setBadge(tabId, '');
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`editor.html?id=${encodeURIComponent(id)}`),
      index: tab.index + 1,
      openerTabId: tabId,
    });
  } catch (err) {
    console.error('[FX Full Page Screenshot]', err);
    await setBadge(tabId, '!', '#dc2626');
    try {
      await chrome.action.setTitle({ tabId, title: chrome.i18n.getMessage('errCaptureFailed', [err.message]) });
    } catch { /* ignore */ }
    setTimeout(() => setBadge(tabId, ''), 5000);
  } finally {
    if (prepared) {
      try { await run(tabId, () => window.__fxfp.restore()); } catch { /* ignore */ }
    }
    busyTabs.delete(tabId);
  }
}

// Injected on demand: lets the user drag a rectangle over the visible page, then reports it
// to the background script, which captures and crops the viewport.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  if (document.getElementById('__fxfp-select')) return;

  const host = document.createElement('div');
  host.id = '__fxfp-select';
  // A shadow root keeps the page's own CSS away from the overlay.
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `
    <style>
      .layer { position: fixed; inset: 0; z-index: 2147483647; cursor: crosshair; background: rgba(15, 23, 42, .35); }
      .box { position: fixed; display: none; border: 1px solid #fff; outline: 1px dashed #2563eb;
             box-shadow: 0 0 0 100vmax rgba(15, 23, 42, .45); background: transparent; pointer-events: none; }
      .layer.dragging { background: transparent; }
      .hint { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); pointer-events: none;
              font: 600 14px/1.2 system-ui, sans-serif; color: #fff; background: #1e293b;
              padding: 10px 16px; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.35); white-space: nowrap; }
      .size { position: fixed; display: none; pointer-events: none; font: 600 11px/1 ui-monospace, monospace;
              color: #fff; background: rgba(0,0,0,.75); padding: 4px 6px; border-radius: 4px; }
    </style>
    <div class="layer"></div><div class="box"></div><div class="size"></div><div class="hint"></div>`;
  const layer = root.querySelector('.layer');
  const box = root.querySelector('.box');
  const size = root.querySelector('.size');
  root.querySelector('.hint').textContent = api.i18n.getMessage('selectHint');
  document.documentElement.appendChild(host);

  let start = null;
  let rect = null;

  const cleanup = () => {
    host.remove();
    window.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cleanup(); }
  };
  window.addEventListener('keydown', onKey, true);

  layer.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    layer.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY };
    layer.classList.add('dragging');
  });

  layer.addEventListener('pointermove', (e) => {
    if (!start) return;
    const x = Math.min(start.x, e.clientX);
    const y = Math.min(start.y, e.clientY);
    rect = { x, y, width: Math.abs(e.clientX - start.x), height: Math.abs(e.clientY - start.y) };
    Object.assign(box.style, { display: 'block', left: `${x}px`, top: `${y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    Object.assign(size.style, { display: 'block', left: `${x}px`, top: `${Math.max(0, y - 22)}px` });
    size.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
  });

  layer.addEventListener('pointerup', () => {
    if (!start) return;
    const picked = rect;
    start = null;
    cleanup();
    if (!picked || picked.width < 5 || picked.height < 5) return;
    // Wait until the overlay is gone from the screen before the background captures it.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setTimeout(() => {
        Promise.resolve(api.runtime.sendMessage({ type: 'fxfp-selection', rect: picked })).catch(() => {});
      }, 30);
    }));
  });
})();

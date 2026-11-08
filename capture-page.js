// Injecté dans la page à capturer. Expose window.__fxfp (monde isolé de l'extension).
(() => {
  if (window.__fxfp) return;

  const SETTLE_MS = 150;
  let state = null;

  const nextFrame = () =>
    new Promise((resolve) => {
      // rAF ne se déclenche pas si l'onglet est masqué : on borne par un timeout.
      const t = setTimeout(resolve, 300);
      requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(t); resolve(); }));
    });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function setInline(el, prop, value) {
    state.saved.push([el, prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
    el.style.setProperty(prop, value, 'important');
  }

  function documentOverflows() {
    const de = document.documentElement;
    const body = document.body;
    const h = Math.max(de.scrollHeight, body ? body.scrollHeight : 0);
    const w = Math.max(de.scrollWidth, body ? body.scrollWidth : 0);
    const cs = getComputedStyle(de);
    if (cs.overflowY === 'hidden' && cs.overflowX === 'hidden') return false;
    return h > de.clientHeight + 2 || w > de.clientWidth + 2;
  }

  // Si le document lui-même ne défile pas (apps type Gmail, Notion…), on cherche
  // le plus grand élément défilant visible.
  function findInnerScroller() {
    let best = null;
    let bestArea = 0;
    for (const el of document.querySelectorAll('body, body *')) {
      if (el.scrollHeight <= el.clientHeight + 2) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
      const area = el.clientWidth * el.clientHeight;
      if (area > bestArea) { best = el; bestArea = area; }
    }
    return best && bestArea >= innerWidth * innerHeight * 0.2 ? best : null;
  }

  function measure() {
    const de = document.documentElement;
    const body = document.body;
    const sc = state.scroller;
    if (!sc) {
      const clip = { x: 0, y: 0, width: de.clientWidth, height: de.clientHeight };
      return {
        mode: 'document',
        totalWidth: Math.max(de.scrollWidth, body ? body.scrollWidth : 0, clip.width),
        totalHeight: Math.max(de.scrollHeight, body ? body.scrollHeight : 0, clip.height),
        maxScrollX: Math.max(0, de.scrollWidth - de.clientWidth),
        maxScrollY: Math.max(0, Math.max(de.scrollHeight, body ? body.scrollHeight : 0) - de.clientHeight),
        clip,
        offsetX: 0,
        offsetY: 0,
        innerWidth: window.innerWidth,
      };
    }
    const r = sc.getBoundingClientRect();
    const innerLeft = r.left + sc.clientLeft;
    const innerTop = r.top + sc.clientTop;
    const x0 = Math.max(0, innerLeft);
    const y0 = Math.max(0, innerTop);
    const x1 = Math.min(de.clientWidth, innerLeft + sc.clientWidth);
    const y1 = Math.min(de.clientHeight, innerTop + sc.clientHeight);
    const clip = { x: x0, y: y0, width: Math.max(1, x1 - x0), height: Math.max(1, y1 - y0) };
    return {
      mode: 'element',
      totalWidth: sc.scrollWidth,
      totalHeight: sc.scrollHeight,
      maxScrollX: Math.max(0, sc.scrollWidth - sc.clientWidth),
      maxScrollY: Math.max(0, sc.scrollHeight - sc.clientHeight),
      clip,
      offsetX: x0 - innerLeft,
      offsetY: y0 - innerTop,
      innerWidth: window.innerWidth,
    };
  }

  function prepare() {
    if (state) restore();
    state = {
      saved: [],
      fixed: [],
      fixedHidden: false,
      origScroll: { x: window.scrollX, y: window.scrollY },
      scroller: null,
      style: document.createElement('style'),
    };

    // Masque les barres de défilement et désactive le défilement doux.
    state.style.textContent =
      'html{scrollbar-width:none!important;scroll-behavior:auto!important}' +
      'html::-webkit-scrollbar{display:none!important}';
    (document.head || document.documentElement).appendChild(state.style);

    for (const el of document.querySelectorAll('body *')) {
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed') {
        state.fixed.push(el);
      } else if (pos === 'sticky') {
        // Les éléments « collants » reprennent leur place naturelle dans le flux.
        setInline(el, 'position', 'relative');
        setInline(el, 'inset', 'auto');
      }
    }

    if (!documentOverflows()) {
      const sc = findInnerScroller();
      if (sc) {
        state.scroller = sc;
        state.origElScroll = { x: sc.scrollLeft, y: sc.scrollTop };
        setInline(sc, 'scrollbar-width', 'none');
        setInline(sc, 'scroll-behavior', 'auto');
      }
    }

    return measure();
  }

  function setFixedHidden(hidden) {
    if (hidden === state.fixedHidden) return;
    state.fixedHidden = hidden;
    for (const el of state.fixed) {
      if (hidden) setInline(el, 'visibility', 'hidden');
    }
    if (!hidden) restoreSaved((entry) => entry[1] === 'visibility');
  }

  function restoreSaved(filter = () => true) {
    const keep = [];
    for (let i = state.saved.length - 1; i >= 0; i--) {
      const entry = state.saved[i];
      if (!filter(entry)) { keep.unshift(entry); continue; }
      const [el, prop, value, priority] = entry;
      if (value) el.style.setProperty(prop, value, priority);
      else el.style.removeProperty(prop);
    }
    state.saved = keep;
  }

  async function scrollTo(x, y, hideFixed) {
    const sc = state.scroller;
    if (sc) { sc.scrollLeft = x; sc.scrollTop = y; }
    else window.scrollTo(x, y);
    // Les éléments fixes (en-têtes, bandeaux) n'apparaissent que sur la première image.
    setFixedHidden(hideFixed);
    await nextFrame();
    await sleep(SETTLE_MS);
    return sc ? { x: sc.scrollLeft, y: sc.scrollTop } : { x: window.scrollX, y: window.scrollY };
  }

  function restore() {
    if (!state) return;
    restoreSaved();
    state.style.remove();
    if (state.scroller) {
      state.scroller.scrollLeft = state.origElScroll.x;
      state.scroller.scrollTop = state.origElScroll.y;
    }
    window.scrollTo(state.origScroll.x, state.origScroll.y);
    state = null;
  }

  window.__fxfp = { prepare, scrollTo, restore };
})();

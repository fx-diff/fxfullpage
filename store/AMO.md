# addons.mozilla.org (AMO) listing – copy-paste text

Upload `dist/fxfullpage-firefox-<version>.zip` at https://addons.mozilla.org/developers/addon/submit/

## Submission choices
- **Distribution**: On this site (listed on addons.mozilla.org)
- **Platforms**: Firefox (desktop) only — untick Firefox for Android (not tested there)
- **Source code**: No. The package contains plain, unminified source files; no build tool or bundler is used.

## Listing
- **Name**: FX Full Page Screenshot
- **Add-on URL**: `fx-full-page-screenshot`
- **Summary** (250 chars max):
  > Full page, visible or selected-area screenshots with a free editor: crop, arrows, text, blur. Export to PNG, JPG or PDF.
- **Categories**: Photos, Music & Videos (primary); Other
- **Support email**: your publisher contact email
- **Support website**: https://github.com/fx-diff/fxfullpage/issues
- **Homepage**: https://github.com/fx-diff/fxfullpage
- **License**: MIT License
- **Privacy policy**: tick "This add-on has a privacy policy" and paste the content of `PRIVACY.md`
- **Tags**: screenshot, full page, capture, crop, pdf

## Description

Screenshot the entire page — top to bottom — in one click. Then crop it, point things out, blur what's private, and export it as PNG, JPG or PDF. No account. No tracking. Nothing ever leaves your computer.

📸 **Capture anything**
- Full page in one click on the toolbar icon, or Alt+Shift+S
- Visible area (Alt+Shift+V) or a selected area (Alt+Shift+A), also from the icon's right-click menu
- Long articles, dashboards, and web apps with their own scrolling area
- Sticky headers and cookie banners show up once, not on every screen
- Extra-long pages are split automatically into several images

✂️ **Edit in seconds**
- Crop to exactly what you need
- Arrows, text and colored boxes, in three sizes
- Blur emails, names or numbers before you share
- Undo anything with Ctrl+Z

📤 **Share it your way**
- PNG, JPG or multi-page PDF
- Optional URL and date stamp on every export, as a record of what the page showed and when
- Copy straight to the clipboard

🔒 **Private by design**
- Everything runs locally in your browser: no servers, no analytics, no ads
- Minimal permissions: it can only see the tab you use it on, when you use it

Free and open source (MIT) — https://github.com/fx-diff/fxfullpage

## Video
AMO has no video field: the description can link to https://www.youtube.com/watch?v=djICF5qt5hs

## Notes to reviewer

> No build step: the uploaded files are the original sources (https://github.com/fx-diff/fxfullpage).
> To test: open any long page and click the toolbar icon (or press Alt+Shift+S). The page scrolls while
> it is captured, then the editor opens in a new tab with crop, box, arrow, text and blur tools and PNG,
> JPG and PDF export. Right-click the toolbar icon for visible-area and selected-area capture
> (Alt+Shift+V, Alt+Shift+A). No network requests are made; captures are stored locally in IndexedDB (last 10 only).

## Images
- **Icon**: taken from the package (`icons/icon128.png`)
- **Screenshots**: the same `store/screenshot-1.png` … `screenshot-5.png` (1280×800) used for the Chrome Web Store

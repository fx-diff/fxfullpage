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
  > Full page screenshots with a built-in editor: crop, highlight, blur, export to PNG, JPG or PDF.
- **Categories**: Photos, Music & Videos (primary); Other
- **Support email**: your publisher contact email
- **Support website**: https://github.com/fx-diff/fxfullpage/issues
- **Homepage**: https://github.com/fx-diff/fxfullpage
- **License**: MIT License
- **Privacy policy**: tick "This add-on has a privacy policy" and paste the content of `PRIVACY.md`
- **Tags**: screenshot, full page, capture, crop, pdf

## Description

Capture an entire web page — not just what's on screen — in one click, then crop, annotate and export it.

**Features**
- One-click full page capture (or Alt+Shift+P)
- Works on long pages and on web apps with inner scrolling areas
- Sticky headers and floating banners are not repeated across the image
- Very tall pages are automatically split into several images
- Built-in editor: crop, colored boxes, blur/pixelate sensitive information, undo
- Export to PNG, JPG or multi-page PDF, or copy to the clipboard

**Privacy**
- No account, no ads, no tracking
- Everything happens locally in your browser: no data is ever sent anywhere
- Only the "activeTab" and "scripting" permissions: the extension can only access the tab you click it on

Free and open source (MIT license): https://github.com/fx-diff/fxfullpage

## Notes to reviewer

> No build step: the uploaded files are the original sources (https://github.com/fx-diff/fxfullpage).
> To test: open any long page, click the toolbar icon (or press Alt+Shift+P). The page scrolls while
> it is captured, then the editor opens in a new tab with crop / box / blur tools and PNG, JPG and
> PDF export. No network requests are made; captures are stored locally in IndexedDB (last 10 only).

## Images
- **Icon**: taken from the package (`icons/icon128.png`)
- **Screenshots**: the same `store/screenshot-1.png` … `screenshot-5.png` (1280×800) used for the Chrome Web Store

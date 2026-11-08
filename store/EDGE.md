# Microsoft Edge Add-ons listing – copy-paste text

Partner Center: https://partner.microsoft.com/dashboard/microsoftedge/overview
Package: `dist/fxfullpage-edge-<version>.zip` (identical to the Chrome build).

## Availability
- **Visibility**: Public
- **Markets**: all markets

## Properties
- **Category**: Productivity
- **Privacy policy required?**: Yes → https://github.com/fx-diff/fxfullpage/blob/main/PRIVACY.md
- **Website**: https://github.com/fx-diff/fxfullpage
- **Support contact**: https://github.com/fx-diff/fxfullpage/issues
- **Mature content**: No

## Store listing (English, then add French)

**Description (English)**

```
Screenshot the entire page — top to bottom — in one click. Then crop it, point things out, blur what's private, and export it as PNG, JPG or PDF. No account. No tracking. Nothing ever leaves your computer.

📸 CAPTURE ANYTHING
• Full page in one click on the toolbar icon, or Alt+Shift+S
• Visible area (Alt+Shift+V) or a selected area (Alt+Shift+A), also from the icon's right-click menu
• Long articles, dashboards, and web apps with their own scrolling area
• Sticky headers and cookie banners show up once, not on every screen
• Extra-long pages are split automatically into several images

✂️ EDIT IN SECONDS
• Crop to exactly what you need
• Arrows, text and colored boxes, in three sizes
• Blur emails, names or numbers before you share
• Undo anything with Ctrl+Z

📤 SHARE IT YOUR WAY
• PNG, JPG or multi-page PDF
• Optional URL and date stamp on every export, as a record of what the page showed and when
• Copy straight to the clipboard

🔒 PRIVATE BY DESIGN
• Everything runs locally in your browser: no servers, no analytics, no ads
• Minimal permissions: it can only see the tab you use it on, when you use it

Free and open source (MIT) — https://github.com/fx-diff/fxfullpage
```

**Description (French)**

```
Capturez la page entière — de haut en bas — en un clic. Recadrez, montrez l'essentiel, floutez ce qui est privé, puis exportez en PNG, JPG ou PDF. Sans compte. Sans suivi. Rien ne quitte votre ordinateur.

📸 TOUT CAPTURER
• La page entière en un clic sur l'icône, ou Alt+Shift+S
• La zone visible (Alt+Shift+V) ou une zone sélectionnée (Alt+Shift+A), aussi depuis le clic droit sur l'icône
• Longs articles, tableaux de bord et applications web avec leur propre zone de défilement
• Les en-têtes collants et bandeaux cookies n'apparaissent qu'une fois
• Les pages très longues sont découpées automatiquement en plusieurs images

✂️ MODIFIER EN QUELQUES SECONDES
• Recadrez exactement ce qu'il vous faut
• Flèches, texte et encadrés de couleur, en trois tailles
• Floutez e-mails, noms ou numéros avant de partager
• Annulez tout avec Ctrl+Z

📤 PARTAGER COMME VOUS VOULEZ
• PNG, JPG ou PDF multipage
• En option, l'URL et la date sur chaque export, pour garder une trace de ce que la page affichait et quand
• Copie directe dans le presse-papiers

🔒 CONFIDENTIEL PAR CONCEPTION
• Tout se passe localement dans votre navigateur : pas de serveur, pas de statistiques, pas de publicité
• Permissions minimales : l'extension ne voit que l'onglet sur lequel vous l'utilisez, au moment où vous l'utilisez

Gratuit et open source (MIT) — https://github.com/fx-diff/fxfullpage
```

**Search terms** (max 7 terms, 30 characters each, 21 words in total)
- English (17 words): `full page screenshot`, `screen capture`, `scrolling screenshot`, `capture entire page`, `webpage to pdf`, `screenshot editor`, `blur screenshot`
- French (18 words): `capture d'écran pleine page`, `capture d'écran`, `capture page web`, `page web en pdf`, `screenshot`, `recadrer capture`, `flouter capture`

**Images** (`store/` folder; same files for both languages, French screenshots for the French listing)
- Extension store logo (300×300): `logo-300.png`
- Small promotional tile (440×280): `promo-small.png`
- Large promotional tile (1400×560): `marquee.png`
- Screenshots (1280×800): `screenshot-1.png` … `screenshot-5.png` (English), `screenshot-1-fr.png` … `screenshot-5-fr.png` (French)
- YouTube video URL: https://www.youtube.com/watch?v=djICF5qt5hs

## Permission justifications (Privacy tab)
- **activeTab**: Required to capture the content of the tab the user explicitly invokes the extension on (toolbar icon, its right-click menu, or a keyboard shortcut), using chrome.tabs.captureVisibleTab.
- **scripting**: Injects scripts into the active tab, only when the user starts a capture: to measure the page, scroll it step by step during a full-page capture, temporarily hide fixed elements and scrollbars, then restore the page; or to show the overlay that lets the user drag the area to capture. The overlay is removed before the capture.
- **contextMenus**: Adds three entries to the right-click menu of the extension's own toolbar icon: Capture the full page, Capture the visible area, Select an area to capture. No other context menu is added.

## Submission questions
- **Does the extension access, collect or transmit personal information?** No. All processing is local;
  captures (image, page title, URL) are stored only in the extension's IndexedDB and never transmitted.

**Notes for certification**

```
No build step: the uploaded files are the original, unminified sources (https://github.com/fx-diff/fxfullpage).

To test: open any long page and click the toolbar icon (or press Alt+Shift+S). The page scrolls while it is captured, then the editor opens in a new tab with crop, box, arrow, text and blur tools, and PNG, JPG and PDF export. Right-click the toolbar icon for visible-area and selected-area capture (Alt+Shift+V, Alt+Shift+A).

Permissions: activeTab (Required to capture the content of the tab the user explicitly invokes the extension on (toolbar icon, its right-click menu, or a keyboard shortcut), using chrome.tabs.captureVisibleTab.) scripting (Injects scripts into the active tab, only when the user starts a capture: to measure the page, scroll it step by step during a full-page capture, temporarily hide fixed elements and scrollbars, then restore the page; or to show the overlay that lets the user drag the area to capture. The overlay is removed before the capture.) contextMenus (Adds three entries to the right-click menu of the extension's own toolbar icon: Capture the full page, Capture the visible area, Select an area to capture. No other context menu is added.) No network requests are made; captures are stored locally in IndexedDB (last 10 only).
```

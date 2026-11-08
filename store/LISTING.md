# Chrome Web Store listing – copy-paste text

## General info
- **Category**: Tools (or Productivity)
- **Primary language**: English (French is included via `_locales/fr`)
- **Homepage URL**: https://github.com/fx-diff/fxfullpage
- **Support URL**: https://github.com/fx-diff/fxfullpage/issues
- **Official URL**: leave empty (requires a domain verified in Google Search Console)
- **Privacy policy URL**: https://github.com/fx-diff/fxfullpage/blob/main/PRIVACY.md
- **Promo video (global + localized)**: https://www.youtube.com/watch?v=djICF5qt5hs

---

## Description (English)

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

## Description (French – for the localized `fr` listing)

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

---

## "Privacy practices" tab

**Single purpose**
> Capture a full-page screenshot of the current tab and let the user crop, annotate and export it.

**Justification – activeTab**
> Required to capture the content of the tab the user explicitly invokes the extension on (toolbar icon, its right-click menu, or a keyboard shortcut), using chrome.tabs.captureVisibleTab.

**Justification – scripting**
> Injects scripts into the active tab, only when the user starts a capture: to measure the page, scroll it step by step during a full-page capture, temporarily hide fixed elements and scrollbars, then restore the page; or to show the overlay that lets the user drag the area to capture. The overlay is removed before the capture.

**Justification – contextMenus**
> Adds three entries to the right-click menu of the extension's own toolbar icon: Capture the full page, Capture the visible area, Select an area to capture. No other context menu is added.

**Remote code**
> No, I am not using remote code. All JavaScript is included in the package.

**User data**: do **not** tick any collected data category.
Tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Images (`store/` folder)
- `icon-128.png` – store icon (128×128, artwork 96×96 with 16 px transparent padding)
- `screenshot-1.png` … `screenshot-5.png` – international (English) screenshots, 1280×800, upload in order
- `screenshot-1-fr.png` … `screenshot-5-fr.png` – localized French screenshots, 1280×800, upload in order
  1. overview · 2. crop · 3. box, arrow, text + blur · 4. how it works · 5. result + URL/date stamp + copy
- `promo-small.png` – small promo tile, 440×280
- `marquee.png` – marquee promo tile, 1400×560 (`marquee-fr.png` for the French listing where the store allows it)

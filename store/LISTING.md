# Fiche Chrome Web Store – textes à copier-coller

## Infos générales
- **Catégorie** : Outils (Tools) — ou « Productivité »
- **Langue principale** : English (le français est inclus via `_locales/fr`)
- **Site web / assistance** : https://github.com/fx-diff/fxfullpage
- **Règles de confidentialité (URL)** : https://github.com/fx-diff/fxfullpage/blob/main/PRIVACY.md

---

## Description (English)

Capture an entire web page — not just what's on screen — in one click, then crop, annotate and export it.

FEATURES
• One-click full page capture (or Alt+Shift+P)
• Works on long pages and on web apps with inner scrolling areas
• Sticky headers and floating banners are not repeated across the image
• Very tall pages are automatically split into several images
• Built-in editor: crop, colored boxes, blur/pixelate sensitive information, undo
• Export to PNG, JPG or multi-page PDF, or copy to the clipboard

PRIVACY
• No account, no ads, no tracking
• Everything happens locally in your browser: no data is ever sent anywhere
• Only the "activeTab" and "scripting" permissions: the extension can only access the tab you click it on

Free and open source (MIT license): https://github.com/fx-diff/fxfullpage

## Description (Français)

Capturez une page web entière — pas seulement la partie visible — en un clic, puis recadrez-la, annotez-la et exportez-la.

FONCTIONNALITÉS
• Capture pleine page en un clic (ou Alt+Shift+P)
• Fonctionne sur les pages longues et les applications web à zone défilante interne
• Les en-têtes collants et bandeaux flottants ne se répètent pas dans l'image
• Les pages très hautes sont découpées automatiquement en plusieurs images
• Éditeur intégré : recadrage, encadrés de couleur, floutage des informations sensibles, annulation
• Export en PNG, JPG ou PDF multipage, ou copie dans le presse-papiers

CONFIDENTIALITÉ
• Pas de compte, pas de publicité, pas de suivi
• Tout se passe en local dans votre navigateur : aucune donnée n'est envoyée
• Seulement les permissions « activeTab » et « scripting » : l'extension n'accède qu'à l'onglet sur lequel vous cliquez

Gratuit et open source (licence MIT) : https://github.com/fx-diff/fxfullpage

---

## Onglet « Pratiques de confidentialité »

**Objectif unique (Single purpose)**
> Capture a full-page screenshot of the current tab and let the user crop, annotate and export it.

**Justification – activeTab**
> Required to capture the content of the tab the user explicitly invokes the extension on (icon click or keyboard shortcut), using chrome.tabs.captureVisibleTab.

**Justification – scripting**
> Injects a script into the active tab, only when the user starts a capture, to measure the page, scroll it step by step during the capture, temporarily hide fixed elements and scrollbars, then restore the page to its original state.

**Code distant (Remote code)**
> No, I am not using remote code. All JavaScript is included in the package.

**Données utilisateur** : ne cocher **aucune** catégorie de données collectées.
Cocher les trois certifications :
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Visuels (dossier `store/`)
- `icon-128.png` – icône de la fiche (128×128)
- `screenshot-1.png` … – captures d'écran 1280×800
- `promo-small.png` – petite vignette promotionnelle 440×280

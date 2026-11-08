# FX Full Page

Extension Chrome (Manifest V3) qui capture une page web entière, puis l'ouvre dans un éditeur.

## Installation

1. Ouvrir `chrome://extensions`
2. Activer le **Mode développeur** (en haut à droite)
3. **Charger l'extension non empaquetée** → sélectionner ce dossier
4. (Optionnel) épingler l'icône dans la barre d'outils

## Utilisation

- Cliquer sur l'icône, ou **Alt+Shift+P** (modifiable dans `chrome://extensions/shortcuts`).
- La progression s'affiche sur l'icône (badge %). Ne pas changer d'onglet pendant la capture.
- L'éditeur s'ouvre dans un nouvel onglet :

| Action | Raccourci |
|---|---|
| Recadrer (tracer une zone, puis Entrée ou ✓) | `C` |
| Encadré de couleur | `R` |
| Flouter / pixeliser une zone | `B` |
| Annuler | `Ctrl+Z` |
| Ajusté / taille réelle | `Z` |
| Copier dans le presse-papiers | `Ctrl+C` |
| Télécharger en PNG | `Ctrl+S` |
| Annuler la sélection | `Échap` |

Exports : PNG, JPG, PDF (pages au format A4, largeur de la capture).

## Fonctionnement

- `background.js` : fait défiler la page par pas d'un écran, appelle `chrome.tabs.captureVisibleTab`
  (limité à 2 appels/s) et assemble les images dans un `OffscreenCanvas`.
- `capture-page.js` : injecté dans la page ; masque les barres de défilement, remet les éléments
  `sticky` dans le flux, cache les éléments `fixed` après la première image (évite les en-têtes répétés),
  puis restaure tout à la fin. Si le document ne défile pas (Gmail, Notion…), il capture le plus grand
  conteneur défilant.
- Pages très hautes : découpées en plusieurs images (limite des canvas Chrome ~32 000 px).
- `db.js` : les 10 dernières captures sont conservées dans IndexedDB.
- `editor.*` : éditeur ; `pdf.js` : petit générateur PDF sans dépendance.

## Limites connues

- Impossible de capturer les pages `chrome://`, le Chrome Web Store et les visionneuses PDF (restriction Chrome).
- Les pages qui chargent du contenu à l'infini sont capturées selon leur hauteur au début de la capture.
- Les contenus animés au défilement peuvent produire des raccords visibles.

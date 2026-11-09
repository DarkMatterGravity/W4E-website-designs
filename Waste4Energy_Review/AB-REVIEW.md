# CEO logo comparison

- Text-only wordmark: https://darkmattergravity.github.io/W4E-website-designs/Waste4Energy_Review/
- Existing icon and wordmark: https://darkmattergravity.github.io/W4E-website-designs/Waste4Energy_With_Icon/

Both variants use the same content, styles and animation scripts. The map keeps its symbols in both versions. The text-only logo crops the original artwork using an SVG viewport so the supplied lettering stays intact.

`npm run build` builds `dist` (text-only) and `dist-icon` (existing icon). Local preview serves the second variant at `/with-icon/`. CMS saves rebuild both. Publish both outputs to their matching GitHub Pages folders after each update. GoDaddy export contains the text-only version.

Entrances, number tallies and the donut restart whenever they leave and re-enter the viewport from either direction. The donut legend also tallies when it enters separately on narrow screens. Background Ken Burns animations continue looping. Reduced-motion visitors see the complete content without entrance or tally animations.

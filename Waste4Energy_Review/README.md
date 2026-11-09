# Waste4Energy review website

This new version combines Option 1's serif headings, colors, spacing, feature grids and roadmap treatment with Option 2's full-width photographic hero. The three original options are unchanged. The public website has Home, Technology, About and Contact pages; all assets, fonts and Lucide icons are served locally.

## Preview and edit

Requires Node.js 22 or later. From this directory:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173 for the website or http://127.0.0.1:4173/admin/ for the content manager. It binds only to your own computer. Keep the terminal running while editing.

On Windows, you can also double-click `Start-Review.cmd`. [Review screenshots](review/README.md) are available without starting the server.

1. Choose a section in the content manager. Edit text, pick colors, or select fonts.
2. Save changes. This writes `content/site.json` and rebuilds the four pages. The saved preview refreshes.
3. Back up content downloads JSON, including any unsaved changes. Import restores a backup; save to apply it.
4. Export website downloads a ZIP of the saved website for manual deployment. It includes the PHP contact handler and deployment instructions. It excludes the content manager, Node dependencies, tests and source files.

The editor is an internal local tool, not a public administration portal. Changes persist to the repository's JSON file. Commit and push that file to keep a shared history. No cloud account or database is required. Font selections include the original locally hosted Montserrat and Libre Baskerville and common system fonts. New custom fonts can be added by a developer.

The Home hero uses the original photo with `assets/hero-depth.svg`, a grayscale depth mask, for subtle WebGL mouse parallax. The text remains fixed. Touch devices, reduced-motion preferences and unavailable WebGL keep the static photo. Home figures tally each time they re-enter view, preserving their original values and suffixes; reduced-motion mode displays final values immediately.

Targeted Waste Streams uses eight newly generated industry photos in optimized WebP format, replacing the presentation's stock photos. Prompts are recorded in `content/generated-image-prompts.json`. The market-share donut wipes clockwise on every entry, with its percentage labels and legend tallying in sync; reduced-motion mode shows the completed chart immediately.

## Publishing changes

Every website change must also update the GitHub Pages preview at https://darkmattergravity.github.io/W4E-website-designs/Waste4Energy_Review/. Build the current source, publish `dist/` to `Waste4Energy_Review/` and `dist-icon/` to `Waste4Energy_With_Icon/` on the repository's `master` branch, and verify both deployed variants. See [A/B review links and build details](AB-REVIEW.md). Keep the internal editor out of the published directory. GoDaddy deployment remains manual.

## Build and checks

```sh
npm run build
npm run export
npm test
npx playwright install chromium
npm run test:browser
```

Build output is `dist/` (ignored by Git). Deploy its contents, not the source project. There is no runtime JavaScript framework or build dependency on GoDaddy. The form requires PHP 8 or later with working outbound mail. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Content provenance

See [CONTENT-MAP.md](CONTENT-MAP.md) for the slide-to-page mapping and editorial decisions. No new marketing claims, contact addresses, operating locations, testimonials, or current production figures have been invented. Form labels and result messages are operational UI text. The presentation's dated vision remains a vision; it is not evidence that facilities have opened.

`scripts/assets.py` is an optional one-time extraction utility requiring PyMuPDF and the original presentation path; extracted assets are checked in, so it is not needed to run or build. `scripts/vendor-assets.py` is the optional asset refresh utility; checked-in fonts and SVG icons require no network access at runtime. Retain the font and Lucide license files.

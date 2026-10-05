# Meanwhile — World History Atlas

An interactive, source-linked atlas for exploring what was happening in different regions at the same time.

**Website:** https://daveomcd.github.io/wikiworld/

## Explore

- Drag the timeline from 1000 BCE to 1900 CE, enter an exact year, or play through time.
- Select a region on the map or in the region menu.
- Use the Alexander the Great and Napoleonic Wars presets for the two original comparisons.
- Compare up to three regions at the same year.
- Search the curated collection by culture, place, event, or year.
- Copy the current browser URL to preserve a year, selected region, and comparison.
- Open each story's sources and context, including approximate dating notes.

## Run locally

Use Node.js 22 or later:

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Vite builds a static site into `dist/`. Relative asset paths support a GitHub Pages project URL such as `/wikiworld/`. No backend, account, API key, or paid service is required. Geographic data is bundled locally. Google Fonts provides optional typography; system and Georgia fallbacks work when it is unavailable.

## GitHub Pages

In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The included workflow tests, builds, and deploys after each push to `main`. The Actions tab shows build and deployment status. Initial publication may take a few minutes.

## Content and editorial model

The initial collection is deliberately selective. A missing entry indicates a gap in this atlas, not an absence of history. Large geographic regions group selected case studies and do not represent uniform cultures. Period summaries describe developments across the displayed range; they do not claim every development existed at every year in that range.

- Negative years mean BCE; positive years mean CE. There is no year zero.
- Date intervals are inclusive. Overlapping entries are intentional, especially for regional transitions and concurrent developments.
- Evidence labels describe written records, archaeology, or both. They are not confidence scores.
- Approximate date ranges display `c.`. Context notes explain particular dating choices.
- The modern coastline provides orientation only. Markers are navigation points, not historical borders or exact settlement locations.
- The entry sources support editorial summaries; the site does not generate live historical answers.

To expand the atlas, add an event to `src/data/history.js` or `src/data/expanded.js` and add its source metadata. Each event requires a unique ID, region, inclusive start/end years, title, culture, evidence type, summary, context, and source keys. Run `npm test` to validate data integrity and the key chronological comparisons.

## Credits

- Geographic geometry: [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public domain, distributed as [world-atlas](https://github.com/topojson/world-atlas) `land-110m.json`.
- Projection: D3 Geo; geometry conversion: TopoJSON Client.
- Historical references: museum, university, archive, and public heritage sources linked inside the atlas.
- Typography: DM Sans and Libre Caslon Display, via Google Fonts.

The repository's MIT license applies to the site code. Linked source material retains its original ownership and terms.

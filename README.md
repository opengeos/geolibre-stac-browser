# GeoLibre STAC Browser

A [GeoLibre](https://github.com/opengeos/GeoLibre) plugin to browse and explore
[SpatioTemporal Asset Catalog (STAC)](https://stacspec.org/) catalogs, collections,
and items directly on a MapLibre GL map, inspired by the
[Radiant Earth STAC Browser](https://radiantearth.github.io/stac-browser/).

It ships as a GeoLibre Desktop/web plugin, and also as a standalone, framework-free
widget you can drop into any MapLibre app.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Browse any STAC catalog or API** - Point it at a static catalog (`catalog.json`)
  or a STAC API root; it traverses catalogs, collections, and items using `child`,
  `data`, `item`, and `items` links, with automatic STAC API `/collections` listing.
- **Curated catalog presets** - One-click access to Microsoft Planetary Computer,
  Earth Search (AWS), USGS LandsatLook, Digital Earth Africa, and Digital Earth
  Australia, plus a URL box for any other catalog.
- **Footprints on the map** - Item footprints are drawn as you browse, with the
  selected item highlighted and the map framed to its extent.
- **Item detail** - Properties, the full asset list (with direct links), and a
  thumbnail.
- **COG previews** - When the GeoLibre host provides its raster engine, render an
  item's Cloud Optimized GeoTIFF asset at full resolution; otherwise fall back to a
  thumbnail image overlay placed on the item footprint.
- **Paged item loading** - "Load more" follows STAC API `next` links and batches
  static `item` links.
- **Deep linking** - Open GeoLibre with `?stac=<catalog-url>` to auto-activate the
  plugin and load that catalog.
- **Theme-aware** - Adapts to light/dark via `prefers-color-scheme`.

## Quick start (standalone)

```bash
npm install geolibre-stac-browser maplibre-gl
```

```typescript
import maplibregl from "maplibre-gl";
import { StacBrowser, createStacMapBridge } from "geolibre-stac-browser";
import "geolibre-stac-browser/style.css";
import "maplibre-gl/dist/maplibre-gl.css";

const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/positron",
  center: [0, 20],
  zoom: 2,
});

// Mount the browser into any element; the bridge wires footprints/previews/framing
// to the map.
const browser = new StacBrowser({
  map: createStacMapBridge(() => map),
  initialUrl: "https://earth-search.aws.element84.com/v1",
});
browser.mount(document.getElementById("sidebar")!);
```

See [`examples/basic`](examples/basic) (vanilla) and [`examples/react`](examples/react)
(React) for complete, runnable setups.

## Build a GeoLibre plugin bundle

GeoLibre Desktop loads external plugins from an app data `plugins/` directory. The
bundle is a zip with `plugin.json` at the root plus the ESM entry and CSS.

```bash
npm install
npm run package:geolibre
```

This produces `geolibre-plugin/geolibre-stac-browser-0.1.0.zip` containing:

```text
plugin.json
dist/index.js
dist/style.css
```

Copy the zip into GeoLibre Desktop's app data `plugins/` directory and restart
GeoLibre. On Linux with the default app identifier that is usually:

```text
~/.local/share/org.geolibre.desktop/plugins/
```

Or install it in one step:

```bash
# GeoLibre Desktop's app-data plugins directory (auto-scanned on startup)
npm run install:geolibre

# A GeoLibre repo's bundled drop-in folder
npm run install:geolibre -- --web /path/to/geolibre
```

For the GeoLibre web app, serve the unpacked bundle with CORS enabled and add the
manifest URL in GeoLibre Settings > Plugins:

```bash
npm run package:geolibre
npm run serve:geolibre -- 8000
# then add http://localhost:8000/plugin.json
```

## How it works in GeoLibre

On `activate`, the plugin:

1. Adds a small map control whose button opens the STAC Browser.
2. Registers the **STAC Browser** as a native right-sidebar panel.
3. Registers a **STAC** toolbar menu (open the browser, load a preset catalog,
   clear map layers).

The browser renders footprints and the selection as GeoJSON layers on the map, and
frames the view as you navigate. Item thumbnails preview as an image overlay placed
on the item footprint.

### COG rendering (and the deck.gl caveat)

Full-resolution Cloud Optimized GeoTIFF rendering uses GeoLibre's shared
[`maplibre-gl-raster`](https://github.com/opengeos/maplibre-gl-raster) engine, which
is backed by deck.gl/luma.gl. This plugin **does not bundle deck.gl** - bundling a
second copy makes luma.gl throw "already initialized" because the GPU device cannot
be shared across instances. Instead, the plugin asks the host for its single engine
instance via the optional `app.getMaplibreGlRaster()` capability and drives the
headless `LayerManager` (`interleaved: true`). deck.gl's tiled raster path only
supports Web Mercator, so the plugin switches the map off globe projection before
showing a COG.

When the host does not expose the raster engine (standalone usage, or a host build
without it), `View on map` is hidden and the browser falls back to the thumbnail
image overlay. The contract lives in
[`src/lib/geolibre/host-api.ts`](src/lib/geolibre/host-api.ts)
(`GeoLibreRasterModule`) and the renderer in
[`src/lib/geolibre/cog-renderer.ts`](src/lib/geolibre/cog-renderer.ts).

## Public API

| Export | Description |
| ------ | ----------- |
| `StacBrowser` | The framework-free browser widget (`mount`, `loadCatalog`, `clearMap`, `destroy`). |
| `StacClient` | DOM-free STAC traversal (`fetchJson`, `getChildren`, `loadItems`, `search`). |
| `createStacMapBridge(getMap, cog?)` | A `StacMapBridge` that draws footprints/previews on a MapLibre map. |
| `createCogRenderer(app, getMap)` | COG renderer backed by the host raster engine. |
| `registerStacBrowserPanel(app, options)` | Register the browser as a GeoLibre right panel. |
| `registerStacToolbarMenu(app, options)` | Register the STAC toolbar menu. |
| `DEFAULT_CATALOGS` | The built-in catalog presets. |
| geo helpers | `itemToFootprint`, `itemsToFootprints`, `boundsOfItems`, `boundsOfCollection`, `normalizeBbox`, ... |

Plus the GeoLibre host-plugin contract types from
[`src/lib/geolibre/host-api.ts`](src/lib/geolibre/host-api.ts).

## Project structure

```text
src/
├── geolibre.ts                 # GeoLibre plugin entry point
├── index.ts                    # Library entry point (re-exports)
└── lib/
    ├── core/PluginControl.ts   # MapLibre control (the launcher button)
    ├── geolibre/
    │   ├── host-api.ts         # GeoLibre host-plugin contract
    │   ├── right-panel.ts      # registerStacBrowserPanel()
    │   ├── toolbar-menu.ts     # registerStacToolbarMenu()
    │   ├── stac-map-bridge.ts  # map footprints/preview adapter
    │   └── cog-renderer.ts     # host-injected COG rendering
    ├── stac/
    │   ├── client.ts           # STAC traversal client (DOM-free)
    │   ├── browser.ts          # StacBrowser UI
    │   ├── geo.ts              # footprint/bounds helpers
    │   ├── catalogs.ts         # preset catalogs
    │   ├── map-bridge.ts       # StacMapBridge interface
    │   ├── dom.ts              # tiny DOM builders
    │   └── types.ts            # STAC type definitions
    └── utils/                  # helpers + deep-link
```

## Development

```bash
npm install
npm run dev            # standalone dev server (examples)
npm run test           # unit tests (vitest)
npm run lint           # eslint
npm run build          # library + GeoLibre bundle
npm run package:geolibre  # build + zip the GeoLibre plugin
```

## License

MIT License - see [LICENSE](LICENSE) for details.

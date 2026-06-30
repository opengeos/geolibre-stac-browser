/**
 * Full-resolution Cloud Optimized GeoTIFF rendering for the STAC browser.
 *
 * GeoLibre renders COGs with the deck.gl/luma.gl-backed `maplibre-gl-raster`
 * engine. Bundling a second copy of deck.gl/luma would make luma.gl throw
 * "already initialized", so this plugin never imports the engine: it asks the
 * host for its shared instance via {@link GeoLibreAppAPI.getMaplibreGlRaster} and
 * drives the headless `LayerManager`. When the host does not provide the engine,
 * {@link CogRenderer.canShow} reports `false` and the browser falls back to a
 * thumbnail image overlay.
 *
 * @see https://github.com/opengeos/maplibre-gl-raster
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type {
  GeoLibreAppAPI,
  GeoLibreControl,
  GeoLibreRasterLayerManager,
} from "./host-api";
import type { CogRenderer } from "./stac-map-bridge";

/** A map that may expose MapLibre's optional projection API. */
type ProjectableMap = MapLibreMap & {
  getProjection?: () => { type?: string } | undefined;
  setProjection?: (projection: { type: string }) => void;
};

/**
 * deck.gl's tiled raster path only supports Web Mercator, so force the map off
 * globe projection before showing a COG, re-applying once the style settles
 * (the projection can reset while a new style loads).
 */
function ensureMercatorProjection(map: MapLibreMap): void {
  const projectable = map as ProjectableMap;
  const setMercator = (): void => {
    if (projectable.getProjection?.()?.type === "mercator") return;
    projectable.setProjection?.({ type: "mercator" });
  };
  setMercator();
  map.once("idle", setMercator);
}

/**
 * Create a {@link CogRenderer} backed by the host's raster engine.
 *
 * @param app - The GeoLibre host API from the plugin's `activate` hook.
 * @param getMap - Returns the live MapLibre map (or `null` before it is ready).
 * @returns A COG renderer; {@link CogRenderer.canShow} is `false` when no engine.
 */
export function createCogRenderer<TControl extends GeoLibreControl>(
  app: GeoLibreAppAPI<TControl>,
  getMap: () => MapLibreMap | null,
): CogRenderer {
  let manager: GeoLibreRasterLayerManager | null = null;
  let currentId: string | null = null;

  const getModule = () => app.getMaplibreGlRaster?.() ?? null;

  const ensureManager = (map: MapLibreMap): GeoLibreRasterLayerManager | null => {
    if (manager) return manager;
    const module = getModule();
    if (!module?.LayerManager) return null;
    manager = new module.LayerManager(map, { interleaved: true });
    return manager;
  };

  return {
    canShow(): boolean {
      return Boolean(getModule()?.LayerManager);
    },

    async show(url, id, options): Promise<void> {
      const map = getMap();
      if (!map) return;
      const layerManager = ensureManager(map);
      if (!layerManager) return;

      // Replace any previous COG so only one is shown at a time.
      if (currentId && currentId !== id) {
        try {
          layerManager.removeRaster(currentId);
        } catch {
          // Already gone; ignore.
        }
      }

      ensureMercatorProjection(map);
      currentId = id;
      await layerManager.addRaster(url, {
        id,
        zoomTo: false,
        state: { nodata: 0, ...(options ?? {}) },
      });
    },

    clear(): void {
      if (!manager || !currentId) return;
      try {
        manager.removeRaster(currentId);
      } catch {
        // Ignore teardown errors.
      }
      currentId = null;
    },
  };
}

/**
 * Full-resolution Cloud Optimized GeoTIFF rendering for the STAC browser.
 *
 * GeoLibre renders COGs with the deck.gl/luma.gl-backed `maplibre-gl-raster`
 * engine. Bundling a second copy of deck.gl/luma would make luma.gl throw
 * "already initialized", so this plugin never imports the engine. It first asks
 * the host to add a native COG layer via {@link GeoLibreAppAPI.addCogLayer};
 * older hosts can still provide their shared raster module through
 * {@link GeoLibreAppAPI.getMaplibreGlRaster}. When neither host capability is
 * present, {@link CogRenderer.canShow} reports `false`.
 *
 * @see https://github.com/opengeos/maplibre-gl-raster
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import type {
  GeoLibreAppAPI,
  GeoLibreCogLayerOptions,
  GeoLibreControl,
  GeoLibreRasterModule,
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
  let managerPromise: Promise<GeoLibreRasterLayerManager | null> | null = null;
  let currentId: string | null = null;

  const getModule = async (): Promise<GeoLibreRasterModule | null> => {
    const module = app.getMaplibreGlRaster?.() ?? null;
    return module ? await module : null;
  };

  const ensureManager = async (
    map: MapLibreMap,
  ): Promise<GeoLibreRasterLayerManager | null> => {
    if (manager) return manager;
    managerPromise ??= (async () => {
      const module = await getModule();
      if (!module?.LayerManager) return null;
      manager = new module.LayerManager(map, { interleaved: true });
      return manager;
    })();
    return managerPromise;
  };

  return {
    canShow(): boolean {
      return Boolean(app.addCogLayer || app.getMaplibreGlRaster);
    },

    async show(url, id, options): Promise<void> {
      if (app.addCogLayer) {
        app.setMapProjection?.("mercator");
        currentId = await app.addCogLayer(id, url, {
          nodata: 0,
          ...(options as GeoLibreCogLayerOptions | undefined),
        });
        return;
      }

      const map = getMap();
      if (!map) return;
      const layerManager = await ensureManager(map);
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

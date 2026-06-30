/**
 * A {@link StacMapBridge} backed by a real MapLibre map.
 *
 * The browser UI stays framework-agnostic by talking to the map only through
 * the {@link StacMapBridge} interface; this module is the concrete adapter that
 * adds GeoJSON sources/layers for footprints and an image source for thumbnail
 * previews directly to the GeoLibre map. COG raster previews are layered on top
 * of this through the {@link CogRenderer} hook.
 */

import type {
  GeoJSONSource,
  ImageSourceSpecification,
  LngLatBoundsLike,
  Map as MapLibreMap,
} from "maplibre-gl";
import type { Bounds, FootprintCollection, FootprintFeature } from "../stac/geo";
import type { StacMapBridge } from "../stac/map-bridge";

/** Source/layer ids the bridge owns, namespaced to avoid host collisions. */
const FOOTPRINTS_SOURCE = "stac-browser-footprints";
const FOOTPRINTS_FILL = "stac-browser-footprints-fill";
const FOOTPRINTS_LINE = "stac-browser-footprints-line";
const SELECTED_SOURCE = "stac-browser-selected";
const SELECTED_FILL = "stac-browser-selected-fill";
const SELECTED_LINE = "stac-browser-selected-line";
const PREVIEW_SOURCE = "stac-browser-preview";
const PREVIEW_LAYER = "stac-browser-preview-layer";

const EMPTY: FootprintCollection = { type: "FeatureCollection", features: [] };

/**
 * Optional hook that renders a Cloud Optimized GeoTIFF asset on the map. The
 * GeoLibre wiring supplies an implementation when COG support is available; the
 * bridge owns calling {@link clear} on teardown.
 */
export interface CogRenderer {
  /** Render a COG at full resolution; `id` is a stable per-item layer id. */
  show(url: string, id: string, options?: Record<string, unknown>): void | Promise<void>;
  /** Remove the current COG layer, if any. */
  clear(): void;
  /** Whether COG rendering is available (the host provides a raster engine). */
  canShow(): boolean;
}

/**
 * Create a map bridge bound to a lazily-resolved MapLibre map.
 *
 * @param getMap - Returns the live map, or `null` before it is ready.
 * @param cog - Optional COG renderer for full-resolution raster previews.
 * @returns A {@link StacMapBridge} that adds and removes the browser's layers.
 */
export function createStacMapBridge(
  getMap: () => MapLibreMap | null,
  cog?: CogRenderer,
): StacMapBridge {
  /** Run `fn` once the map's style is ready (now or on the next `load`). */
  const whenReady = (fn: (map: MapLibreMap) => void): void => {
    const map = getMap();
    if (!map) return;
    if (map.isStyleLoaded()) fn(map);
    else map.once("load", () => fn(map));
  };

  const ensureFootprintLayers = (map: MapLibreMap): void => {
    if (!map.getSource(FOOTPRINTS_SOURCE)) {
      map.addSource(FOOTPRINTS_SOURCE, { type: "geojson", data: EMPTY });
      map.addLayer({
        id: FOOTPRINTS_FILL,
        type: "fill",
        source: FOOTPRINTS_SOURCE,
        paint: { "fill-color": "#3bb2d0", "fill-opacity": 0.08 },
      });
      map.addLayer({
        id: FOOTPRINTS_LINE,
        type: "line",
        source: FOOTPRINTS_SOURCE,
        paint: { "line-color": "#3bb2d0", "line-width": 1.5 },
      });
    }
  };

  const ensureSelectedLayers = (map: MapLibreMap): void => {
    if (!map.getSource(SELECTED_SOURCE)) {
      map.addSource(SELECTED_SOURCE, { type: "geojson", data: EMPTY });
      map.addLayer({
        id: SELECTED_FILL,
        type: "fill",
        source: SELECTED_SOURCE,
        paint: { "fill-color": "#f59e0b", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: SELECTED_LINE,
        type: "line",
        source: SELECTED_SOURCE,
        paint: { "line-color": "#f59e0b", "line-width": 2.5 },
      });
    }
  };

  const removeLayer = (map: MapLibreMap, id: string): void => {
    if (map.getLayer(id)) map.removeLayer(id);
  };
  const removeSource = (map: MapLibreMap, id: string): void => {
    if (map.getSource(id)) map.removeSource(id);
  };

  const removePreview = (map: MapLibreMap): void => {
    removeLayer(map, PREVIEW_LAYER);
    removeSource(map, PREVIEW_SOURCE);
  };

  return {
    showFootprints(collection: FootprintCollection): void {
      whenReady((map) => {
        ensureFootprintLayers(map);
        (map.getSource(FOOTPRINTS_SOURCE) as GeoJSONSource | undefined)?.setData(
          collection as never,
        );
      });
    },

    showSelected(feature: FootprintFeature | null): void {
      whenReady((map) => {
        ensureSelectedLayers(map);
        const data: FootprintCollection = feature
          ? { type: "FeatureCollection", features: [feature] }
          : EMPTY;
        (map.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined)?.setData(
          data as never,
        );
      });
    },

    fitBounds(bounds: Bounds): void {
      whenReady((map) => {
        const [w, s, e, n] = bounds;
        const lngLat: LngLatBoundsLike = [
          [w, s],
          [e, n],
        ];
        map.fitBounds(lngLat, { padding: 40, duration: 600, maxZoom: 14 });
      });
    },

    showPreview(url: string, bounds: Bounds): void {
      whenReady((map) => {
        removePreview(map);
        const [w, s, e, n] = bounds;
        const source: ImageSourceSpecification = {
          type: "image",
          url,
          coordinates: [
            [w, n],
            [e, n],
            [e, s],
            [w, s],
          ],
        };
        map.addSource(PREVIEW_SOURCE, source);
        map.addLayer({
          id: PREVIEW_LAYER,
          type: "raster",
          source: PREVIEW_SOURCE,
          paint: { "raster-opacity": 0.85, "raster-fade-duration": 0 },
        });
      });
    },

    showCog(url: string, id: string, options?: Record<string, unknown>): void {
      // The raster engine attaches its own deck.gl overlay to the map, so it
      // only needs the live map; no extra source/layer bookkeeping here. Drop
      // any thumbnail overlay first so the two previews do not stack.
      const map = getMap();
      if (map) removePreview(map);
      void cog?.show(url, id, options);
    },

    canShowCog(): boolean {
      return cog?.canShow() ?? false;
    },

    clearPreview(): void {
      cog?.clear();
      whenReady((map) => removePreview(map));
    },

    clear(): void {
      cog?.clear();
      whenReady((map) => {
        removePreview(map);
        for (const id of [
          SELECTED_LINE,
          SELECTED_FILL,
          FOOTPRINTS_LINE,
          FOOTPRINTS_FILL,
        ]) {
          removeLayer(map, id);
        }
        removeSource(map, SELECTED_SOURCE);
        removeSource(map, FOOTPRINTS_SOURCE);
      });
    },
  };
}

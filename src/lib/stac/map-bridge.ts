/**
 * The map operations the STAC browser needs, expressed as a narrow interface so
 * the browser UI stays decoupled from MapLibre and the GeoLibre host. The
 * GeoLibre wiring implements this with the host's native-layer API plus the
 * MapLibre map; tests and standalone usage can supply their own implementation
 * or rely on the no-op default.
 */

import type { Bounds, FootprintCollection, FootprintFeature } from "./geo";

/** Map side effects the browser drives as the user navigates. */
export interface StacMapBridge {
  /** Render (or replace) the footprints of the items currently in view. */
  showFootprints(collection: FootprintCollection): void;
  /** Highlight a single selected item footprint, or clear it with `null`. */
  showSelected(feature: FootprintFeature | null): void;
  /** Frame the map to the given bounds. */
  fitBounds(bounds: Bounds): void;
  /** Current map view bounds `[w, s, e, n]`, or `null` when no map is ready. */
  getViewBounds(): Bounds | null;
  /** Overlay a (thumbnail) image placed at the given bounds. */
  showPreview(url: string, bounds: Bounds): void;
  /** Remove any image preview overlay. */
  clearPreview(): void;
  /**
   * Render a Cloud Optimized GeoTIFF asset at full resolution. Available only
   * when the host provides a raster engine (see {@link canShowCog}).
   *
   * @param url - The COG asset URL.
   * @param id - A stable layer id (the item id).
   * @param options - Optional band/colormap/rescale state forwarded to the engine.
   */
  showCog(url: string, id: string, options?: Record<string, unknown>): void;
  /** Whether full-resolution COG rendering is available in this host. */
  canShowCog(): boolean;
  /** Remove all footprints, selection, and previews the browser added. */
  clear(): void;
}

/** A map bridge that does nothing, for tests and non-map usage. */
export const NOOP_MAP_BRIDGE: StacMapBridge = {
  showFootprints: () => undefined,
  showSelected: () => undefined,
  fitBounds: () => undefined,
  getViewBounds: () => null,
  showPreview: () => undefined,
  clearPreview: () => undefined,
  showCog: () => undefined,
  canShowCog: () => false,
  clear: () => undefined,
};

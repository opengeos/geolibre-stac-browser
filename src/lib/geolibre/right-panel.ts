/**
 * Registers the STAC Browser as a GeoLibre right-sidebar panel.
 *
 * The browser itself ({@link StacBrowser}) is framework-free and renders into
 * the plain-DOM container the host hands to `render(container)`. This module
 * wires it to the GeoLibre map through {@link createStacMapBridge} so footprints,
 * previews, and map framing happen on the host's map.
 */

import type { Map as MapLibreMap } from "maplibre-gl";
import { StacBrowser } from "../stac/browser";
import type { StacCatalogPreset } from "../stac/catalogs";
import type { GeoLibreAppAPI, GeoLibreControl } from "./host-api";
import { createStacMapBridge, type CogRenderer } from "./stac-map-bridge";

/** Stable id for the STAC Browser right panel. */
export const STAC_PANEL_ID = "geolibre-stac-browser-panel";

/** Options for {@link registerStacBrowserPanel}. */
export interface StacPanelOptions {
  /** Returns the live MapLibre map (or `null` before it is ready). */
  getMap: () => MapLibreMap | null;
  /** Catalog presets for the browser's quick-pick dropdown. */
  presets?: StacCatalogPreset[];
  /** Optional COG raster renderer for full-resolution previews. */
  cog?: CogRenderer;
  /** Open the panel immediately after registering it. */
  openOnRegister?: boolean;
}

/** A handle for driving an already-registered STAC Browser panel. */
export interface StacPanelHandle {
  /** The live browser instance (available after the panel first renders). */
  getBrowser: () => StacBrowser | null;
  /** Close and unregister the panel, tearing down its map layers. */
  dispose: () => void;
}

/**
 * Register the STAC Browser right panel with the host.
 *
 * @param app - The GeoLibre host API from the plugin's `activate` hook.
 * @param options - Map accessor, presets, and COG renderer.
 * @returns A handle, or `null` when the host has no right sidebar.
 */
export function registerStacBrowserPanel<TControl extends GeoLibreControl>(
  app: GeoLibreAppAPI<TControl>,
  options: StacPanelOptions,
): StacPanelHandle | null {
  if (!app.registerRightPanel) return null;

  const bridge = createStacMapBridge(options.getMap, options.cog);
  let browser: StacBrowser | null = null;

  const unregister = app.registerRightPanel({
    id: STAC_PANEL_ID,
    title: "STAC Browser",
    defaultWidth: 380,
    render(container) {
      browser = new StacBrowser({ map: bridge, presets: options.presets });
      browser.mount(container);
      return () => {
        browser?.destroy();
        browser = null;
      };
    },
  });

  if (options.openOnRegister !== false) {
    app.openRightPanel?.(STAC_PANEL_ID);
  }

  return {
    getBrowser: () => browser,
    dispose: () => {
      app.closeRightPanel?.(STAC_PANEL_ID);
      browser?.destroy();
      browser = null;
      unregister();
    },
  };
}

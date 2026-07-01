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

/** Inline SVG data URI shown when GeoLibre collapses the STAC right panel. */
const STAC_PANEL_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 3h9l5 5v5'/%3E%3Cpath d='M14 3v5h5'/%3E%3Cpath d='M5 3v18h7'/%3E%3Ccircle cx='11' cy='13' r='4'/%3E%3Cpath d='m14 16 5 5'/%3E%3C/svg%3E";

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
    icon: STAC_PANEL_ICON,
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

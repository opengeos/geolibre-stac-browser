/**
 * Registers the STAC top toolbar menu in the GeoLibre banner.
 *
 * The menu opens the STAC Browser panel, offers one-click loading of the
 * built-in catalog presets, and clears the browser's map layers. It degrades
 * gracefully on hosts without a toolbar (returns `null`).
 */

import { DEFAULT_CATALOGS, type StacCatalogPreset } from "../stac/catalogs";
import type {
  GeoLibreAppAPI,
  GeoLibreControl,
  GeoLibreToolbarMenuItem,
} from "./host-api";
import { STAC_PANEL_ID, type StacPanelHandle } from "./right-panel";

/** Stable id for the STAC toolbar menu. */
export const STAC_MENU_ID = "geolibre-stac-browser-menu";

/** Options for {@link registerStacToolbarMenu}. */
export interface StacMenuOptions {
  /** Handle to the registered panel, used to reach the live browser. */
  panel: StacPanelHandle | null;
  /** Catalog presets to list under "Open catalog". */
  presets?: StacCatalogPreset[];
}

/**
 * Register the STAC toolbar menu.
 *
 * @param app - The GeoLibre host API from the plugin's `activate` hook.
 * @param options - The panel handle and catalog presets.
 * @returns A disposer that unregisters the menu, or `null` when the host has no
 *   top toolbar.
 */
export function registerStacToolbarMenu<TControl extends GeoLibreControl>(
  app: GeoLibreAppAPI<TControl>,
  options: StacMenuOptions,
): (() => void) | null {
  if (!app.registerToolbarMenu) return null;

  const presets = options.presets ?? DEFAULT_CATALOGS;
  const { panel } = options;

  const openBrowser = (): void => {
    app.openRightPanel?.(STAC_PANEL_ID);
  };
  const loadCatalog = (url: string): void => {
    app.openRightPanel?.(STAC_PANEL_ID);
    void panel?.getBrowser()?.loadCatalog(url);
  };

  const catalogItems: GeoLibreToolbarMenuItem[] = presets.map((preset) => ({
    id: `catalog-${preset.url}`,
    label: preset.name,
    disabled: !panel,
    onSelect: () => loadCatalog(preset.url),
  }));

  return app.registerToolbarMenu({
    id: STAC_MENU_ID,
    label: "STAC",
    items: [
      {
        id: "open-browser",
        label: "Open STAC Browser",
        disabled: !app.openRightPanel,
        onSelect: openBrowser,
      },
      {
        type: "submenu",
        id: "open-catalog",
        label: "Open catalog",
        items: catalogItems,
      },
      { type: "separator" },
      {
        id: "clear-layers",
        label: "Clear map layers",
        disabled: !panel,
        onSelect: () => panel?.getBrowser()?.clearMap(),
      },
    ],
  });
}

import { describe, it, expect, vi } from "vitest";
import type {
  GeoLibreAppAPI,
  GeoLibreControl,
  GeoLibreRightPanelRegistration,
  GeoLibreToolbarMenu,
} from "../src/lib/geolibre/host-api";
import {
  STAC_PANEL_ID,
  registerStacBrowserPanel,
} from "../src/lib/geolibre/right-panel";
import {
  STAC_MENU_ID,
  registerStacToolbarMenu,
} from "../src/lib/geolibre/toolbar-menu";

function createApp() {
  let panel: GeoLibreRightPanelRegistration | null = null;
  let menu: GeoLibreToolbarMenu | null = null;
  const app: GeoLibreAppAPI<GeoLibreControl> = {
    addMapControl: () => true,
    removeMapControl: () => undefined,
    registerRightPanel: (registration) => {
      panel = registration;
      return vi.fn();
    },
    openRightPanel: vi.fn(() => true),
    closeRightPanel: vi.fn(),
    registerToolbarMenu: (registered) => {
      menu = registered;
      return vi.fn();
    },
  };
  return { app, getPanel: () => panel, getMenu: () => menu };
}

describe("registerStacBrowserPanel", () => {
  it("registers and opens the STAC panel and mounts the browser", () => {
    const { app, getPanel } = createApp();
    const handle = registerStacBrowserPanel(app, { getMap: () => null });
    expect(handle).not.toBeNull();

    const panel = getPanel();
    expect(panel?.id).toBe(STAC_PANEL_ID);
    expect(app.openRightPanel).toHaveBeenCalledWith(STAC_PANEL_ID);

    const container = document.createElement("div");
    const cleanup = panel?.render(container);
    expect(container.querySelector(".stac-toolbar")).not.toBeNull();
    expect(handle?.getBrowser()).not.toBeNull();

    (cleanup as () => void)();
  });

  it("returns null when the host has no right sidebar", () => {
    const { app } = createApp();
    delete app.registerRightPanel;
    expect(registerStacBrowserPanel(app, { getMap: () => null })).toBeNull();
  });
});

describe("registerStacToolbarMenu", () => {
  function findItem(menu: GeoLibreToolbarMenu, id: string) {
    for (const item of menu.items) {
      if ("id" in item && item.id === id && item.type !== "submenu") return item;
      if (item.type === "submenu") {
        const nested = item.items.find((c) => "id" in c && c.id === id);
        if (nested) return nested;
      }
    }
    return undefined;
  }

  it("registers a STAC menu that opens the panel and loads catalogs", () => {
    const { app, getPanel, getMenu } = createApp();
    const handle = registerStacBrowserPanel(app, { getMap: () => null });
    getPanel()?.render(document.createElement("div"));

    const dispose = registerStacToolbarMenu(app, { panel: handle });
    expect(dispose).toBeTypeOf("function");

    const menu = getMenu()!;
    expect(menu.id).toBe(STAC_MENU_ID);

    const open = findItem(menu, "open-browser") as { onSelect: () => void };
    open.onSelect();
    expect(app.openRightPanel).toHaveBeenCalledWith(STAC_PANEL_ID);

    // The submenu lists catalog presets that load on select.
    const loadCatalog = vi.fn();
    vi.spyOn(handle!.getBrowser()!, "loadCatalog").mockImplementation(
      loadCatalog,
    );
    const preset = menu.items.find(
      (i) => i.type === "submenu" && i.id === "open-catalog",
    );
    expect(preset && "items" in preset && preset.items.length).toBeGreaterThan(0);
  });

  it("returns null when the host has no toolbar", () => {
    const { app } = createApp();
    delete app.registerToolbarMenu;
    expect(registerStacToolbarMenu(app, { panel: null })).toBeNull();
  });
});

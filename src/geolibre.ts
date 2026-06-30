import { PluginControl } from "./lib/core/PluginControl";
import type {
  GeoLibreAppAPI,
  GeoLibreMapControlPosition,
  GeoLibrePlugin,
} from "./lib/geolibre/host-api";
import { createCogRenderer } from "./lib/geolibre/cog-renderer";
import {
  registerStacBrowserPanel,
  STAC_PANEL_ID,
  type StacPanelHandle,
} from "./lib/geolibre/right-panel";
import { registerStacToolbarMenu } from "./lib/geolibre/toolbar-menu";
import { maybeHandleDeepLink, STAC_URL_PARAM } from "./lib/utils/deep-link";
import "./lib/styles/plugin-control.css";

// The host API is generic over the control type; bind it to this plugin's
// concrete control so the wired callbacks are fully typed.
type AppAPI = GeoLibreAppAPI<PluginControl>;

let control: PluginControl | null = null;
let position: GeoLibreMapControlPosition = "top-right";
let panel: StacPanelHandle | null = null;
let disposeToolbarMenu: (() => void) | null = null;

/** Create the small map control whose button opens the STAC Browser panel. */
function createControl(app: AppAPI): PluginControl {
  return new PluginControl({
    title: "STAC Browser",
    collapsed: true,
    // Clicking the control opens the right-side STAC Browser instead of the
    // control's own dropdown.
    onButtonClick: () => {
      app.openRightPanel?.(STAC_PANEL_ID);
    },
  });
}

export const plugin: GeoLibrePlugin<PluginControl> = {
  id: "geolibre-stac-browser",
  name: "GeoLibre STAC Browser",
  version: "0.1.0",
  urlParameterNames: [STAC_URL_PARAM],
  activate(app) {
    control = control ?? createControl(app);
    const added = app.addMapControl(control, position);
    if (!added) {
      control = null;
      return false;
    }

    const getMap = () => control?.getMap() ?? null;
    const cog = createCogRenderer(app, getMap);

    panel = registerStacBrowserPanel(app, { getMap, cog });
    disposeToolbarMenu = registerStacToolbarMenu(app, { panel });
  },
  // Deep link: GeoLibre auto-activates this plugin when a URL carries the `stac`
  // parameter and dispatches it here, e.g.
  // ?stac=https://earth-search.aws.element84.com/v1
  handleUrlParameters(app, params) {
    const browser = panel?.getBrowser();
    if (browser) {
      app.openRightPanel?.(STAC_PANEL_ID);
      return maybeHandleDeepLink(
        { loadCatalog: (url) => browser.loadCatalog(url) },
        params,
      );
    }
  },
  deactivate(app) {
    disposeToolbarMenu?.();
    disposeToolbarMenu = null;
    panel?.dispose();
    panel = null;
    if (!control) return;
    app.removeMapControl(control);
    control = null;
  },
  getMapControlPosition() {
    return position;
  },
  setMapControlPosition(app, nextPosition) {
    position = nextPosition;
    if (!control) return;

    app.removeMapControl(control);
    const added = app.addMapControl(control, position);
    if (!added) {
      control = null;
      return false;
    }
  },
};

export default plugin;

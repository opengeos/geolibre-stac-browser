import type { IControl, Map as MapLibreMap } from "maplibre-gl";
import { StacBrowser } from "../stac/browser";
import type { StacCatalogPreset } from "../stac/catalogs";
import { createStacMapBridge } from "../geolibre/stac-map-bridge";

/** Configuration for {@link StacBrowserControl}. */
export interface StacBrowserControlOptions {
  /** Whether the panel starts collapsed (showing only the toggle icon). */
  collapsed?: boolean;
  /** Expanded panel width in pixels. */
  panelWidth?: number;
  /** Header title shown above the browser. */
  title?: string;
  /** Catalogs offered in the browser's quick-pick dropdown. */
  presets?: StacCatalogPreset[];
  /** Catalog URL to load when the control is added. */
  initialUrl?: string;
}

const DEFAULTS: Required<Omit<StacBrowserControlOptions, "presets" | "initialUrl">> = {
  collapsed: true,
  panelWidth: 380,
  title: "STAC Browser",
};

/**
 * A MapLibre control that hosts the {@link StacBrowser} in a collapsible panel.
 *
 * Collapsed, it shows only a 29x29 toggle button (matching the navigation
 * control); expanded, it reveals the browser docked beside the button. This is
 * the standalone counterpart to the GeoLibre right-panel integration, so the
 * browser is reachable from an icon instead of occupying a fixed sidebar.
 *
 * @example
 * ```typescript
 * map.addControl(
 *   new StacBrowserControl({ initialUrl: "https://earth-search.aws.element84.com/v1" }),
 *   "top-left",
 * );
 * ```
 */
export class StacBrowserControl implements IControl {
  private readonly options: StacBrowserControlOptions &
    typeof DEFAULTS;
  private map?: MapLibreMap;
  private mapContainer?: HTMLElement;
  private container?: HTMLElement;
  private panel?: HTMLElement;
  private browser?: StacBrowser;
  private collapsed: boolean;
  private resizeHandler: (() => void) | null = null;
  private mapResizeHandler: (() => void) | null = null;

  constructor(options: StacBrowserControlOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.collapsed = this.options.collapsed;
  }

  /** Implements `IControl`: build the button and panel, mount the browser. */
  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map;
    this.mapContainer = map.getContainer();

    this.container = document.createElement("div");
    this.container.className =
      "maplibregl-ctrl maplibregl-ctrl-group stac-control";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "stac-control-toggle";
    toggle.setAttribute("aria-label", this.options.title);
    toggle.title = this.options.title;
    toggle.innerHTML = STAC_ICON;
    toggle.addEventListener("click", () => this.toggle());
    this.container.appendChild(toggle);

    this.panel = this.buildPanel();
    this.mapContainer.appendChild(this.panel);

    // Mount the browser once; the panel stays in the DOM across collapse so its
    // state persists.
    const body = this.panel.querySelector(".stac-control-body") as HTMLElement;
    this.browser = new StacBrowser({
      map: createStacMapBridge(() => this.map ?? null),
      presets: this.options.presets,
      initialUrl: this.options.initialUrl,
    });
    this.browser.mount(body);

    this.resizeHandler = () => {
      if (!this.collapsed) this.updatePanelPosition();
    };
    window.addEventListener("resize", this.resizeHandler);
    this.mapResizeHandler = () => {
      if (!this.collapsed) this.updatePanelPosition();
    };
    map.on("resize", this.mapResizeHandler);

    if (!this.collapsed) {
      this.panel.classList.add("expanded");
      requestAnimationFrame(() => this.updatePanelPosition());
    }

    return this.container;
  }

  /** Implements `IControl`: tear down the panel, browser, and listeners. */
  onRemove(): void {
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.mapResizeHandler && this.map) {
      this.map.off("resize", this.mapResizeHandler);
      this.mapResizeHandler = null;
    }
    this.browser?.destroy();
    this.browser = undefined;
    this.panel?.parentNode?.removeChild(this.panel);
    this.container?.parentNode?.removeChild(this.container);
    this.map = undefined;
    this.mapContainer = undefined;
    this.container = undefined;
    this.panel = undefined;
  }

  /** Toggle the panel open/closed. */
  toggle(): void {
    if (this.collapsed) this.expand();
    else this.collapse();
  }

  /** Expand the panel. */
  expand(): void {
    if (!this.collapsed || !this.panel) return;
    this.collapsed = false;
    this.panel.classList.add("expanded");
    this.updatePanelPosition();
  }

  /** Collapse the panel to its toggle button. */
  collapse(): void {
    if (this.collapsed || !this.panel) return;
    this.collapsed = true;
    this.panel.classList.remove("expanded");
  }

  /** Access the hosted browser (e.g. to drive `loadCatalog`). */
  getBrowser(): StacBrowser | undefined {
    return this.browser;
  }

  private buildPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "stac-control-panel";
    panel.style.width = `${this.options.panelWidth}px`;

    const header = document.createElement("div");
    header.className = "stac-control-header";
    const title = document.createElement("span");
    title.className = "stac-control-title";
    title.textContent = this.options.title;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "stac-control-close";
    close.setAttribute("aria-label", "Collapse panel");
    close.innerHTML = "&times;";
    close.addEventListener("click", () => this.collapse());
    header.append(title, close);

    const body = document.createElement("div");
    body.className = "stac-control-body";

    panel.append(header, body);
    return panel;
  }

  /** Detect the control's corner from its MapLibre container class. */
  private corner(): "top-left" | "top-right" | "bottom-left" | "bottom-right" {
    const parent = this.container?.parentElement;
    if (parent?.classList.contains("maplibregl-ctrl-top-left")) return "top-left";
    if (parent?.classList.contains("maplibregl-ctrl-bottom-left")) return "bottom-left";
    if (parent?.classList.contains("maplibregl-ctrl-bottom-right")) return "bottom-right";
    return "top-right";
  }

  /** Position the panel beside the toggle button within the map container. */
  private updatePanelPosition(): void {
    if (!this.container || !this.panel || !this.mapContainer) return;
    const button = this.container.querySelector(".stac-control-toggle");
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const mapRect = this.mapContainer.getBoundingClientRect();
    const gap = 6;
    const corner = this.corner();

    this.panel.style.top = "";
    this.panel.style.bottom = "";
    this.panel.style.left = "";
    this.panel.style.right = "";

    const top = buttonRect.top - mapRect.top;
    const bottom = mapRect.bottom - buttonRect.bottom;
    const left = buttonRect.left - mapRect.left;
    const right = mapRect.right - buttonRect.right;

    if (corner === "top-left" || corner === "top-right") {
      this.panel.style.top = `${top + buttonRect.height + gap}px`;
    } else {
      this.panel.style.bottom = `${bottom + buttonRect.height + gap}px`;
    }
    if (corner === "top-left" || corner === "bottom-left") {
      this.panel.style.left = `${left}px`;
    } else {
      this.panel.style.right = `${right}px`;
    }
  }
}

/** Inline "stacked layers" icon representing a catalog stack. */
const STAC_ICON = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
`;

import { describe, it, expect, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { StacBrowserControl } from "../src/lib/core/StacBrowserControl";

/** A minimal MapLibre map stub sufficient for the control's onAdd/onRemove. */
function fakeMap(): MapLibreMap {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return {
    getContainer: () => container,
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    // Report the style as not yet loaded so the map bridge defers all layer
    // work to a `load` event that never fires in this stub.
    isStyleLoaded: () => false,
  } as unknown as MapLibreMap;
}

describe("StacBrowserControl", () => {
  it("renders a toggle button and mounts the browser panel", () => {
    const control = new StacBrowserControl();
    const el = control.onAdd(fakeMap());

    expect(el.classList.contains("stac-control")).toBe(true);
    expect(el.querySelector(".stac-control-toggle")).not.toBeNull();
    // The panel is mounted into the map container with the browser inside it.
    const map = control.getBrowser();
    expect(map).toBeDefined();
    expect(document.querySelector(".stac-control-panel .stac-browser")).not.toBeNull();

    control.onRemove();
    expect(document.querySelector(".stac-control-panel")).toBeNull();
  });

  it("starts collapsed and expands on toggle", () => {
    const control = new StacBrowserControl({ collapsed: true });
    control.onAdd(fakeMap());
    const panel = document.querySelector(".stac-control-panel") as HTMLElement;
    expect(panel.classList.contains("expanded")).toBe(false);

    control.expand();
    expect(panel.classList.contains("expanded")).toBe(true);

    control.collapse();
    expect(panel.classList.contains("expanded")).toBe(false);

    control.onRemove();
  });
});

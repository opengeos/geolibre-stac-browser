import { describe, it, expect, vi, beforeEach } from "vitest";
import { StacBrowser } from "../src/lib/stac/browser";
import { StacClient } from "../src/lib/stac/client";
import type { StacMapBridge } from "../src/lib/stac/map-bridge";

const ROUTES: Record<string, unknown> = {
  "https://api/": {
    type: "Catalog",
    id: "root",
    title: "Root Catalog",
    description: "A test catalog",
    links: [
      { rel: "self", href: "https://api/" },
      { rel: "data", href: "collections" },
    ],
  },
  "https://api/collections": {
    collections: [
      {
        type: "Collection",
        id: "col",
        title: "Collection One",
        description: "first collection",
        extent: { spatial: { bbox: [[0, 0, 10, 10]] } },
        links: [
          { rel: "self", href: "https://api/collections/col" },
          { rel: "items", href: "https://api/collections/col/items" },
        ],
      },
    ],
  },
  "https://api/collections/col/items": {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "item-1",
        bbox: [0, 0, 1, 1],
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        properties: { datetime: "2020-01-01T00:00:00Z", platform: "test-sat" },
        assets: {
          thumbnail: {
            href: "https://t/thumb.png",
            type: "image/png",
            roles: ["thumbnail"],
          },
          data: {
            href: "https://t/data.tif",
            type: "image/tiff; application=geotiff; profile=cloud-optimized",
            roles: ["data"],
          },
        },
        links: [],
      },
    ],
    links: [],
  },
};

function fetchStub(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!(url in ROUTES)) return { ok: false, status: 404 } as Response;
    return { ok: true, status: 200, json: async () => ROUTES[url] } as Response;
  }) as unknown as typeof fetch;
}

function mockBridge(): StacMapBridge {
  return {
    showFootprints: vi.fn(),
    showSelected: vi.fn(),
    fitBounds: vi.fn(),
    showPreview: vi.fn(),
    clearPreview: vi.fn(),
    showCog: vi.fn(),
    canShowCog: vi.fn(() => false),
    clear: vi.fn(),
  };
}

/** Let queued microtasks/promises settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("StacBrowser", () => {
  let container: HTMLElement;
  let map: StacMapBridge;
  let browser: StacBrowser;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    map = mockBridge();
    browser = new StacBrowser({
      client: new StacClient(fetchStub()),
      map,
    });
    browser.mount(container);
  });

  it("renders the toolbar and an empty state on mount", () => {
    expect(container.querySelector(".stac-toolbar")).not.toBeNull();
    expect(container.querySelector(".stac-empty-state")).not.toBeNull();
  });

  it("loads a catalog and lists its collections", async () => {
    await browser.loadCatalog("https://api/");
    expect(container.querySelector(".stac-node-title")?.textContent).toBe(
      "Root Catalog",
    );
    const children = container.querySelectorAll(".stac-child-title");
    expect(children).toHaveLength(1);
    expect(children[0].textContent).toBe("Collection One");
  });

  it("drills into a collection, lists items, and shows footprints", async () => {
    await browser.loadCatalog("https://api/");
    (container.querySelector(".stac-child") as HTMLButtonElement).click();
    await flush();
    await flush();

    const items = container.querySelectorAll(".stac-item-id");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toBe("item-1");

    expect(map.showFootprints).toHaveBeenCalled();
    const fc = (map.showFootprints as ReturnType<typeof vi.fn>).mock.calls.at(
      -1,
    )?.[0];
    expect(fc.features).toHaveLength(1);
    expect(map.fitBounds).toHaveBeenCalled();
  });

  it("opens an item detail view and highlights it on the map", async () => {
    await browser.loadCatalog("https://api/");
    (container.querySelector(".stac-child") as HTMLButtonElement).click();
    await flush();
    await flush();

    (container.querySelector(".stac-item") as HTMLButtonElement).click();
    await flush();

    expect(container.querySelector(".stac-detail")).not.toBeNull();
    expect(container.querySelector(".stac-node-title")?.textContent).toBe(
      "item-1",
    );
    // Assets and properties are rendered.
    expect(container.querySelector(".stac-asset-list")).not.toBeNull();
    expect(container.querySelectorAll(".stac-asset")).toHaveLength(2);
    expect(map.showSelected).toHaveBeenCalled();
  });

  it("clears the map on destroy", () => {
    browser.destroy();
    expect(map.clear).toHaveBeenCalled();
  });
});

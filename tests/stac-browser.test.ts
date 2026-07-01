import { describe, it, expect, vi, beforeEach } from "vitest";
import { StacBrowser } from "../src/lib/stac/browser";
import { StacClient } from "../src/lib/stac/client";
import { DEFAULT_CATALOGS } from "../src/lib/stac/catalogs";
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
      { rel: "search", href: "search", method: "POST" },
    ],
  },
  "https://api/search": {
    type: "FeatureCollection",
    numberMatched: 1,
    features: [
      {
        type: "Feature",
        id: "search-hit-1",
        bbox: [2, 2, 3, 3],
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2],
            ],
          ],
        },
        properties: { datetime: "2021-06-15T00:00:00Z" },
        assets: {},
        links: [],
      },
    ],
    links: [],
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
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
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
    getViewBounds: vi.fn(() => null),
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
      presets: [{ name: "Test API", url: "https://api/" }, ...DEFAULT_CATALOGS],
    });
    browser.mount(container);
  });

  it("renders the toolbar and an empty state on mount", () => {
    expect(container.querySelector(".stac-toolbar")).not.toBeNull();
    expect(container.querySelector(".stac-catalog-filter")).toBeNull();
    expect(container.querySelector(".stac-preset-select")).not.toBeNull();
    expect(container.querySelector(".stac-empty-state")).not.toBeNull();
  });

  it("offers preset catalogs and a custom URL option", () => {
    const select = container.querySelector(
      ".stac-preset-select",
    ) as HTMLSelectElement;

    const options = Array.from(select.options).map(
      (option) => option.textContent,
    );
    expect(options).toContain("Earth Search (AWS / Element 84)");
    expect(options).toContain("Enter custom STAC catalog URL");
  });

  it("clears and focuses the URL input for a custom catalog", () => {
    const select = container.querySelector(
      ".stac-preset-select",
    ) as HTMLSelectElement;
    const input = container.querySelector(
      ".stac-url-input",
    ) as HTMLInputElement;
    input.value = "https://old.example/catalog.json";

    select.value = "__custom_stac_catalog__";
    select.dispatchEvent(new Event("change"));

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
  });

  it("clears previous catalog content when choosing a custom catalog", async () => {
    await browser.loadCatalog("https://api/");
    expect(container.querySelector(".stac-node-title")?.textContent).toBe(
      "Root Catalog",
    );

    const select = container.querySelector(
      ".stac-preset-select",
    ) as HTMLSelectElement;
    select.value = "__custom_stac_catalog__";
    select.dispatchEvent(new Event("change"));

    expect(container.querySelector(".stac-node-title")).toBeNull();
    expect(container.querySelectorAll(".stac-child")).toHaveLength(0);
    expect(container.querySelector(".stac-empty-state")).not.toBeNull();
    expect(map.clear).toHaveBeenCalled();
  });

  it("loads a preset catalog URL from the catalog dropdown", async () => {
    const select = container.querySelector(
      ".stac-preset-select",
    ) as HTMLSelectElement;
    select.value = "https://api/";
    select.dispatchEvent(new Event("change"));

    await flush();
    await flush();
    expect(container.querySelector(".stac-node-title")?.textContent).toBe(
      "Root Catalog",
    );
    expect(
      (container.querySelector(".stac-url-input") as HTMLInputElement).value,
    ).toBe("https://api/");
  });

  it("loads a catalog and lists its collections", async () => {
    await browser.loadCatalog("https://api/");
    expect(container.querySelector(".stac-node-title")?.textContent).toBe(
      "Root Catalog",
    );
    expect(container.querySelector(".stac-breadcrumbs")?.textContent).toBe("");
    const children = container.querySelectorAll(".stac-child-title");
    expect(children).toHaveLength(1);
    expect(children[0].textContent).toBe("Collection One");
  });

  it("filters catalogs and collections by name", async () => {
    await browser.loadCatalog("https://api/");
    const filter = container.querySelector(
      ".stac-child-filter",
    ) as HTMLInputElement;

    filter.value = "missing";
    filter.dispatchEvent(new Event("input"));
    expect(container.querySelectorAll(".stac-child")).toHaveLength(0);
    expect(container.textContent).toContain(
      "No catalogs or collections match this filter.",
    );

    filter.value = "collection";
    filter.dispatchEvent(new Event("input"));
    expect(container.querySelectorAll(".stac-child")).toHaveLength(1);
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

  it("shows a search form for an API root and renders search results", async () => {
    await browser.loadCatalog("https://api/");
    const search = container.querySelector(".stac-search");
    expect(search).not.toBeNull();

    // Expand the form and submit (no filters → broad search).
    (
      container.querySelector(".stac-search-toggle") as HTMLButtonElement
    ).click();
    (
      container.querySelector(".stac-search-submit") as HTMLButtonElement
    ).click();
    await flush();
    await flush();

    const title = container.querySelector(".stac-section-title")?.textContent;
    expect(title).toContain("Search results");
    const ids = Array.from(container.querySelectorAll(".stac-item-id")).map(
      (e) => e.textContent,
    );
    expect(ids).toContain("search-hit-1");
    expect(container.querySelector(".stac-back")).not.toBeNull();
  });

  it("uses a single bbox input in the search form", async () => {
    (map.getViewBounds as ReturnType<typeof vi.fn>).mockReturnValue([
      1, 2, 3, 4,
    ]);
    await browser.loadCatalog("https://api/");

    (
      container.querySelector(".stac-search-toggle") as HTMLButtonElement
    ).click();
    const bbox = container.querySelector(
      ".stac-search-bbox",
    ) as HTMLInputElement;
    expect(bbox.tagName).toBe("INPUT");
    expect(container.querySelectorAll(".stac-search-bbox")).toHaveLength(1);

    (
      container.querySelector(".stac-search-useview") as HTMLButtonElement
    ).click();
    expect(bbox.value).toBe("1.0000, 2.0000, 3.0000, 4.0000");
  });

  it("clears the map on destroy", () => {
    browser.destroy();
    expect(map.clear).toHaveBeenCalled();
  });
});

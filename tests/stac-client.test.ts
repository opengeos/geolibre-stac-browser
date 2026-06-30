import { describe, it, expect, vi } from "vitest";
import {
  StacClient,
  StacError,
  classifyStac,
  getLink,
  getLinks,
  resolveUrl,
  selfUrl,
  stacTitle,
  titleFromUrl,
} from "../src/lib/stac/client";
import type { StacObject } from "../src/lib/stac/types";

/** Build a `fetch` stub that serves documents keyed by URL. */
function fetchStub(routes: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!(url in routes)) {
      return { ok: false, status: 404 } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => routes[url],
    } as Response;
  }) as unknown as typeof fetch;
}

describe("resolveUrl", () => {
  it("resolves relative hrefs against the base", () => {
    expect(resolveUrl("https://x.com/a/catalog.json", "./child.json")).toBe(
      "https://x.com/a/child.json",
    );
    expect(resolveUrl("https://x.com/a/catalog.json", "../b/c.json")).toBe(
      "https://x.com/b/c.json",
    );
  });

  it("keeps absolute hrefs unchanged", () => {
    expect(resolveUrl("https://x.com/a/", "https://y.com/z")).toBe(
      "https://y.com/z",
    );
  });
});

describe("classifyStac", () => {
  it("classifies by the type field", () => {
    expect(classifyStac({ type: "Catalog" })).toBe("Catalog");
    expect(classifyStac({ type: "Collection" })).toBe("Collection");
    expect(classifyStac({ type: "Feature" })).toBe("Item");
    expect(classifyStac({ type: "FeatureCollection" })).toBe("ItemCollection");
  });

  it("falls back to structural hints", () => {
    expect(classifyStac({ extent: {} })).toBe("Collection");
    expect(classifyStac({ links: [] })).toBe("Catalog");
    expect(classifyStac(null)).toBe("unknown");
  });
});

describe("link helpers", () => {
  const doc = {
    links: [
      { rel: "self", href: "https://x/c.json" },
      { rel: "child", href: "a.json" },
      { rel: "CHILD", href: "b.json" },
    ],
  };

  it("matches relations case-insensitively", () => {
    expect(getLinks(doc, "child")).toHaveLength(2);
    expect(getLink(doc, "self")?.href).toBe("https://x/c.json");
  });

  it("resolves self url against a base", () => {
    expect(selfUrl(doc, "https://x/")).toBe("https://x/c.json");
    expect(selfUrl({ links: [] }, "https://x/fallback")).toBe(
      "https://x/fallback",
    );
  });

  it("derives a title from title, then id", () => {
    expect(stacTitle({ title: "Nice", id: "x" })).toBe("Nice");
    expect(stacTitle({ id: "x" })).toBe("x");
    expect(stacTitle({}, "fallback")).toBe("fallback");
  });
});

describe("titleFromUrl", () => {
  it("uses the last meaningful path segment", () => {
    expect(
      titleFromUrl("https://earth-search.aws.element84.com/v1/collections/landsat-c2-l2"),
    ).toBe("landsat-c2-l2");
  });

  it("skips a trailing catalog.json and uses the parent id", () => {
    expect(titleFromUrl("https://x/data/sentinel-2/catalog.json")).toBe(
      "sentinel-2",
    );
  });
});

describe("StacClient.fetchJson", () => {
  it("returns parsed JSON for a successful response", async () => {
    const client = new StacClient(
      fetchStub({ "https://x/c.json": { id: "root" } }),
    );
    const doc = await client.fetchJson<{ id: string }>("https://x/c.json");
    expect(doc.id).toBe("root");
  });

  it("throws StacError on a failed response", async () => {
    const client = new StacClient(fetchStub({}));
    await expect(client.fetchJson("https://x/missing")).rejects.toBeInstanceOf(
      StacError,
    );
  });
});

describe("StacClient.getChildren", () => {
  it("uses child links when present", async () => {
    const client = new StacClient(fetchStub({}));
    const node = {
      links: [
        { rel: "child", href: "sub/a.json", title: "A" },
        { rel: "child", href: "sub/b.json", title: "B" },
      ],
    } as unknown as StacObject;
    const children = await client.getChildren(node, "https://x/cat.json");
    expect(children.map((c) => c.url)).toEqual([
      "https://x/sub/a.json",
      "https://x/sub/b.json",
    ]);
    expect(children[0].title).toBe("A");
  });

  it("follows the data link to a collections listing for an API root", async () => {
    const client = new StacClient(
      fetchStub({
        "https://api/collections": {
          collections: [
            {
              id: "sentinel-2",
              title: "Sentinel-2",
              description: "S2",
              links: [
                { rel: "self", href: "https://api/collections/sentinel-2" },
              ],
            },
          ],
        },
      }),
    );
    const node = {
      links: [{ rel: "data", href: "collections" }],
    } as unknown as StacObject;
    const children = await client.getChildren(node, "https://api/");
    expect(children).toHaveLength(1);
    expect(children[0].title).toBe("Sentinel-2");
    expect(children[0].type).toBe("Collection");
    expect(children[0].url).toBe("https://api/collections/sentinel-2");
    expect(children[0].stac?.id).toBe("sentinel-2");
  });
});

describe("StacClient.loadItems", () => {
  it("loads an ItemCollection and wires GET-style paging", async () => {
    const page1 = {
      type: "FeatureCollection",
      features: [{ type: "Feature", id: "i1" }],
      links: [{ rel: "next", href: "items?page=2" }],
      numberMatched: 2,
    };
    const page2 = {
      type: "FeatureCollection",
      features: [{ type: "Feature", id: "i2" }],
      links: [],
    };
    const client = new StacClient(
      fetchStub({
        "https://api/items": page1,
        "https://api/items?page=2": page2,
      }),
    );
    const node = {
      links: [{ rel: "items", href: "items" }],
    } as unknown as StacObject;

    const first = await client.loadItems(node, "https://api/c.json");
    expect(first.items.map((i) => i.id)).toEqual(["i1"]);
    expect(first.matched).toBe(2);
    expect(first.next).toBeTypeOf("function");

    const second = await first.next!();
    expect(second.items.map((i) => i.id)).toEqual(["i2"]);
    expect(second.next).toBeNull();
  });

  it("batches static item links", async () => {
    const routes: Record<string, unknown> = {};
    const itemLinks = [];
    for (let i = 0; i < 25; i += 1) {
      const url = `https://x/items/i${i}.json`;
      routes[url] = { type: "Feature", id: `i${i}` };
      itemLinks.push({ rel: "item", href: `items/i${i}.json` });
    }
    const client = new StacClient(fetchStub(routes));
    const node = { links: itemLinks } as unknown as StacObject;

    const first = await client.loadItems(node, "https://x/cat.json");
    expect(first.items).toHaveLength(20);
    expect(first.next).toBeTypeOf("function");

    const second = await first.next!();
    expect(second.items).toHaveLength(5);
    expect(second.next).toBeNull();
  });
});

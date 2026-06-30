import { describe, it, expect } from "vitest";
import {
  bboxToPolygon,
  boundsOfCollection,
  boundsOfGeometry,
  boundsOfItems,
  itemToFootprint,
  itemsToFootprints,
  normalizeBbox,
} from "../src/lib/stac/geo";
import type { StacItem } from "../src/lib/stac/types";

const item = (id: string, extra: Partial<StacItem> = {}): StacItem =>
  ({
    type: "Feature",
    id,
    geometry: null,
    properties: {},
    assets: {},
    links: [],
    ...extra,
  }) as StacItem;

describe("normalizeBbox", () => {
  it("handles 2D and 3D bboxes", () => {
    expect(normalizeBbox([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
    expect(normalizeBbox([1, 2, 0, 3, 4, 10])).toEqual([1, 2, 3, 4]);
  });

  it("rejects malformed bboxes", () => {
    expect(normalizeBbox(undefined)).toBeNull();
    expect(normalizeBbox([1, 2, 3])).toBeNull();
  });
});

describe("bboxToPolygon", () => {
  it("builds a closed ring", () => {
    const poly = bboxToPolygon([0, 0, 10, 5]);
    expect(poly.type).toBe("Polygon");
    const ring = (poly.coordinates as number[][][])[0];
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
  });
});

describe("itemToFootprint", () => {
  it("uses the item geometry when present", () => {
    const geom = { type: "Point", coordinates: [1, 2] };
    const footprint = itemToFootprint(item("a", { geometry: geom }));
    expect(footprint?.geometry).toBe(geom);
    expect(footprint?.properties.id).toBe("a");
  });

  it("falls back to a bbox rectangle", () => {
    const footprint = itemToFootprint(item("b", { bbox: [0, 0, 1, 1] }));
    expect(footprint?.geometry.type).toBe("Polygon");
  });

  it("returns null without geometry or bbox", () => {
    expect(itemToFootprint(item("c"))).toBeNull();
  });
});

describe("itemsToFootprints", () => {
  it("drops items without geometry", () => {
    const fc = itemsToFootprints([
      item("a", { bbox: [0, 0, 1, 1] }),
      item("b"),
    ]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(1);
  });
});

describe("bounds", () => {
  it("computes the union of item bounds", () => {
    const bounds = boundsOfItems([
      item("a", { bbox: [0, 0, 2, 2] }),
      item("b", { bbox: [1, 1, 5, 6] }),
    ]);
    expect(bounds).toEqual([0, 0, 5, 6]);
  });

  it("reads a collection's first spatial bbox", () => {
    const collection = {
      id: "c",
      links: [],
      extent: { spatial: { bbox: [[-10, -20, 30, 40]] } },
    };
    expect(boundsOfCollection(collection as never)).toEqual([-10, -20, 30, 40]);
  });

  it("derives bounds from a geometry's coordinates", () => {
    const bounds = boundsOfGeometry({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [4, 0],
          [4, 3],
          [0, 3],
          [0, 0],
        ],
      ],
    });
    expect(bounds).toEqual([0, 0, 4, 3]);
  });
});

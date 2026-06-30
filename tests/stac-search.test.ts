import { describe, it, expect } from "vitest";
import { buildSearchBody, buildDatetime } from "../src/lib/stac/search";

describe("buildDatetime", () => {
  it("builds closed, open-start, and open-end intervals", () => {
    expect(buildDatetime("2020-01-01", "2020-12-31")).toBe(
      "2020-01-01T00:00:00Z/2020-12-31T23:59:59Z",
    );
    expect(buildDatetime("2020-01-01", undefined)).toBe(
      "2020-01-01T00:00:00Z/..",
    );
    expect(buildDatetime(undefined, "2020-12-31")).toBe(
      "../2020-12-31T23:59:59Z",
    );
    expect(buildDatetime(undefined, undefined)).toBeNull();
  });
});

describe("buildSearchBody", () => {
  it("omits empty fields and defaults the limit", () => {
    expect(buildSearchBody({})).toEqual({ limit: 20 });
    expect(buildSearchBody({ collections: ["", "  "] })).toEqual({ limit: 20 });
  });

  it("includes collections, bbox, datetime, cloud cover, and limit", () => {
    const body = buildSearchBody({
      collections: ["sentinel-2-l2a", " landsat "],
      bbox: [-10, -5, 10, 5],
      dateStart: "2021-06-01",
      dateEnd: "2021-06-30",
      cloudCover: 20,
      limit: 50,
    });
    expect(body).toEqual({
      collections: ["sentinel-2-l2a", "landsat"],
      bbox: [-10, -5, 10, 5],
      datetime: "2021-06-01T00:00:00Z/2021-06-30T23:59:59Z",
      query: { "eo:cloud_cover": { lte: 20 } },
      limit: 50,
    });
  });

  it("ignores a null bbox and null cloud cover", () => {
    const body = buildSearchBody({ bbox: null, cloudCover: null, limit: 5 });
    expect(body).toEqual({ limit: 5 });
  });
});

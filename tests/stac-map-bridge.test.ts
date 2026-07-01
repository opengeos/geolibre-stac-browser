import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { createStacMapBridge } from "../src/lib/geolibre/stac-map-bridge";

function fakeMap(styleLoaded = false): MapLibreMap {
  return {
    fitBounds: vi.fn(),
    resize: vi.fn(),
    isStyleLoaded: vi.fn(() => styleLoaded),
    once: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn(() => false),
    getSource: vi.fn(() => false),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
  } as unknown as MapLibreMap;
}

describe("createStacMapBridge", () => {
  it("fits bounds immediately even while the style is not fully loaded", () => {
    const map = fakeMap();
    const bridge = createStacMapBridge(() => map);

    bridge.fitBounds([1, 2, 3, 4]);

    expect(
      (map.resize as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (map.fitBounds as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    );
    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [1, 2],
        [3, 4],
      ],
      { padding: 40, duration: 600, maxZoom: 14 },
    );
    expect(map.once).not.toHaveBeenCalled();
  });

  it("adds TileJSON previews as raster layers", () => {
    const map = fakeMap(true);
    const bridge = createStacMapBridge(() => map);

    bridge.showTileJson("https://tiles.example/tilejson.json", "item-1");

    expect(map.addSource).toHaveBeenCalledWith("stac-browser-tilejson", {
      type: "raster",
      url: "https://tiles.example/tilejson.json",
    });
    expect(map.addLayer).toHaveBeenCalledWith({
      id: "stac-browser-tilejson-layer",
      type: "raster",
      source: "stac-browser-tilejson",
      paint: { "raster-opacity": 0.9, "raster-fade-duration": 0 },
    });
  });

  it("falls back to TiTiler TileJSON for public COGs without a host renderer", () => {
    const map = fakeMap(true);
    const bridge = createStacMapBridge(() => map, {
      canShow: vi.fn(() => false),
      show: vi.fn(),
      clear: vi.fn(),
    });

    bridge.showCog("https://example.com/data.tif", "item-1");

    expect(map.addSource).toHaveBeenCalledWith("stac-browser-tilejson", {
      type: "raster",
      url: "https://titiler.d2s.org/cog/WebMercatorQuad/tilejson.json?url=https%3A%2F%2Fexample.com%2Fdata.tif",
    });
    expect(map.addLayer).toHaveBeenCalledWith({
      id: "stac-browser-tilejson-layer",
      type: "raster",
      source: "stac-browser-tilejson",
      paint: { "raster-opacity": 0.9, "raster-fade-duration": 0 },
    });
  });

  it("uses the host COG renderer when available", () => {
    const map = fakeMap(true);
    const cog = {
      canShow: vi.fn(() => true),
      show: vi.fn(),
      clear: vi.fn(),
    };
    const bridge = createStacMapBridge(() => map, cog);

    bridge.showCog("https://example.com/data.tif", "item-1");

    expect(cog.show).toHaveBeenCalledWith(
      "https://example.com/data.tif",
      "item-1",
      undefined,
    );
    expect(map.addSource).not.toHaveBeenCalledWith(
      "stac-browser-tilejson",
      expect.anything(),
    );
  });
});

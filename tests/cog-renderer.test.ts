import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { createCogRenderer } from "../src/lib/geolibre/cog-renderer";
import type {
  GeoLibreAppAPI,
  GeoLibreRasterLayerManager,
} from "../src/lib/geolibre/host-api";

function appStub(extra: Partial<GeoLibreAppAPI> = {}): GeoLibreAppAPI {
  return {
    addMapControl: vi.fn(() => true),
    removeMapControl: vi.fn(),
    ...extra,
  };
}

describe("createCogRenderer", () => {
  it("prefers GeoLibre host-managed COG layers", async () => {
    const addCogLayer = vi.fn(async () => "host-cog-layer");
    const setMapProjection = vi.fn();
    const renderer = createCogRenderer(
      appStub({ addCogLayer, setMapProjection }),
      () => null,
    );

    expect(renderer.canShow()).toBe(true);

    await renderer.show("https://example.com/data.tif", "item-1");

    expect(setMapProjection).toHaveBeenCalledWith("mercator");
    expect(addCogLayer).toHaveBeenCalledWith(
      "item-1",
      "https://example.com/data.tif",
      { nodata: 0 },
    );
  });

  it("falls back to the host raster module when addCogLayer is unavailable", async () => {
    const addRaster = vi.fn();
    const LayerManager = vi.fn(
      class implements GeoLibreRasterLayerManager {
        addRaster = addRaster;
        removeRaster = vi.fn();
        destroy = vi.fn();
      },
    );
    const map = {
      once: vi.fn(),
      getProjection: vi.fn(() => ({ type: "globe" })),
      setProjection: vi.fn(),
    } as unknown as MapLibreMap;
    const renderer = createCogRenderer(
      appStub({
        getMaplibreGlRaster: vi.fn(async () => ({ LayerManager })),
      }),
      () => map,
    );

    expect(renderer.canShow()).toBe(true);

    await renderer.show("https://example.com/data.tif", "item-1");

    expect(LayerManager).toHaveBeenCalledWith(map, { interleaved: true });
    expect(map.setProjection).toHaveBeenCalledWith({ type: "mercator" });
    expect(addRaster).toHaveBeenCalledWith("https://example.com/data.tif", {
      id: "item-1",
      zoomTo: false,
      state: { nodata: 0 },
    });
  });
});

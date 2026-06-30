/**
 * Geometry helpers that turn STAC objects into GeoJSON the map can render.
 *
 * DOM- and MapLibre-free so they can be unit-tested directly. The browser UI
 * feeds the output to GeoLibre's native-layer API (for footprints) and uses the
 * bounds helpers to frame the map.
 */

import type { StacCatalog, StacGeometry, StacItem } from "./types";

/** A west, south, east, north bounding box in degrees. */
export type Bounds = [number, number, number, number];

/** A GeoJSON Feature wrapping a STAC item footprint. */
export interface FootprintFeature {
  type: "Feature";
  id?: string;
  geometry: StacGeometry;
  properties: Record<string, unknown>;
}

/** A GeoJSON FeatureCollection of item footprints. */
export interface FootprintCollection {
  type: "FeatureCollection";
  features: FootprintFeature[];
}

/**
 * Normalize a STAC bbox (which may be 2D `[w,s,e,n]` or 3D
 * `[w,s,minz,e,n,maxz]`) to a 2D {@link Bounds}.
 *
 * @param bbox - A STAC bounding box array.
 * @returns The 2D bounds, or `null` when the input is unusable.
 */
export function normalizeBbox(bbox: number[] | undefined): Bounds | null {
  if (!bbox) return null;
  if (bbox.length === 4) return [bbox[0], bbox[1], bbox[2], bbox[3]];
  if (bbox.length === 6) return [bbox[0], bbox[1], bbox[3], bbox[4]];
  return null;
}

/** Build a closed GeoJSON Polygon geometry from a 2D bbox. */
export function bboxToPolygon(bounds: Bounds): StacGeometry {
  const [w, s, e, n] = bounds;
  return {
    type: "Polygon",
    coordinates: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ],
    ],
  };
}

/**
 * Build a footprint feature for a STAC item, preferring its real geometry and
 * falling back to a rectangle from its bbox.
 *
 * @param item - A STAC item.
 * @returns A footprint feature, or `null` when the item has no usable geometry.
 */
export function itemToFootprint(item: StacItem): FootprintFeature | null {
  const geometry =
    item.geometry && typeof item.geometry === "object"
      ? item.geometry
      : (() => {
          const bounds = normalizeBbox(item.bbox);
          return bounds ? bboxToPolygon(bounds) : null;
        })();
  if (!geometry) return null;

  return {
    type: "Feature",
    id: item.id,
    geometry,
    properties: {
      id: item.id,
      collection: item.collection ?? null,
      datetime: item.properties?.datetime ?? null,
    },
  };
}

/** Build a FeatureCollection of footprints for a list of items. */
export function itemsToFootprints(items: StacItem[]): FootprintCollection {
  const features = items
    .map(itemToFootprint)
    .filter((feature): feature is FootprintFeature => feature !== null);
  return { type: "FeatureCollection", features };
}

/** Merge two bounds into one that contains both. */
function unionBounds(a: Bounds, b: Bounds): Bounds {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

/**
 * Compute the combined bounds of a list of items from their bbox/geometry.
 *
 * @param items - STAC items.
 * @returns The enclosing bounds, or `null` when none have spatial info.
 */
export function boundsOfItems(items: StacItem[]): Bounds | null {
  let result: Bounds | null = null;
  for (const item of items) {
    const bounds =
      normalizeBbox(item.bbox) ?? boundsOfGeometry(item.geometry ?? undefined);
    if (bounds) result = result ? unionBounds(result, bounds) : bounds;
  }
  return result;
}

/**
 * Compute the union of a collection's spatial extent bboxes.
 *
 * @param collection - A STAC collection.
 * @returns The collection bounds, or `null` when no extent is declared.
 */
export function boundsOfCollection(collection: StacCatalog): Bounds | null {
  const bboxes = collection.extent?.spatial?.bbox;
  if (!Array.isArray(bboxes) || bboxes.length === 0) return null;
  // The first bbox is the overall extent by STAC convention.
  return normalizeBbox(bboxes[0]);
}

/** Walk a GeoJSON geometry's coordinates to derive its bounds. */
export function boundsOfGeometry(
  geometry: StacGeometry | undefined,
): Bounds | null {
  if (!geometry) return null;
  if (geometry.type === "GeometryCollection") {
    let result: Bounds | null = null;
    for (const child of geometry.geometries ?? []) {
      const bounds = boundsOfGeometry(child);
      if (bounds) result = result ? unionBounds(result, bounds) : bounds;
    }
    return result;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const visit = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === "number" &&
      typeof node[1] === "number"
    ) {
      minX = Math.min(minX, node[0]);
      minY = Math.min(minY, node[1]);
      maxX = Math.max(maxX, node[0]);
      maxY = Math.max(maxY, node[1]);
      return;
    }
    for (const child of node) visit(child);
  };
  visit(geometry.coordinates);

  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

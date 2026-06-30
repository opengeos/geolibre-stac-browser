/**
 * Minimal SpatioTemporal Asset Catalog (STAC) type definitions.
 *
 * These describe just the parts of the STAC spec the browser needs to traverse
 * and display catalogs, collections, and items. They are intentionally loose
 * (`Record<string, unknown>` for free-form metadata) so the client works against
 * any STAC version (1.0.x) and any extension without strict typing getting in
 * the way.
 *
 * @see https://stacspec.org/
 */

/** A hypermedia link, as found in a STAC object's `links` array. */
export interface StacLink {
  /** Relation type, e.g. `self`, `root`, `parent`, `child`, `item`, `items`, `data`, `next`. */
  rel: string;
  /** Target URL, possibly relative to the document it appears in. */
  href: string;
  /** Optional media type of the target. */
  type?: string;
  /** Optional human-readable title. */
  title?: string;
  /** HTTP method for the link (STAC API search uses `POST`). */
  method?: string;
  [key: string]: unknown;
}

/** A downloadable/renderable asset attached to an item or collection. */
export interface StacAsset {
  href: string;
  title?: string;
  description?: string;
  type?: string;
  roles?: string[];
  [key: string]: unknown;
}

/** Spatial/temporal extent of a collection. */
export interface StacExtent {
  spatial?: { bbox?: number[][] };
  temporal?: { interval?: (string | null)[][] };
}

/** The kind of STAC object a document represents. */
export type StacObjectType =
  | "Catalog"
  | "Collection"
  | "Item"
  | "ItemCollection"
  | "unknown";

/** A STAC Catalog or Collection (they share the same browsing shape). */
export interface StacCatalog {
  type?: string;
  stac_version?: string;
  id: string;
  title?: string;
  description?: string;
  links: StacLink[];
  extent?: StacExtent;
  license?: string;
  keywords?: string[];
  assets?: Record<string, StacAsset>;
  [key: string]: unknown;
}

/** A GeoJSON geometry, kept loose so any geometry type is accepted. */
export interface StacGeometry {
  type: string;
  coordinates?: unknown;
  geometries?: StacGeometry[];
  [key: string]: unknown;
}

/** A STAC Item (a GeoJSON Feature with STAC fields). */
export interface StacItem {
  type: "Feature";
  stac_version?: string;
  id: string;
  collection?: string;
  bbox?: number[];
  geometry: StacGeometry | null;
  properties: Record<string, unknown>;
  assets: Record<string, StacAsset>;
  links: StacLink[];
  [key: string]: unknown;
}

/** A STAC ItemCollection: a GeoJSON FeatureCollection of items. */
export interface StacItemCollection {
  type: "FeatureCollection";
  features: StacItem[];
  links?: StacLink[];
  [key: string]: unknown;
}

/** Any traversable STAC document. */
export type StacObject = StacCatalog | StacItem | StacItemCollection;

/**
 * A reference to a child catalog/collection discovered while browsing. The
 * embedded {@link stac} object is present when the child was returned inline (for
 * example from a STAC API `/collections` listing) so it need not be re-fetched.
 */
export interface StacChildRef {
  title: string;
  url: string;
  description?: string;
  type: StacObjectType;
  stac?: StacCatalog;
}

/**
 * One page of items plus an optional continuation. {@link next} resolves the
 * following page (whether that comes from a STAC API `next` link or the next
 * batch of static `item` links); it is `null` when there are no more items.
 */
export interface StacItemsPage {
  items: StacItem[];
  next: (() => Promise<StacItemsPage>) | null;
  /** Total matched count when the API reports it (`context`/`numberMatched`). */
  matched?: number;
}

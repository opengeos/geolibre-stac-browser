/**
 * Helpers for composing STAC API search requests.
 *
 * Kept DOM-free and pure so the request body can be unit-tested in isolation;
 * the browser UI collects the form values and hands them here.
 *
 * @see https://github.com/radiantearth/stac-api-spec/tree/main/item-search
 */

import type { Bounds } from "./geo";

/** Form values collected by the browser's search panel. */
export interface SearchParams {
  /** Collection ids to restrict the search to. */
  collections?: string[];
  /** Bounding box `[w, s, e, n]` to intersect. */
  bbox?: Bounds | null;
  /** Inclusive start date (`YYYY-MM-DD`). */
  dateStart?: string;
  /** Inclusive end date (`YYYY-MM-DD`). */
  dateEnd?: string;
  /** Maximum `eo:cloud_cover` percentage. */
  cloudCover?: number | null;
  /** Page size. */
  limit?: number;
}

/**
 * Build a STAC API `/search` request body from form values. Empty fields are
 * omitted so the search stays as broad as the user left it.
 *
 * @param params - The collected search form values.
 * @returns A request body suitable for {@link StacClient.search}.
 */
export function buildSearchBody(params: SearchParams): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  const collections = (params.collections ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  if (collections.length > 0) body.collections = collections;

  if (params.bbox) body.bbox = params.bbox;

  const datetime = buildDatetime(params.dateStart, params.dateEnd);
  if (datetime) body.datetime = datetime;

  if (params.cloudCover != null && Number.isFinite(params.cloudCover)) {
    // STAC API "query" extension; widely supported (Planetary Computer, Earth
    // Search). Hosts without it simply ignore or reject the field.
    body.query = { "eo:cloud_cover": { lte: params.cloudCover } };
  }

  body.limit = params.limit && params.limit > 0 ? params.limit : 20;
  return body;
}

/**
 * Compose a STAC datetime interval from inclusive date strings. Supports
 * open-ended ranges (`start/..` or `../end`).
 *
 * @param start - Inclusive start date (`YYYY-MM-DD`), if any.
 * @param end - Inclusive end date (`YYYY-MM-DD`), if any.
 * @returns A STAC datetime string, or `null` when both are empty.
 */
export function buildDatetime(
  start?: string,
  end?: string,
): string | null {
  const s = start?.trim() ? `${start.trim()}T00:00:00Z` : null;
  const e = end?.trim() ? `${end.trim()}T23:59:59Z` : null;
  if (s && e) return `${s}/${e}`;
  if (s) return `${s}/..`;
  if (e) return `../${e}`;
  return null;
}

/**
 * A small, DOM-free STAC client.
 *
 * Everything here operates on plain data and `fetch`, with no MapLibre or DOM
 * dependencies, so the traversal logic can be unit-tested in isolation and
 * reused by any UI. The browser UI in {@link ./browser} layers presentation on
 * top of these primitives.
 */

import type {
  StacCatalog,
  StacChildRef,
  StacItem,
  StacItemsPage,
  StacLink,
  StacObject,
  StacObjectType,
} from "./types";

/** Number of static `item` links to resolve per page. */
const ITEM_LINK_PAGE_SIZE = 20;

/**
 * Resolve a (possibly relative) href against a base URL.
 *
 * @param base - The URL of the document the href was found in.
 * @param href - The link target, absolute or relative.
 * @returns An absolute URL string (falls back to `href` if resolution fails).
 */
export function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/**
 * Classify a parsed STAC document.
 *
 * @param obj - The parsed JSON document.
 * @returns The STAC object type, or `"unknown"` when it cannot be determined.
 */
export function classifyStac(obj: unknown): StacObjectType {
  if (!obj || typeof obj !== "object") return "unknown";
  const record = obj as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : undefined;

  if (type === "Feature") return "Item";
  if (type === "FeatureCollection") return "ItemCollection";
  if (type === "Collection") return "Collection";
  if (type === "Catalog") return "Catalog";

  // Fall back to structural hints for documents missing `type`.
  if ("extent" in record || "license" in record) return "Collection";
  if (Array.isArray(record.links)) return "Catalog";
  return "unknown";
}

/** Read the `links` array from any STAC document. */
function linksOf(obj: unknown): StacLink[] {
  if (obj && typeof obj === "object" && Array.isArray((obj as StacObject).links)) {
    return (obj as StacObject).links as StacLink[];
  }
  return [];
}

/**
 * Find all links with the given relation type (case-insensitive).
 *
 * @param obj - A STAC document.
 * @param rel - The relation type to match (for example `"child"`).
 * @returns The matching links, in document order.
 */
export function getLinks(obj: unknown, rel: string): StacLink[] {
  const target = rel.toLowerCase();
  return linksOf(obj).filter((link) => link.rel?.toLowerCase() === target);
}

/** Find the first link with the given relation type, or `undefined`. */
export function getLink(obj: unknown, rel: string): StacLink | undefined {
  return getLinks(obj, rel)[0];
}

/**
 * Best-effort title for a STAC document: `title`, then `id`, then a fallback.
 *
 * @param obj - A STAC document.
 * @param fallback - Value to use when neither title nor id is present.
 */
export function stacTitle(obj: unknown, fallback = "Untitled"): string {
  if (obj && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    if (typeof record.title === "string" && record.title.trim()) return record.title;
    if (typeof record.id === "string" && record.id.trim()) return record.id;
  }
  return fallback;
}

/** Resolve a document's own URL from its `self` link, falling back to `base`. */
export function selfUrl(obj: unknown, base?: string): string | undefined {
  const self = getLink(obj, "self");
  if (self?.href) return base ? resolveUrl(base, self.href) : self.href;
  return base;
}

/**
 * Derive a readable label from a URL when a `child` link carries no title:
 * the last meaningful path segment (e.g. a collection id), or the host.
 *
 * @param url - An absolute or relative URL.
 * @returns A best-effort human-readable label.
 */
export function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://placeholder.invalid");
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && !/^(catalog|collection)\.json$/i.test(last)) {
      return decodeURIComponent(last.replace(/\.json$/i, ""));
    }
    // `.../<id>/catalog.json` style: use the parent segment.
    const parent = segments[segments.length - 2];
    if (parent) return decodeURIComponent(parent);
    return parsed.hostname || url;
  } catch {
    return url;
  }
}

/** Thrown when a STAC document cannot be fetched or parsed. */
export class StacError extends Error {}

/**
 * Fetches and traverses STAC catalogs, collections, and items.
 */
export class StacClient {
  private readonly fetchImpl: typeof fetch;

  /**
   * @param fetchImpl - Optional `fetch` implementation (injectable for tests).
   */
  constructor(fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)) {
    this.fetchImpl = fetchImpl;
  }

  /**
   * Fetch and parse a STAC document.
   *
   * @param url - Absolute URL of the document.
   * @param init - Optional `fetch` init (used for STAC API `POST` search).
   * @returns The parsed JSON document.
   * @throws {StacError} When the request fails or the body is not JSON.
   */
  async fetchJson<T = StacObject>(url: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        headers: { Accept: "application/json" },
        ...init,
      });
    } catch (error) {
      throw new StacError(
        `Network error fetching ${url}: ${(error as Error).message}`,
      );
    }
    if (!response.ok) {
      throw new StacError(`Request failed (${response.status}) for ${url}`);
    }
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new StacError(
        `Invalid JSON from ${url}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Resolve the child catalogs and collections of a node.
   *
   * Uses `child` links when present (static catalogs). Otherwise, for a STAC API
   * root, follows the `data` link to the `/collections` listing and returns each
   * collection inline so it need not be re-fetched.
   *
   * @param node - The parsed catalog/collection document.
   * @param baseUrl - The URL the node was fetched from (for relative links).
   * @returns Child references in display order.
   */
  async getChildren(node: StacObject, baseUrl: string): Promise<StacChildRef[]> {
    const childLinks = getLinks(node, "child");
    if (childLinks.length > 0) {
      return childLinks.map((link) => {
        const url = resolveUrl(baseUrl, link.href);
        return {
          title: link.title?.trim() || titleFromUrl(url),
          url,
          type: "unknown" as StacObjectType,
        };
      });
    }

    const dataLink = getLink(node, "data");
    if (dataLink) {
      const listing = await this.fetchJson<{ collections?: StacCatalog[] }>(
        resolveUrl(baseUrl, dataLink.href),
      );
      const collections = listing.collections ?? [];
      return collections.map((collection) => ({
        title: stacTitle(collection, collection.id),
        description: collection.description,
        type: "Collection" as StacObjectType,
        url:
          selfUrl(collection, baseUrl) ??
          resolveUrl(baseUrl, `collections/${collection.id}`),
        stac: collection,
      }));
    }

    return [];
  }

  /**
   * Load the first page of items for a node.
   *
   * Prefers an `items` link (a STAC API items endpoint returning an
   * ItemCollection with `next` paging). Falls back to resolving individual
   * `item` links in batches for static catalogs.
   *
   * @param node - The parsed catalog/collection document.
   * @param baseUrl - The URL the node was fetched from (for relative links).
   * @returns The first {@link StacItemsPage}.
   */
  async loadItems(node: StacObject, baseUrl: string): Promise<StacItemsPage> {
    const itemsLink = getLink(node, "items");
    if (itemsLink) {
      return this.loadItemCollection(resolveUrl(baseUrl, itemsLink.href));
    }

    const itemLinks = getLinks(node, "item").map((link) =>
      resolveUrl(baseUrl, link.href),
    );
    return this.loadItemLinkBatch(itemLinks, 0);
  }

  /**
   * Run a STAC API search (`POST` to a `/search` endpoint).
   *
   * @param searchUrl - The absolute search endpoint URL.
   * @param body - The search request body (collections, bbox, datetime, limit, ...).
   * @returns The first {@link StacItemsPage} of results.
   */
  async search(
    searchUrl: string,
    body: Record<string, unknown>,
  ): Promise<StacItemsPage> {
    return this.loadItemCollection(searchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  }

  /** Load one ItemCollection page and wire its `next` link, if any. */
  private async loadItemCollection(
    url: string,
    init?: RequestInit,
  ): Promise<StacItemsPage> {
    const collection = await this.fetchJson<{
      features?: StacItem[];
      links?: StacLink[];
      context?: { matched?: number };
      numberMatched?: number;
    }>(url, init);

    const items = collection.features ?? [];
    const matched = collection.context?.matched ?? collection.numberMatched;

    const nextLink = getLink(collection, "next");
    let next: StacItemsPage["next"] = null;
    if (nextLink?.href) {
      const nextUrl = resolveUrl(url, nextLink.href);
      // GET-style paging carries the cursor in the href; POST-style paging
      // (STAC API search) carries the next body and reuses the same endpoint.
      if (nextLink.method?.toUpperCase() === "POST") {
        const nextBody = (nextLink.body as Record<string, unknown>) ?? {};
        next = () =>
          this.loadItemCollection(nextUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(nextBody),
          });
      } else {
        next = () => this.loadItemCollection(nextUrl);
      }
    }

    return { items, next, matched };
  }

  /** Resolve a batch of static `item` links and wire client-side paging. */
  private async loadItemLinkBatch(
    links: string[],
    offset: number,
  ): Promise<StacItemsPage> {
    const slice = links.slice(offset, offset + ITEM_LINK_PAGE_SIZE);
    const resolved = await Promise.all(
      slice.map((url) =>
        this.fetchJson<StacItem>(url).catch(() => null),
      ),
    );
    const items = resolved.filter((item): item is StacItem => item !== null);

    const nextOffset = offset + ITEM_LINK_PAGE_SIZE;
    const next =
      nextOffset < links.length
        ? () => this.loadItemLinkBatch(links, nextOffset)
        : null;

    return { items, next, matched: links.length };
  }
}

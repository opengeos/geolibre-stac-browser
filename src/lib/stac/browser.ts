/**
 * The STAC Browser UI.
 *
 * A self-contained, framework-free widget that lets a user point at a STAC
 * catalog or API and drill down through catalogs, collections, and items,
 * inspired by https://radiantearth.github.io/stac-browser/. It renders into any
 * container element and drives the map through an injected {@link StacMapBridge},
 * so it works inside a GeoLibre panel or standalone next to a map.
 */

import {
  StacClient,
  StacError,
  classifyStac,
  getLink,
  getLinks,
  resolveUrl,
  selfUrl,
  stacTitle,
} from "./client";
import { DEFAULT_CATALOGS, type StacCatalogPreset } from "./catalogs";
import { clear, defRow, el } from "./dom";
import { buildSearchBody, type SearchParams } from "./search";
import {
  boundsOfCollection,
  boundsOfItems,
  itemToFootprint,
  itemsToFootprints,
  normalizeBbox,
} from "./geo";
import { NOOP_MAP_BRIDGE, type StacMapBridge } from "./map-bridge";
import type {
  StacAsset,
  StacChildRef,
  StacItem,
  StacItemsPage,
  StacObject,
  StacObjectType,
} from "./types";

/** Options for constructing a {@link StacBrowser}. */
export interface StacBrowserOptions {
  /** STAC client (injectable for tests); defaults to a `fetch`-backed client. */
  client?: StacClient;
  /** Map bridge for footprints/preview/framing; defaults to a no-op. */
  map?: StacMapBridge;
  /** Catalogs offered in the quick-pick dropdown. */
  presets?: StacCatalogPreset[];
  /** Catalog URL to load on mount. */
  initialUrl?: string;
  /** Notified when the displayed title changes (e.g. to update panel chrome). */
  onTitleChange?: (title: string) => void;
}

/** A single level in the browser's navigation path. */
interface NavLevel {
  title: string;
  url: string;
  type: StacObjectType;
  /** The loaded document, cached once fetched. */
  node?: StacObject;
}

// Asset keys/roles that commonly hold a publicly viewable preview image.
const PREVIEW_ROLES = new Set(["thumbnail", "overview"]);
const PREVIEW_KEYS = ["rendered_preview", "thumbnail", "preview"];

/**
 * Interactive STAC catalog browser. Call {@link mount} to render it, then
 * {@link loadCatalog} (or set `initialUrl`) to point it at a catalog.
 */
export class StacBrowser {
  private readonly client: StacClient;
  private readonly map: StacMapBridge;
  private readonly presets: StacCatalogPreset[];
  private readonly onTitleChange?: (title: string) => void;

  private urlInput!: HTMLInputElement;
  private breadcrumbs!: HTMLElement;
  private statusBar!: HTMLElement;
  private bodyEl!: HTMLElement;

  private nav: NavLevel[] = [];
  private items: StacItem[] = [];
  private itemsPage: StacItemsPage | null = null;
  /** STAC API `/search` endpoint discovered while browsing, if any. */
  private searchLink: string | null = null;
  /** Whether the search form is expanded. */
  private searchOpen = false;
  /** Monotonic token so a slow fetch cannot overwrite a newer navigation. */
  private loadSeq = 0;

  constructor(options: StacBrowserOptions = {}) {
    this.client = options.client ?? new StacClient();
    this.map = options.map ?? NOOP_MAP_BRIDGE;
    this.presets = options.presets ?? DEFAULT_CATALOGS;
    this.onTitleChange = options.onTitleChange;
    this.pendingInitialUrl = options.initialUrl ?? null;
  }

  private pendingInitialUrl: string | null;

  /**
   * Build the browser's DOM inside a container.
   *
   * @param container - The element to render into (its contents are replaced).
   */
  mount(container: HTMLElement): void {
    clear(container);
    container.classList.add("stac-browser");

    container.append(
      this.buildToolbar(),
      (this.breadcrumbs = el("nav", { className: "stac-breadcrumbs" })),
      (this.statusBar = el("div", { className: "stac-status" })),
      (this.bodyEl = el("div", { className: "stac-body" })),
    );

    this.renderEmptyState();

    if (this.pendingInitialUrl) {
      const url = this.pendingInitialUrl;
      this.pendingInitialUrl = null;
      void this.loadCatalog(url);
    }
  }

  /**
   * Load a catalog or API root URL and reset navigation to it.
   *
   * @param url - The catalog/API root URL.
   */
  async loadCatalog(url: string): Promise<void> {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (this.urlInput) this.urlInput.value = trimmed;
    this.map.clear();
    this.searchLink = null;
    this.searchOpen = false;
    this.nav = [{ title: trimmed, url: trimmed, type: "unknown" }];
    await this.openLevel(0);
  }

  /** Remove the browser's footprints, selection, and preview from the map. */
  clearMap(): void {
    this.map.clear();
  }

  /** Tear down map side effects (call when the panel closes). */
  destroy(): void {
    this.loadSeq += 1;
    this.map.clear();
  }

  // --- toolbar -------------------------------------------------------------

  private buildToolbar(): HTMLElement {
    const toolbar = el("div", { className: "stac-toolbar" });

    const select = el("select", {
      className: "stac-preset-select",
      title: "Choose a known STAC catalog",
    }) as HTMLSelectElement;
    select.append(
      el("option", { text: "Choose a catalog…", attrs: { value: "" } }),
    );
    for (const preset of this.presets) {
      select.append(el("option", { text: preset.name, attrs: { value: preset.url } }));
    }
    select.addEventListener("change", () => {
      if (select.value) void this.loadCatalog(select.value);
      select.selectedIndex = 0;
    });

    const row = el("div", { className: "stac-url-row" });
    this.urlInput = el("input", {
      className: "stac-url-input",
      attrs: { type: "url", placeholder: "https://… STAC catalog or API URL" },
    }) as HTMLInputElement;
    this.urlInput.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        void this.loadCatalog(this.urlInput.value);
      }
    });
    const loadBtn = el("button", {
      className: "stac-btn stac-btn-primary",
      text: "Load",
      onClick: () => void this.loadCatalog(this.urlInput.value),
    });
    row.append(this.urlInput, loadBtn);

    toolbar.append(select, row);
    return toolbar;
  }

  // --- navigation ----------------------------------------------------------

  /** Open the navigation level at `index`, loading its document if needed. */
  private async openLevel(index: number): Promise<void> {
    const seq = ++this.loadSeq;
    const level = this.nav[index];
    if (!level) return;

    this.nav = this.nav.slice(0, index + 1);
    this.items = [];
    this.itemsPage = null;
    this.searchOpen = false;
    this.renderBreadcrumbs();
    this.setStatus(`Loading ${level.title}…`, "loading");

    try {
      if (!level.node) {
        level.node = await this.client.fetchJson<StacObject>(level.url);
        if (seq !== this.loadSeq) return;
        const type = classifyStac(level.node);
        level.type = type;
        if (type === "Catalog" || type === "Collection") {
          level.title = stacTitle(level.node, level.title);
        }
      }
      if (seq !== this.loadSeq) return;
      // Remember a STAC API search endpoint when present. Root search links
      // stay valid as the user drills down, so we never clear a found link.
      const base = selfUrl(level.node, level.url) ?? level.url;
      const searchLink = getLink(level.node, "search");
      if (searchLink?.href) {
        this.searchLink = resolveUrl(base, searchLink.href);
      }
      this.renderBreadcrumbs();
      this.onTitleChange?.(level.title);
      await this.renderNode(level, seq);
      if (seq === this.loadSeq) this.clearStatus();
    } catch (error) {
      if (seq !== this.loadSeq) return;
      this.setStatus(
        error instanceof StacError ? error.message : String(error),
        "error",
      );
    }
  }

  /** Navigate into a child catalog/collection reference. */
  private async navigateInto(ref: StacChildRef): Promise<void> {
    this.nav.push({
      title: ref.title,
      url: ref.url,
      type: ref.type,
      node: ref.stac,
    });
    await this.openLevel(this.nav.length - 1);
  }

  // --- rendering: node (catalog/collection) --------------------------------

  /** Render the current node: its metadata, children, and items. */
  private async renderNode(level: NavLevel, seq: number): Promise<void> {
    const node = level.node!;
    const base = selfUrl(node, level.url) ?? level.url;
    clear(this.bodyEl);

    this.bodyEl.append(this.buildNodeHeader(node, level));

    // Search (STAC API only): a collapsible form that queries the discovered
    // /search endpoint by collection, bbox, date range, and cloud cover.
    if (this.searchLink) {
      this.bodyEl.append(this.buildSearchSection(level));
    }

    // Child catalogs / collections.
    let children: StacChildRef[] = [];
    try {
      children = await this.client.getChildren(node, base);
    } catch {
      // A failed collections listing should not block item rendering.
    }
    if (seq !== this.loadSeq) return;
    if (children.length > 0) {
      this.bodyEl.append(this.buildChildList(children));
    }

    // Items (collections and item-bearing catalogs).
    const hasItems = getLink(node, "items") || getLinks(node, "item").length > 0;
    if (hasItems) {
      const itemsSection = el("div", { className: "stac-section" });
      itemsSection.append(el("h3", { className: "stac-section-title", text: "Items" }));
      const list = el("div", { className: "stac-item-list" });
      itemsSection.append(list, this.buildLoadMore(list));
      this.bodyEl.append(itemsSection);
      await this.loadFirstItems(node, base, list, seq);
    } else if (children.length === 0) {
      this.bodyEl.append(
        el("p", {
          className: "stac-empty",
          text: "This node has no child catalogs, collections, or items.",
        }),
      );
    }

    // Frame the map to the node's extent if we know it.
    const collectionBounds =
      level.type === "Collection" ? boundsOfCollection(node as never) : null;
    if (collectionBounds) this.map.fitBounds(collectionBounds);
  }

  private buildNodeHeader(node: StacObject, level: NavLevel): HTMLElement {
    const header = el("div", { className: "stac-node-header" });
    header.append(
      el("h2", { className: "stac-node-title", text: level.title }),
    );

    const typeBadge = level.type !== "unknown" ? level.type : "Catalog";
    header.append(el("span", { className: "stac-badge", text: typeBadge }));

    const description = (node as { description?: string }).description;
    if (description) {
      header.append(
        el("p", { className: "stac-node-desc", text: truncate(description, 400) }),
      );
    }

    const keywords = (node as { keywords?: string[] }).keywords;
    if (Array.isArray(keywords) && keywords.length > 0) {
      const tags = el("div", { className: "stac-keywords" });
      for (const keyword of keywords.slice(0, 12)) {
        tags.append(el("span", { className: "stac-keyword", text: keyword }));
      }
      header.append(tags);
    }
    return header;
  }

  private buildChildList(children: StacChildRef[]): HTMLElement {
    const section = el("div", { className: "stac-section" });
    section.append(
      el("h3", {
        className: "stac-section-title",
        text: `Catalogs & Collections (${children.length})`,
      }),
    );
    const list = el("div", { className: "stac-child-list" });
    for (const child of children) {
      const row = el("button", {
        className: "stac-child",
        onClick: () => void this.navigateInto(child),
      });
      row.append(el("span", { className: "stac-child-title", text: child.title }));
      if (child.description) {
        row.append(
          el("span", {
            className: "stac-child-desc",
            text: truncate(child.description, 120),
          }),
        );
      }
      list.append(row);
    }
    section.append(list);
    return section;
  }

  // --- search --------------------------------------------------------------

  /** Build the collapsible STAC API search form for the current node. */
  private buildSearchSection(level: NavLevel): HTMLElement {
    const section = el("div", { className: "stac-section stac-search" });

    const toggle = el("button", {
      className: "stac-btn stac-search-toggle",
      text: this.searchOpen ? "▾ Search items" : "▸ Search items",
    });
    section.append(toggle);

    const form = el("div", { className: "stac-search-form" });
    form.style.display = this.searchOpen ? "" : "none";
    toggle.addEventListener("click", () => {
      this.searchOpen = !this.searchOpen;
      form.style.display = this.searchOpen ? "" : "none";
      toggle.textContent = this.searchOpen ? "▾ Search items" : "▸ Search items";
    });

    // Default the collections field to the current collection, if any.
    const defaultCollection =
      level.type === "Collection"
        ? String((level.node as { id?: string }).id ?? "")
        : "";
    const collections = this.field(form, "Collections (comma-separated)", "text");
    collections.value = defaultCollection;
    collections.placeholder = "e.g. sentinel-2-l2a";

    // Bounding box.
    const bboxRow = el("div", { className: "stac-search-bbox" });
    const west = this.numField(bboxRow, "W");
    const south = this.numField(bboxRow, "S");
    const east = this.numField(bboxRow, "E");
    const north = this.numField(bboxRow, "N");
    form.append(this.labelled("Bounding box", bboxRow));
    const useView = el("button", {
      className: "stac-btn stac-search-useview",
      text: "Use current map view",
      onClick: () => {
        const view = this.map.getViewBounds();
        if (!view) return;
        west.value = view[0].toFixed(4);
        south.value = view[1].toFixed(4);
        east.value = view[2].toFixed(4);
        north.value = view[3].toFixed(4);
      },
    });
    form.append(useView);

    // Date range.
    const dateRow = el("div", { className: "stac-search-dates" });
    const dateStart = this.dateField(dateRow, "From");
    const dateEnd = this.dateField(dateRow, "To");
    form.append(this.labelled("Date range", dateRow));

    // Cloud cover + limit.
    const cloud = this.field(form, "Max cloud cover (%)", "number");
    cloud.placeholder = "e.g. 20";
    const limit = this.field(form, "Limit", "number");
    limit.value = "20";

    const status = el("div", { className: "stac-search-status" });
    const submit = el("button", {
      className: "stac-btn stac-btn-primary stac-search-submit",
      text: "Search",
      onClick: () => {
        const params: SearchParams = {
          collections: collections.value
            ? collections.value.split(",")
            : undefined,
          bbox: readBbox(west, south, east, north),
          dateStart: dateStart.value || undefined,
          dateEnd: dateEnd.value || undefined,
          cloudCover: cloud.value !== "" ? Number(cloud.value) : null,
          limit: limit.value ? Number(limit.value) : 20,
        };
        void this.runSearch(params, status);
      },
    });
    form.append(submit, status);

    section.append(form);
    return section;
  }

  /** Execute a search and render its results. */
  private async runSearch(
    params: SearchParams,
    status: HTMLElement,
  ): Promise<void> {
    if (!this.searchLink) return;
    const seq = ++this.loadSeq;
    status.className = "stac-search-status stac-status-loading";
    status.textContent = "Searching…";
    try {
      const page = await this.client.search(
        this.searchLink,
        buildSearchBody(params),
      );
      if (seq !== this.loadSeq) return;
      status.textContent = "";
      this.showSearchResults(page);
    } catch (error) {
      if (seq !== this.loadSeq) return;
      status.className = "stac-search-status stac-status-error";
      status.textContent =
        error instanceof StacError ? error.message : String(error);
    }
  }

  /** Replace the body with a search-results item list. */
  private showSearchResults(page: StacItemsPage): void {
    const backIndex = this.nav.length - 1;
    this.items = [];
    this.itemsPage = page;
    clear(this.bodyEl);

    this.bodyEl.append(
      el("button", {
        className: "stac-back",
        text: "← Back to browse",
        onClick: () => {
          this.map.clear();
          void this.openLevel(backIndex);
        },
      }),
    );

    const section = el("div", { className: "stac-section" });
    const matched =
      page.matched != null ? ` · ${page.matched} matched` : "";
    section.append(
      el("h3", {
        className: "stac-section-title",
        text: `Search results${matched}`,
      }),
    );
    const list = el("div", { className: "stac-item-list" });
    section.append(list, this.buildLoadMore(list));
    this.bodyEl.append(section);

    this.appendItems(page.items, list);
    this.refreshFootprints(true);
    this.updateLoadMore(list);
  }

  /** Create a labelled input and append it to `parent`. */
  private field(
    parent: HTMLElement,
    label: string,
    type: string,
  ): HTMLInputElement {
    const input = el("input", {
      className: "stac-search-input",
      attrs: { type },
    }) as HTMLInputElement;
    parent.append(this.labelled(label, input));
    return input;
  }

  /** Create a small numeric input (used for bbox corners). */
  private numField(parent: HTMLElement, placeholder: string): HTMLInputElement {
    const input = el("input", {
      className: "stac-search-num",
      attrs: { type: "number", step: "any", placeholder },
    }) as HTMLInputElement;
    parent.append(input);
    return input;
  }

  /** Create a date input within a row. */
  private dateField(parent: HTMLElement, label: string): HTMLInputElement {
    const input = el("input", {
      className: "stac-search-date",
      attrs: { type: "date", "aria-label": label },
    }) as HTMLInputElement;
    parent.append(input);
    return input;
  }

  /** Wrap a control with a label. */
  private labelled(label: string, control: HTMLElement): HTMLElement {
    const wrap = el("label", { className: "stac-search-field" });
    wrap.append(el("span", { className: "stac-search-label", text: label }), control);
    return wrap;
  }

  // --- rendering: items ----------------------------------------------------

  private async loadFirstItems(
    node: StacObject,
    base: string,
    list: HTMLElement,
    seq: number,
  ): Promise<void> {
    try {
      this.itemsPage = await this.client.loadItems(node, base);
    } catch (error) {
      if (seq === this.loadSeq) {
        list.append(
          el("p", {
            className: "stac-empty",
            text: error instanceof StacError ? error.message : String(error),
          }),
        );
      }
      return;
    }
    if (seq !== this.loadSeq) return;
    this.appendItems(this.itemsPage.items, list);
    this.refreshFootprints(true);
    this.updateLoadMore(list);
  }

  /** Append item rows to the list and accumulate them. */
  private appendItems(items: StacItem[], list: HTMLElement): void {
    for (const item of items) {
      this.items.push(item);
      list.append(this.buildItemRow(item));
    }
    if (this.items.length === 0) {
      list.append(el("p", { className: "stac-empty", text: "No items found." }));
    }
  }

  private buildItemRow(item: StacItem): HTMLElement {
    const row = el("button", {
      className: "stac-item",
      attrs: { "data-item-id": item.id },
      onClick: () => this.selectItem(item),
    });
    const thumb = previewAsset(item.assets);
    if (thumb) {
      const img = el("img", {
        className: "stac-item-thumb",
        attrs: { src: thumb.href, alt: "", loading: "lazy" },
      });
      img.addEventListener("error", () => img.remove());
      row.append(img);
    }
    const meta = el("div", { className: "stac-item-meta" });
    meta.append(el("span", { className: "stac-item-id", text: item.id }));
    const datetime = item.properties?.datetime;
    if (typeof datetime === "string") {
      meta.append(
        el("span", { className: "stac-item-date", text: formatDate(datetime) }),
      );
    }
    row.append(meta);
    return row;
  }

  private buildLoadMore(list: HTMLElement): HTMLElement {
    const wrap = el("div", { className: "stac-load-more-wrap" });
    const button = el("button", {
      className: "stac-btn stac-load-more",
      text: "Load more items",
      onClick: () => void this.loadMoreItems(list, button),
    });
    button.style.display = "none";
    wrap.append(button);
    return wrap;
  }

  private updateLoadMore(list: HTMLElement): void {
    const wrap = list.parentElement?.querySelector<HTMLElement>(
      ".stac-load-more-wrap",
    );
    const button = wrap?.querySelector<HTMLElement>(".stac-load-more");
    if (button) button.style.display = this.itemsPage?.next ? "" : "none";
  }

  private async loadMoreItems(
    list: HTMLElement,
    button: HTMLElement,
  ): Promise<void> {
    if (!this.itemsPage?.next) return;
    const seq = this.loadSeq;
    button.setAttribute("disabled", "true");
    button.textContent = "Loading…";
    try {
      const page = await this.itemsPage.next();
      if (seq !== this.loadSeq) return;
      this.itemsPage = page;
      this.appendItems(page.items, list);
      this.refreshFootprints(false);
    } finally {
      if (seq === this.loadSeq) {
        button.removeAttribute("disabled");
        button.textContent = "Load more items";
        this.updateLoadMore(list);
      }
    }
  }

  /** Push the current footprints to the map; optionally frame to them. */
  private refreshFootprints(fit: boolean): void {
    const footprints = itemsToFootprints(this.items);
    this.map.showFootprints(footprints);
    if (fit) {
      const bounds = boundsOfItems(this.items);
      if (bounds) this.map.fitBounds(bounds);
    }
  }

  // --- rendering: item detail ---------------------------------------------

  /** Show a single item's detail view and highlight it on the map. */
  private selectItem(item: StacItem): void {
    const footprint = itemToFootprint(item);
    this.map.showSelected(footprint);
    const bounds =
      normalizeBbox(item.bbox) ?? (footprint ? boundsOfItems([item]) : null);
    if (bounds) this.map.fitBounds(bounds);

    clear(this.bodyEl);
    this.bodyEl.append(this.buildItemDetail(item));
    this.bodyEl.scrollTop = 0;
  }

  private buildItemDetail(item: StacItem): HTMLElement {
    const wrap = el("div", { className: "stac-detail" });

    wrap.append(
      el("button", {
        className: "stac-back",
        text: "← Back to items",
        onClick: () => {
          this.map.showSelected(null);
          this.map.clearPreview();
          void this.openLevel(this.nav.length - 1);
        },
      }),
    );

    wrap.append(el("h2", { className: "stac-node-title", text: item.id }));
    if (item.collection) {
      wrap.append(
        el("span", { className: "stac-badge", text: `Item · ${item.collection}` }),
      );
    }

    // Map actions: frame the item and preview a thumbnail over its footprint.
    const actions = el("div", { className: "stac-detail-actions" });
    const bounds = normalizeBbox(item.bbox) ?? boundsOfItems([item]);
    if (bounds) {
      actions.append(
        el("button", {
          className: "stac-btn",
          text: "Zoom to footprint",
          onClick: () => this.map.fitBounds(bounds),
        }),
      );

      // Full-resolution COG rendering when the host supports it, otherwise a
      // lightweight thumbnail image overlay.
      const cog = cogAsset(item.assets);
      const preview = previewAsset(item.assets);
      if (cog && this.map.canShowCog()) {
        actions.append(
          el("button", {
            className: "stac-btn stac-btn-primary",
            text: "View on map",
            title: cog.title || "Render this Cloud Optimized GeoTIFF",
            onClick: () => {
              this.map.showCog(cog.href, item.id);
              this.map.fitBounds(bounds);
            },
          }),
        );
      } else if (preview) {
        actions.append(
          el("button", {
            className: "stac-btn",
            text: "Preview on map",
            onClick: () => {
              this.map.showPreview(preview.href, bounds);
              this.map.fitBounds(bounds);
            },
          }),
        );
      }

      if (cog || preview) {
        actions.append(
          el("button", {
            className: "stac-btn",
            text: "Clear preview",
            onClick: () => this.map.clearPreview(),
          }),
        );
      }
    }
    wrap.append(actions);

    // Properties.
    const props = this.buildProperties(item);
    if (props) wrap.append(props);

    // Assets.
    wrap.append(this.buildAssets(item));

    return wrap;
  }

  private buildProperties(item: StacItem): HTMLElement | null {
    const entries = Object.entries(item.properties ?? {}).filter(
      ([, value]) =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean",
    );
    if (entries.length === 0) return null;

    const section = el("div", { className: "stac-section" });
    section.append(el("h3", { className: "stac-section-title", text: "Properties" }));
    const dl = el("div", { className: "stac-def-list" });
    for (const [key, value] of entries.slice(0, 40)) {
      const display =
        key === "datetime" && typeof value === "string"
          ? formatDate(value)
          : String(value);
      dl.append(defRow(key, display));
    }
    section.append(dl);
    return section;
  }

  private buildAssets(item: StacItem): HTMLElement {
    const assets = Object.entries(item.assets ?? {});
    const section = el("div", { className: "stac-section" });
    section.append(
      el("h3", {
        className: "stac-section-title",
        text: `Assets (${assets.length})`,
      }),
    );
    const list = el("div", { className: "stac-asset-list" });
    for (const [key, asset] of assets) {
      const row = el("div", { className: "stac-asset" });
      const main = el("div", { className: "stac-asset-main" });
      main.append(
        el("span", { className: "stac-asset-title", text: asset.title || key }),
      );
      const meta: string[] = [];
      if (asset.type) meta.push(shortMediaType(asset.type));
      if (asset.roles?.length) meta.push(asset.roles.join(", "));
      if (meta.length) {
        main.append(el("span", { className: "stac-asset-meta", text: meta.join(" · ") }));
      }
      row.append(main);
      row.append(
        el("a", {
          className: "stac-asset-link",
          text: "Open",
          attrs: { href: asset.href, target: "_blank", rel: "noopener noreferrer" },
        }),
      );
      list.append(row);
    }
    section.append(list);
    return section;
  }

  // --- breadcrumbs, status, empty state ------------------------------------

  private renderBreadcrumbs(): void {
    clear(this.breadcrumbs);
    this.nav.forEach((level, index) => {
      if (index > 0) {
        this.breadcrumbs.append(el("span", { className: "stac-crumb-sep", text: "›" }));
      }
      const isLast = index === this.nav.length - 1;
      this.breadcrumbs.append(
        el("button", {
          className: `stac-crumb${isLast ? " stac-crumb-current" : ""}`,
          text: truncate(level.title, 28),
          title: level.title,
          onClick: isLast ? undefined : () => void this.openLevel(index),
        }),
      );
    });
  }

  private setStatus(message: string, kind: "loading" | "error"): void {
    this.statusBar.className = `stac-status stac-status-${kind}`;
    this.statusBar.textContent = message;
  }

  private clearStatus(): void {
    this.statusBar.className = "stac-status";
    this.statusBar.textContent = "";
  }

  private renderEmptyState(): void {
    clear(this.bodyEl);
    this.bodyEl.append(
      el("div", {
        className: "stac-empty-state",
        html:
          "<p>Choose a catalog above or paste a STAC catalog/API URL to start " +
          "browsing.</p><p class='stac-empty-hint'>Drill into collections, list " +
          "items, view their assets, and see footprints on the map.</p>",
      }),
    );
  }
}

// --- module-local helpers --------------------------------------------------

/** Pick a publicly viewable preview image asset, if any. */
function previewAsset(
  assets: Record<string, StacAsset> | undefined,
): StacAsset | null {
  if (!assets) return null;
  for (const key of PREVIEW_KEYS) {
    if (assets[key]?.href) return assets[key];
  }
  for (const asset of Object.values(assets)) {
    const roles = asset.roles ?? [];
    if (
      asset.href &&
      (roles.some((role) => PREVIEW_ROLES.has(role)) ||
        (asset.type?.startsWith("image/") && asset.type !== "image/tiff"))
    ) {
      return asset;
    }
  }
  return null;
}

/**
 * Pick the best COG asset to render: a `visual` RGB composite if present,
 * otherwise the first GeoTIFF asset tagged as data.
 */
function cogAsset(
  assets: Record<string, StacAsset> | undefined,
): StacAsset | null {
  if (!assets) return null;
  if (isCog(assets.visual)) return assets.visual;
  for (const asset of Object.values(assets)) {
    if (isCog(asset)) return asset;
  }
  return null;
}

/** Whether an asset looks like a (Cloud Optimized) GeoTIFF. */
function isCog(asset: StacAsset | undefined): asset is StacAsset {
  if (!asset?.href) return false;
  const type = asset.type?.toLowerCase() ?? "";
  if (type.includes("geotiff") || type.includes("image/tiff")) return true;
  return /\.tiff?($|\?)/i.test(asset.href);
}

/** Shorten an ISO datetime to a readable date for compact display. */
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace("T", " ") + "Z";
}

/** Trim noisy media-type strings (drop profile/codec parameters). */
function shortMediaType(type: string): string {
  return type.split(";")[0].trim();
}

/** Truncate a string to a maximum length with an ellipsis. */
function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Read a bbox from four corner inputs, or `null` when any is blank/invalid. */
function readBbox(
  west: HTMLInputElement,
  south: HTMLInputElement,
  east: HTMLInputElement,
  north: HTMLInputElement,
): [number, number, number, number] | null {
  const inputs = [west, south, east, north];
  if (inputs.some((input) => input.value.trim() === "")) return null;
  const values = inputs.map((input) => Number(input.value));
  if (values.some((value) => !Number.isFinite(value))) return null;
  return [values[0], values[1], values[2], values[3]];
}

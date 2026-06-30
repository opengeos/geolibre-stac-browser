/**
 * Tiny DOM construction helpers used by the STAC browser UI. The browser builds
 * its interface with plain DOM (no framework) so it can render into any host
 * container, including GeoLibre's plain-DOM panel surfaces.
 */

/** Options accepted by {@link el}. */
export interface ElOptions {
  className?: string;
  text?: string;
  html?: string;
  title?: string;
  attrs?: Record<string, string>;
  onClick?: (event: MouseEvent) => void;
}

/**
 * Create an element with common options applied.
 *
 * @param tag - The tag name.
 * @param options - Class, text/html, attributes, and a click handler.
 * @returns The created element.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.html !== undefined) node.innerHTML = options.html;
  if (options.title) node.title = options.title;
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      node.setAttribute(key, value);
    }
  }
  if (options.onClick) {
    node.addEventListener("click", options.onClick as EventListener);
  }
  return node;
}

/** Remove all children from a node. */
export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Create a labelled key/value row for a definition list. */
export function defRow(key: string, value: string): HTMLElement {
  const row = el("div", { className: "stac-def-row" });
  row.append(
    el("span", { className: "stac-def-key", text: key }),
    el("span", { className: "stac-def-value", text: value }),
  );
  return row;
}

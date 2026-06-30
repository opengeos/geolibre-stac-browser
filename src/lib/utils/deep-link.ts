/**
 * Deep-linking support for the GeoLibre integration: the STAC Browser can be
 * opened with a catalog preloaded by adding a `stac` query parameter to the
 * GeoLibre URL, e.g.
 * `https://geolibre.app/?stac=https://earth-search.aws.element84.com/v1`.
 *
 * GeoLibre auto-activates the plugin when a URL carries a parameter it declared
 * in `urlParameterNames`, then dispatches the parsed query parameters to the
 * plugin's `handleUrlParameters(app, params)` hook. These helpers operate purely
 * on a `URLSearchParams`, with no DOM or MapLibre imports, so the logic can be
 * unit-tested in isolation.
 */

/** Query-parameter name this plugin owns: a STAC catalog/API URL to open. */
export const STAC_URL_PARAM = "stac";

/**
 * Extract the catalog URL from parsed query parameters. Returns the trimmed
 * value, or `null` when the parameter is absent or blank.
 */
export function getStacUrlValue(params: URLSearchParams): string | null {
  const trimmed = params.get(STAC_URL_PARAM)?.trim();
  return trimmed ? trimmed : null;
}

/** Minimal structural type for whatever consumes the deep-link catalog URL. */
export interface DeepLinkConsumer {
  loadCatalog(url: string): Promise<void> | void;
}

/**
 * If the query parameters carry a {@link STAC_URL_PARAM} value, forward it to
 * the consumer. No-op when the parameter is absent or blank. Returns the
 * consumer's promise (if any) so callers can await completion.
 */
export async function maybeHandleDeepLink(
  consumer: DeepLinkConsumer,
  params: URLSearchParams,
): Promise<void> {
  const value = getStacUrlValue(params);
  if (value) await consumer.loadCatalog(value);
}

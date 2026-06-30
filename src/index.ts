// Import styles
import './lib/styles/plugin-control.css';

// Core MapLibre control (used standalone and as the GeoLibre launcher button)
export { PluginControl } from './lib/core/PluginControl';

export type {
  PluginControlOptions,
  PluginState,
  PluginControlEvent,
  PluginControlEventHandler,
} from './lib/core/types';

// GeoLibre host-plugin contract
export type {
  GeoLibreAppAPI,
  GeoLibrePlugin,
  GeoLibreControl,
  GeoLibreMapControlPosition,
  GeoLibreNativeLayerRegistration,
  GeoLibreNativeLayerStyle,
  GeoLibreFeatureCollection,
  GeoLibreRightPanelRegistration,
  GeoLibreToolbarMenu,
  GeoLibreToolbarMenuItem,
  GeoLibreToolbarMenuAction,
  GeoLibreToolbarSubmenu,
  GeoLibreToolbarSeparator,
  GeoLibreFloatingPanelRegistration,
  GeoLibreRasterModule,
  GeoLibreRasterLayerManager,
} from './lib/geolibre/host-api';

// STAC browser core
export { StacBrowser } from './lib/stac/browser';
export type { StacBrowserOptions } from './lib/stac/browser';
export {
  StacClient,
  StacError,
  classifyStac,
  getLink,
  getLinks,
  resolveUrl,
  selfUrl,
  stacTitle,
  titleFromUrl,
} from './lib/stac/client';
export {
  bboxToPolygon,
  boundsOfCollection,
  boundsOfGeometry,
  boundsOfItems,
  itemToFootprint,
  itemsToFootprints,
  normalizeBbox,
} from './lib/stac/geo';
export type {
  Bounds,
  FootprintCollection,
  FootprintFeature,
} from './lib/stac/geo';
export { DEFAULT_CATALOGS } from './lib/stac/catalogs';
export type { StacCatalogPreset } from './lib/stac/catalogs';
export { NOOP_MAP_BRIDGE } from './lib/stac/map-bridge';
export type { StacMapBridge } from './lib/stac/map-bridge';
export type {
  StacAsset,
  StacCatalog,
  StacChildRef,
  StacExtent,
  StacGeometry,
  StacItem,
  StacItemCollection,
  StacItemsPage,
  StacLink,
  StacObject,
  StacObjectType,
} from './lib/stac/types';

// GeoLibre integration surfaces
export {
  STAC_PANEL_ID,
  registerStacBrowserPanel,
} from './lib/geolibre/right-panel';
export type {
  StacPanelHandle,
  StacPanelOptions,
} from './lib/geolibre/right-panel';
export {
  STAC_MENU_ID,
  registerStacToolbarMenu,
} from './lib/geolibre/toolbar-menu';
export type { StacMenuOptions } from './lib/geolibre/toolbar-menu';
export { createStacMapBridge } from './lib/geolibre/stac-map-bridge';
export type { CogRenderer } from './lib/geolibre/stac-map-bridge';
export { createCogRenderer } from './lib/geolibre/cog-renderer';

// Deep-linking helpers
export {
  STAC_URL_PARAM,
  getStacUrlValue,
  maybeHandleDeepLink,
} from './lib/utils/deep-link';
export type { DeepLinkConsumer } from './lib/utils/deep-link';

// Utility exports
export {
  clamp,
  formatNumericValue,
  generateId,
  debounce,
  throttle,
  classNames,
} from './lib/utils';

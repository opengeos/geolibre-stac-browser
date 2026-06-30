import maplibregl from 'maplibre-gl';
import { StacBrowser, createStacMapBridge } from '../../src/index';
import '../../src/index.css';
import 'maplibre-gl/dist/maplibre-gl.css';

// Create the map.
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/positron',
  center: [0, 20],
  zoom: 2,
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.FullscreenControl(), 'top-right');

// Mount the STAC browser into the sidebar. The map bridge wires footprints,
// thumbnail previews, and map framing to the MapLibre map. (Full-resolution COG
// rendering is a GeoLibre-host capability and is not available in this
// standalone demo, so the browser falls back to thumbnail previews.)
const sidebar = document.getElementById('sidebar') as HTMLElement;
const bridge = createStacMapBridge(() => map);

const browser = new StacBrowser({
  map: bridge,
  // Load a catalog on startup so the demo shows content immediately.
  initialUrl: 'https://earth-search.aws.element84.com/v1',
});

browser.mount(sidebar);

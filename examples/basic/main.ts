import maplibregl from 'maplibre-gl';
import { StacBrowserControl } from '../../src/index';
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

// Add the STAC browser as a collapsible control: a toggle icon opens a panel
// hosting the browser, which drives footprints, previews, and framing on the
// map. (Full-resolution COG rendering is a GeoLibre-host capability, so this
// standalone demo falls back to thumbnail previews.)
map.addControl(
  new StacBrowserControl({
    collapsed: false,
    initialUrl: 'https://earth-search.aws.element84.com/v1',
  }),
  'top-left',
);

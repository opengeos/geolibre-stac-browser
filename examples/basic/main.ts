import maplibregl from 'maplibre-gl';
import { StacBrowserControl } from '../../src/index';
import '../../src/index.css';
import 'maplibre-gl/dist/maplibre-gl.css';

const mapEl = document.getElementById('map') as HTMLElement;

/**
 * Create the map, or render a friendly message if the browser has no WebGL.
 * MapLibre GL requires a WebGL context; when the GPU is disabled/blocklisted
 * `new Map()` throws and the page would otherwise be blank.
 */
function createMap(): maplibregl.Map | null {
  if (!webglAvailable()) {
    showWebglMessage(mapEl);
    return null;
  }
  try {
    return new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [0, 20],
      zoom: 2,
    });
  } catch (error) {
    console.error(error);
    showWebglMessage(mapEl);
    return null;
  }
}

/** Probe for a usable WebGL context without throwing. */
function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

/** Render an in-page explanation when WebGL is unavailable. */
function showWebglMessage(el: HTMLElement): void {
  el.innerHTML = `
    <div style="max-width:640px;margin:10vh auto;padding:24px;font-family:
      -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;
      line-height:1.55">
      <h2 style="margin:0 0 8px">WebGL is required</h2>
      <p>This demo renders a MapLibre GL map, which needs a WebGL context. Your
      browser could not create one (GPU disabled or blocklisted).</p>
      <ul>
        <li>Open <code>chrome://gpu</code> and check the <strong>WebGL</strong> status.</li>
        <li>Enable <em>Settings &rsaquo; System &rsaquo; Use hardware acceleration</em>, then relaunch.</li>
        <li>Or set <code>chrome://flags/#ignore-gpu-blocklist</code> to Enabled and relaunch.</li>
      </ul>
    </div>`;
}

const map = createMap();

if (map) {
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
}

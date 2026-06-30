import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import { StacBrowserControl } from '../../src/index';
import '../../src/index.css';
import 'maplibre-gl/dist/maplibre-gl.css';

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

/**
 * React example: add the STAC browser as a collapsible MapLibre control. The
 * browser owns its own DOM, so the control drops into any React app without a
 * dedicated wrapper component. MapLibre needs WebGL; when it is unavailable we
 * show a message instead of a blank page.
 */
function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [webgl] = useState(webglAvailable);

  useEffect(() => {
    if (!webgl || !mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [0, 20],
      zoom: 2,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(
      new StacBrowserControl({
        collapsed: false,
        initialUrl: 'https://earth-search.aws.element84.com/v1',
      }),
      'top-left',
    );

    return () => map.remove();
  }, [webgl]);

  if (!webgl) {
    return (
      <div style={{ maxWidth: 640, margin: '10vh auto', padding: 24, lineHeight: 1.55 }}>
        <h2>WebGL is required</h2>
        <p>
          This demo renders a MapLibre GL map, which needs a WebGL context. Your
          browser could not create one (GPU disabled or blocklisted). Check{' '}
          <code>chrome://gpu</code>, enable hardware acceleration, or set{' '}
          <code>chrome://flags/#ignore-gpu-blocklist</code> to Enabled and relaunch.
        </p>
      </div>
    );
  }

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

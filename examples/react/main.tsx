import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import { StacBrowserControl } from '../../src/index';
import '../../src/index.css';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * React example: add the STAC browser as a collapsible MapLibre control. The
 * browser owns its own DOM, so the control drops into any React app without a
 * dedicated wrapper component.
 */
function App() {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

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
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

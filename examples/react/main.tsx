import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl, { Map } from 'maplibre-gl';
import { StacBrowser, createStacMapBridge } from '../../src/index';
import '../../src/index.css';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * React example: mount the framework-free StacBrowser into a sidebar element via
 * a ref. The browser owns its own DOM, so it drops cleanly into any React app
 * without a dedicated wrapper component.
 */
function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const sidebarContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);

  // Initialize the map.
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [0, 20],
      zoom: 2,
    });
    mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapInstance.on('load', () => setMap(mapInstance));

    return () => mapInstance.remove();
  }, []);

  // Mount the STAC browser once the map and sidebar are ready.
  useEffect(() => {
    if (!map || !sidebarContainer.current) return;

    const browser = new StacBrowser({
      map: createStacMapBridge(() => map),
      initialUrl: 'https://earth-search.aws.element84.com/v1',
    });
    browser.mount(sidebarContainer.current);

    return () => browser.destroy();
  }, [map]);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div
        ref={sidebarContainer}
        style={{
          width: 380,
          flex: '0 0 380px',
          height: '100%',
          borderRight: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      />
      <div ref={mapContainer} style={{ flex: '1 1 auto', height: '100%' }} />
    </div>
  );
}

// Mount the app
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

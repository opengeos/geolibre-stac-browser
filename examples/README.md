# Examples

This directory contains example implementations of the GeoLibre STAC Browser.

## Available Examples

### Basic Example
A vanilla TypeScript example mounting the STAC browser in a sidebar that drives footprints and previews on a MapLibre map.

```bash
# Run from project root
npm run dev
# Then navigate to http://localhost:5173/examples/basic/
```

### React Example
A React example mounting the framework-free STAC browser into a sidebar via a ref.

```bash
# Run from project root
npm run dev
# Then navigate to http://localhost:5173/examples/react/
```

## Running Examples

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the example you want to view.

## Building Examples

To build all examples for deployment:

```bash
npm run build:examples
```

The built examples will be in the `dist-examples` directory.

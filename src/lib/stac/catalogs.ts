/**
 * A curated list of well-known, public STAC catalogs and APIs to seed the
 * browser's catalog picker. All are CORS-enabled so they load directly from a
 * browser (verified against each root). Users can also type any other catalog
 * URL.
 */

/** A preset catalog entry shown in the browser's quick-pick list. */
export interface StacCatalogPreset {
  /** Display name. */
  name: string;
  /** Root catalog/API URL. */
  url: string;
}

/** Default catalogs offered in the browser's quick-pick dropdown. */
export const DEFAULT_CATALOGS: StacCatalogPreset[] = [
  {
    name: "Microsoft Planetary Computer",
    url: "https://planetarycomputer.microsoft.com/api/stac/v1",
  },
  {
    name: "Earth Search (AWS / Element 84)",
    url: "https://earth-search.aws.element84.com/v1",
  },
  {
    name: "Digital Earth Australia",
    url: "https://explorer.dea.ga.gov.au/stac",
  },
  {
    name: "NASA CMR STAC",
    url: "https://cmr.earthdata.nasa.gov/stac",
  },
  {
    name: "Maxar Open Data",
    url: "https://maxar-opendata.s3.amazonaws.com/events/catalog.json",
  },
  {
    name: "Google Earth Engine",
    url: "https://storage.googleapis.com/earthengine-stac/catalog/catalog.json",
  },
];

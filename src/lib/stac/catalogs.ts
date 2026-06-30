/**
 * A curated list of well-known, public STAC catalogs and APIs to seed the
 * browser's catalog picker. All are CORS-enabled so they load directly from a
 * browser. Users can also type any other catalog URL.
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
    name: "USGS LandsatLook",
    url: "https://landsatlook.usgs.gov/stac-server",
  },
  {
    name: "Digital Earth Africa",
    url: "https://explorer.digitalearth.africa/stac",
  },
  {
    name: "Digital Earth Australia",
    url: "https://explorer.sandbox.dea.ga.gov.au/stac",
  },
];

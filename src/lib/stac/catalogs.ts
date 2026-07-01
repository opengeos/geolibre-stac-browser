/**
 * Public STAC catalogs and APIs from STAC Index. The source list is maintained
 * from https://stacindex.org/ by https://github.com/opengeos/stac-index-catalogs.
 * Users can also type any other catalog URL.
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
    name: "African Agriculture Adaptation Atlas STAC catalog",
    url: "https://digital-atlas.s3.amazonaws.com/stac/public_stac/catalog.json",
  },
  {
    name: "Astraea Earth OnDemand",
    url: "https://eod-catalog-svc-prod.astraea.earth/",
  },
  {
    name: "BON in a Box STAC",
    url: "https://stac.geobon.org/",
  },
  {
    name: "California Forest Observatory",
    url: "https://storage.googleapis.com/cfo-public/catalog.json",
  },
  {
    name: "Canadian Geospatial Data Collections",
    url: "https://datacube.services.geo.ca/stac/api/",
  },
  {
    name: "Capella Space Open Data",
    url: "https://capella-open-data.s3.us-west-2.amazonaws.com/stac/catalog.json",
  },
  {
    name: "Cassini VIMS-IR STAC catalog",
    url: "https://vims.univ-nantes.fr/stac/catalog.json",
  },
  {
    name: "CBERS and Amazonia-1 on AWS",
    url: "https://stac.scitekno.com.br/v100/",
  },
  {
    name: "CIESIN STAC",
    url: "https://ciesin.github.io/sci-apps-stac/stac/catalog.json",
  },
  {
    name: "CoCliCo STAC Catalog",
    url: "https://coclico.blob.core.windows.net/stac/v1/catalog.json",
  },
  {
    name: "Copernicus Data Space Ecosystem",
    url: "https://stac.dataspace.copernicus.eu/v1",
  },
  {
    name: "CoRE Stack Spatio Temporal Asset Catalog",
    url: "https://spatio-temporal-asset-catalog.s3.ap-south-1.amazonaws.com/CorestackCatalogs_merged_collection/catalog.json",
  },
  {
    name: "Cubes and Clouds - Snow Cover",
    url: "https://esa.pages.eox.at/cubes-and-clouds-catalog/MOOC_Cubes_and_clouds/catalog.json",
  },
  {
    name: "Cyverse STAC API",
    url: "https://stac.cyverse.org/",
  },
  {
    name: "Data.Geo.Admin.Ch",
    url: "https://data.geo.admin.ch/api/stac/v1/",
  },
  {
    name: "Destination Earth Data Lake (DEDL) API",
    url: "https://hda.data.destination-earth.eu/stac/v2",
  },
  {
    name: "Digital Earth Africa",
    url: "https://explorer.digitalearth.africa/stac/",
  },
  {
    name: "Digital Earth Australia",
    url: "https://explorer.sandbox.dea.ga.gov.au/stac/",
  },
  {
    name: "Digitale Orthophotos Niedersachsen",
    url: "https://dop.stac.lgln.niedersachsen.de",
  },
  {
    name: "Earth Genome: Sentinel-2 L2A Temporal Mosaics",
    url: "https://stac.earthgenome.org/",
  },
  {
    name: "Earth Search",
    url: "https://earth-search.aws.element84.com/v1/",
  },
  {
    name: "EasierData",
    url: "https://stac.easierdata.info",
  },
  {
    name: "EcoDataCube.eu",
    url: "https://s3.eu-central-1.wasabisys.com/stac/odse/catalog.json",
  },
  {
    name: "EOC EO Products Service",
    url: "https://geoservice.dlr.de/eoc/ogc/stac/v1/",
  },
  {
    name: "ERS open data",
    url: "https://s3.gptl.ru/stac-web-free/catalog.json",
  },
  {
    name: "ESA Catalog",
    url: "https://eocat.esa.int/eo-catalogue/",
  },
  {
    name: "FAIRiCUBE Hub Catalog",
    url: "https://stacapi.eoxhub.fairicube.eu/",
  },
  {
    name: "FedEO Clearinghouse",
    url: "https://fedeo.ceos.org/",
  },
  {
    name: "Fiboa Field Boundaries",
    url: "https://fiboa.org/stac/catalog.json",
  },
  {
    name: "FMI ARD Finland",
    url: "https://pta.data.lit.fmi.fi/stac/root.json",
  },
  {
    name: "Geoportal des Kantons Bern",
    url: "https://geofiles.be.ch/geoportal/pub/stac/de/catalog.json",
  },
  {
    name: "GEP Supersites CSK and CSG data",
    url: "https://gep-supersites-stac.terradue.com/",
  },
  {
    name: "GISTDA Drought Index in Thailand",
    url: "https://disaster-vallaris.gistda.or.th/core/api/stac/1.0/Drought/?api_key=ErNGa8yrMWef0YutwmL7XvpwWQNCK2kVPNt5dAwWbBMnvDoifTEhD75H3DCENjKJ",
  },
  {
    name: "GISTDA Flood disaster in Thailand",
    url: "https://disaster-vallaris.gistda.or.th/core/api/stac/1.0/Flood/?api_key=ErNGa8yrMWef0YutwmL7XvpwWQNCK2kVPNt5dAwWbBMnvDoifTEhD75H3DCENjKJ",
  },
  {
    name: "Google Earth Engine",
    url: "https://storage.googleapis.com/earthengine-stac/catalog/catalog.json",
  },
  {
    name: "Google Earth Engine (openEO)",
    url: "https://earthengine.openeo.org/v1.0/",
  },
  {
    name: "Hong Kong CSDI Trial",
    url: "https://raw.githubusercontent.com/Anna-leungtn/STAC_CSDI/refs/heads/main/ib1000_stac/catalog.json",
  },
  {
    name: "HUB Ocean s Ocean Data Platform Catalog",
    url: "https://api.hubocean.earth/api/stac",
  },
  {
    name: "IDE Facultad de Ciencia y Tecnologia UADER",
    url: "https://rawcdn.githack.com/IDE-FCyT/IDE-FCyT/main/docs/catalog/stac_catalog.json",
  },
  {
    name: "INPE STAC Server",
    url: "https://data.inpe.br/bdc/stac/v1/",
  },
  {
    name: "KAGIS Katalog",
    url: "https://gis.ktn.gv.at/api/stac/v1/",
  },
  {
    name: "Kentucky From Above SpatioTemporal Asset Catalog",
    url: "https://spved5ihrl.execute-api.us-west-2.amazonaws.com/",
  },
  {
    name: "Maxar ARD Sample Data",
    url: "https://ard.maxar.com/samples/catalog.json",
  },
  {
    name: "Maxar Open Data Catalog (ARD format)",
    url: "https://maxar-opendata.s3.amazonaws.com/events/catalog.json",
  },
  {
    name: "Microsoft Planetary Computer STAC API",
    url: "https://planetarycomputer.microsoft.com/api/stac/v1/",
  },
  {
    name: "MISTEO STAC SERVER",
    url: "https://stac-server.dev2prod.co/",
  },
  {
    name: "Monthly Mosaic of Sentinel 2 Images for Catalonia",
    url: "https://datacloud.icgc.cat/stac-catalog/catalog.json",
  },
  {
    name: "MSC GeoMet - GeoMet-OGC-API",
    url: "https://api.weather.gc.ca/stac/?f=json",
  },
  {
    name: "MTD STAC API",
    url: "https://api.stac.teledetection.fr",
  },
  {
    name: "NASA CMR CLOUDSTAC Proxy",
    url: "https://cmr.earthdata.nasa.gov/cloudstac/",
  },
  {
    name: "NASA CMR STAC",
    url: "https://cmr.earthdata.nasa.gov/stac/",
  },
  {
    name: "NASA ISERV",
    url: "https://nasa-iserv.s3-us-west-2.amazonaws.com/catalog/catalog.json",
  },
  {
    name: "New Zealand Coastal Elevation",
    url: "https://nz-coastal.s3.ap-southeast-2.amazonaws.com/catalog.json",
  },
  {
    name: "New Zealand Elevation",
    url: "https://nz-elevation.s3.ap-southeast-2.amazonaws.com/catalog.json",
  },
  {
    name: "New Zealand Imagery",
    url: "https://nz-imagery.s3.ap-southeast-2.amazonaws.com/catalog.json",
  },
  {
    name: "Open Science Catalog",
    url: "https://esa-earthcode.github.io/open-science-catalog-metadata/catalog.json",
  },
  {
    name: "OpenAerialMap",
    url: "https://api.imagery.hotosm.org/stac",
  },
  {
    name: "OpenAerialMap Example",
    url: "https://raw.githubusercontent.com/m-mohr/oam-example/main/catalog.json",
  },
  {
    name: "OpenLandMap STAC",
    url: "https://s3.eu-central-1.wasabisys.com/stac/openlandmap/catalog.json",
  },
  {
    name: "OpenTopography Raster DEM Data Catalog",
    url: "https://portal.opentopography.org/stac/raster_catalog.json",
  },
  {
    name: "Overture Releases",
    url: "https://stac.overturemaps.org/catalog.json",
  },
  {
    name: "Paituli STAC (Finland)",
    url: "https://paituli.csc.fi/geoserver/ogc/stac/v1",
  },
  {
    name: "Pangeo Cloud Data Catalog",
    url: "https://raw.githubusercontent.com/pangeo-data/pangeo-datastore-stac/master/master/catalog.json",
  },
  {
    name: "Panoramax",
    url: "https://api.panoramax.xyz/api/",
  },
  {
    name: "Planet Labs STAC Catalog",
    url: "https://www.planet.com/data/stac/catalog.json",
  },
  {
    name: "Polar Geospatial Center Data Catalog",
    url: "https://pgc-opendata-dems.s3.us-west-2.amazonaws.com/pgc-data-stac.json",
  },
  {
    name: "RapidAI4EO",
    url: "https://radiantearth.blob.core.windows.net/mlhub/rapidai4eo/stac-v1.0/catalog.json",
  },
  {
    name: "S2 for Ghana",
    url: "https://gws-access.jasmin.ac.uk/public/odanceo/S2_L2/collection.json",
  },
  {
    name: "Sentinel 3 Level 2+3 on AWS",
    url: "https://meeo-s3.s3.amazonaws.com/catalog.json",
  },
  {
    name: "Sentinel 5P Level 2 on AWS",
    url: "https://meeo-s5p.s3.amazonaws.com/catalog.json",
  },
  {
    name: "Sentinel-1 RTC CONUS",
    url: "https://raw.githubusercontent.com/scottyhq/sentinel1-rtc-stac/main/collection.json",
  },
  {
    name: "SkyServe Mission Data",
    url: "https://api.ellipsis-drive.com/v3/ogc/stac/catalog/8a059125-b93d-4dda-b69b-9130fbe9f55e/epat_UK6PDdbzeJpySAvkdV55lztWjjrUZZmFzlYUQPbRFK2VnCxJQZ9twUJlv4ksKGc8",
  },
  {
    name: "Space2Stats Database",
    url: "https://worldbank.github.io/DECAT_Space2Stats/stac/catalog.json",
  },
  {
    name: "SPOT Orthoimages of Canada (2005-2010)",
    url: "https://canada-spot-ortho.s3.amazonaws.com/canada_spot_orthoimages/catalog.json",
  },
  {
    name: "Thunen Earth Observation (ThEO)",
    url: "https://eodata.thuenen.de/stac/api/v1/",
  },
  {
    name: "UK NCEO Analysis Ready Data (ARD)",
    url: "https://gws-access.jasmin.ac.uk/public/nceo_ard/NCEO_ARD_STAC/catalog.json",
  },
  {
    name: "Umbra Open SAR Data",
    url: "https://s3.us-west-2.amazonaws.com/umbra-open-data-catalog/stac/catalog.json?.language=en",
  },
  {
    name: "United States : NGDA Transportation Theme Data",
    url: "https://ngda-transportation-geoplatform.hub.arcgis.com/api/search/v1/collections/all",
  },
  {
    name: "United States | Address Data Theme",
    url: "https://api.fgdc.gov/ngda/address/",
  },
  {
    name: "United States | Alabama Geoportal Resources",
    url: "https://api.fgdc.gov/states/al/",
  },
  {
    name: "United States | Alaska Geospatial Resources",
    url: "https://api.fgdc.gov/states/ak/",
  },
  {
    name: "United States | Cadastre Data Theme",
    url: "https://api.fgdc.gov/ngda/cadastre/",
  },
  {
    name: "United States | California Geospatial Data",
    url: "https://api.fgdc.gov/states/ca/",
  },
  {
    name: "United States | Disasters Community Data",
    url: "https://disasters-geoplatform.hub.arcgis.com/api/search/v1/collections/all",
  },
  {
    name: "US GeoPlatform",
    url: "https://stac.geoplatform.gov/catalog.json",
  },
  {
    name: "USGS 3DEP LiDAR Point Clouds",
    url: "https://s3-us-west-2.amazonaws.com/usgs-lidar-stac/ept/catalog.json",
  },
  {
    name: "USGS Astrogeology Provided Analysis Ready Data",
    url: "http://asc-stacbrowser.s3-website-us-west-2.amazonaws.com/catalog.json",
  },
  {
    name: "USGS Landsat Collection 2 API",
    url: "https://landsatlook.usgs.gov/stac-server/",
  },
  {
    name: "UVT STAC Catalog",
    url: "https://stac.sage.uvt.ro",
  },
  {
    name: "World Bank - Light Every Night",
    url: "https://globalnightlight.s3.amazonaws.com/VIIRS_npp_catalog.json",
  },
  {
    name: "WorldPop STAC API",
    url: "https://api.stac.worldpop.org",
  },
  {
    name: "Wyvern Open Data",
    url: "https://wyvern-odp.com/catalog.json",
  },
];

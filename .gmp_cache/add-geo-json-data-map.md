# Add GeoJSON Data to a Map

Import and display GeoJSON data on a Google Map using the Maps JavaScript API's
Data Layer (`map.data`). You can load GeoJSON files from the same domain, across
domains (using CORS or JSONP), or by adding parsed GeoJSON objects directly in
memory.

## Prerequisites

-   **Initialized Map**: You must have a web page or application with an active
    `google.maps.Map` instance (see prerequisite capability: *Add a
    customizable, interactive map to a web page or mobile app*).
-   **Valid GeoJSON**: The Data Layer requires top-level GeoJSON `Feature` or
    `FeatureCollection` objects.

--------------------------------------------------------------------------------

## Loading GeoJSON Data

### 1. Load from the Same Domain or a CORS-Enabled Domain

Use `map.data.loadGeoJson()` to fetch and render a GeoJSON file directly from a
URL. This works for files hosted on the same domain (or subdomain) as your
application, or from external domains configured with Cross-Origin Resource
Sharing (`Access-Control-Allow-Origin: *`).

```typescript
let map: google.maps.Map;

async function initMap(): Promise<void> {
  const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

  map = new Map(document.getElementById("map") as HTMLElement, {
    zoom: 4,
    center: { lat: -28, lng: 137 },
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  });

  // Load a GeoJSON file from the same domain or a CORS-enabled URL
  map.data.loadGeoJson(
    "https://storage.googleapis.com/mapsdevsite/json/google.json"
  );
}

initMap();
```

You can also pass `Data.GeoJsonOptions` as a second argument (such as
`idPropertyName`) and a callback function that receives the array of added
`google.maps.Data.Feature` instances:

```typescript
map.data.loadGeoJson(
  "https://storage.googleapis.com/mapsdevsite/json/states.js",
  { idPropertyName: "STATE" },
  (features: google.maps.Data.Feature[]) => {
    console.log(`Loaded ${features.length} features.`);
  }
);
```

### 2. Add Parsed GeoJSON Objects in Memory

If you already have a parsed GeoJSON `Feature` or `FeatureCollection` object in
JavaScript (for example, from `fetch()`, `FileReader`, or an in-memory
constant), use `map.data.addGeoJson()`.

```typescript
const geoJsonFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-87.65, 41.85] },
      properties: { name: "Chicago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [151.207, -33.867] },
      properties: { name: "Sydney" },
    },
  ],
};

// Add the parsed GeoJSON directly to the map's Data layer
map.data.addGeoJson(geoJsonFeatureCollection);
```

--------------------------------------------------------------------------------

## Wrapping Standalone GeoJSON Geometry Objects

The `map.data.addGeoJson()` method **only** accepts a parsed GeoJSON `Feature`
or `FeatureCollection` object. It does **not** accept standalone GeoJSON
geometry objects (`Point`, `MultiPoint`, `LineString`, `MultiLineString`,
`Polygon`, `MultiPolygon`, or `GeometryCollection`) directly.

If your data source returns a standalone geometry object without a `"type":
"Feature"` wrapper, wrap it before calling `map.data.addGeoJson()`:

### Wrapping a Parsed Geometry Object

```typescript
const polygonGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [-78.45, 35.82],
      [-78.41, 35.73],
      [-78.28, 35.66],
      [-78.45, 35.82],
    ],
  ],
};

const geoJsonFeature = {
  type: "Feature",
  geometry: polygonGeometry,
  properties: {},
};

map.data.addGeoJson(geoJsonFeature);
```

### Wrapping a JSON-Formatted Geometry String

If an API returns a raw geometry string (such as a `polygon` field from a
boundary or weather alert response), wrap and parse it:

```typescript
const geojsonHeader = '{"type":"Feature", "geometry": ';
const geojsonFooter = "}";

map.data.addGeoJson(JSON.parse(geojsonHeader + polygonString + geojsonFooter));
```

--------------------------------------------------------------------------------

## Styling and Interacting with GeoJSON Data

Once GeoJSON data is loaded into `map.data`, you can style features statically
or dynamically based on feature properties, and attach event listeners (`click`,
`mouseover`, `mouseout`).

```typescript
// Static styling for all features in the Data layer
map.data.setStyle({
  fillColor: "green",
  strokeWeight: 1,
});

// Dynamic styling based on GeoJSON feature properties
map.data.setStyle((feature: google.maps.Data.Feature) => {
  let color = "gray";
  if (feature.getProperty("isColorful")) {
    color = feature.getProperty("color") as string;
  }
  return {
    fillColor: color,
    strokeColor: color,
    strokeWeight: 2,
  };
});

// Mutate properties on click to trigger dynamic re-styling
map.data.addListener("click", (event: google.maps.Data.MouseEvent) => {
  event.feature.setProperty("isColorful", true);
});

// Temporary style overrides on hover
map.data.addListener("mouseover", (event: google.maps.Data.MouseEvent) => {
  map.data.revertStyle();
  map.data.overrideStyle(event.feature, { strokeWeight: 8 });
});

map.data.addListener("mouseout", () => {
  map.data.revertStyle();
});
```

--------------------------------------------------------------------------------

## Fitting the Map Viewport to Loaded GeoJSON

To automatically pan and zoom the map so that all loaded GeoJSON geometries are
visible, recursively inspect each feature's geometry and extend a
`google.maps.LatLngBounds` object:

```typescript
function zoomToDataBounds(map: google.maps.Map): void {
  const bounds = new google.maps.LatLngBounds();

  map.data.forEach((feature) => {
    const geometry = feature.getGeometry();
    if (geometry) {
      processPoints(geometry, bounds.extend, bounds);
    }
  });

  map.fitBounds(bounds);
}

function processPoints(
  geometry: google.maps.LatLng | google.maps.Data.Geometry,
  callback: (latLng: google.maps.LatLng) => void,
  thisArg: google.maps.LatLngBounds
): void {
  if (geometry instanceof google.maps.LatLng) {
    callback.call(thisArg, geometry);
  } else if (geometry instanceof google.maps.Data.Point) {
    callback.call(thisArg, geometry.get());
  } else {
    (geometry as any).getArray().forEach((g: any) => {
      processPoints(g, callback, thisArg);
    });
  }
}
```

--------------------------------------------------------------------------------

## Requesting JSONP (Legacy / Trusted Domains Only)

> **Security Warning:** Requesting JSONP from domains outside of your control is
> risky because the browser executes any script returned by the target server.
> Only use JSONP with trusted domains when CORS is unavailable.

To load GeoJSONP (padded GeoJSON), inject a `<script>` tag into the document
`<head>` and define the global callback function specified by the feed (for
example, `eqfeed_callback`):

### Option A: Render via the Data Layer (`map.data.addGeoJson`)

```typescript
let map: google.maps.Map;

function initMap(): void {
  map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
    zoom: 2,
    center: { lat: 20, lng: -160 },
    internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
  });

  const script = document.createElement("script");
  script.src =
    "https://developers.google.com/maps/documentation/javascript/examples/json/earthquake_GeoJSONP.js";
  document.getElementsByTagName("head")[0].appendChild(script);
}

function eqfeed_callback(response: any): void {
  map.data.addGeoJson(response);
}

declare global {
  interface Window {
    initMap: () => void;
    eqfeed_callback: (results: any) => void;
  }
}
window.initMap = initMap;
window.eqfeed_callback = eqfeed_callback;
```

### Option B: Manually Iterate Features to Place Markers

Note that GeoJSON coordinates are ordered `[longitude, latitude]`, whereas
`google.maps.LatLng` expects `(latitude, longitude)`.

```typescript
const eqfeed_callback = function (results: any) {
  for (let i = 0; i < results.features.length; i++) {
    const coords = results.features[i].geometry.coordinates;
    // GeoJSON uses [lng, lat]; LatLng requires (lat, lng)
    const latLng = new google.maps.LatLng(coords[1], coords[0]);

    new google.maps.Marker({
      position: latLng,
      map: map,
    });
  }
};
```

--------------------------------------------------------------------------------

## Reference Sample Sources

-   [Simple Data Layer Loading](https://github.com/googlemaps/js-samples/blob/HEAD/samples/layer-data-simple/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   [Styling Data Layer Features](https://github.com/googlemaps/js-samples/blob/HEAD/samples/layer-data-style/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   [Dynamic Styling and Events](https://github.com/googlemaps/js-samples/blob/HEAD/samples/layer-data-dynamic/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   [Drag and Drop GeoJSON with Bounds Fitting](https://github.com/googlemaps/js-samples/blob/HEAD/samples/layer-data-dragndrop/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   [Earthquake GeoJSONP Feed](https://github.com/googlemaps/js-samples/blob/HEAD/samples/layer-data-quakes/index.ts?utm_campaign=gmp_git_agentskills_v1)
-   [Combining GeoJSON Shapes with External Data](https://github.com/googlemaps/js-samples/blob/HEAD/samples/combining-data/index.ts?utm_campaign=gmp_git_agentskills_v1)

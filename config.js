(() => {
  const h = window.location.hostname;
  const isLocal = h === "localhost" || h === "127.0.0.1";

  window.WEBGIS_API_BASE = isLocal ? "http://localhost:3000" : "";

  window.AppGIS = {
    map: null,
    layers: {},
    resultLayer: null,
    drawnItems: null,
    measureItems: null,
  };
})();

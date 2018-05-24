requirejs.config({
	// By default, load modules from the lib directory:
    baseUrl: "lib",
    // except, if the module ID starts with "app",
    // load it from the app directory. Paths
    // config is relative to the baseUrl, and
    // never includes a ".js" extension since
    // the paths config could be for a directory.
    paths: {
        app: "../app",
		view: "../app/view",
		stubview: "../app/stubview",	// for testing
		model: "../app/model",
		presenter: "../app/presenter",
		data: "../app/data",

		configuration: "../configuration",

		//jQuery: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-beta1/jquery.min",
		// If we want to load D3 from a local source:
		//d3: "d3.v3.min"
		//topojson: "http://d3js.org/topojson.v1.min",
		d3: "https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.16/d3.min",
		//topojson: "https://cdnjs.cloudflare.com/ajax/libs/topojson/1.6.19/topojson.min",

		// postal (eventbus) depends on lodash.
		postal: "postal.min",
		lodash: "lodash.core",

		leaflet: "leaflet.1.0.0.rc1",
		leafletAwesomeMarkers: "leaflet.awesome-markers.min",
		leafletMarkerCluster: "leaflet.markercluster",

		// For expressing dependencies on json files:
		json: "require/json",
		// json uses the text module, se we need it too:
		text: "require/text"
    },
	shim: {
		// leaflet must be loaded before leafletAwesomeMarkers.
		// See http://requirejs.org/docs/api.html#config-shim
		// Note that this assumes that leafletAwesomeMarkers is NOT an AMD module.

		// Following: https://github.com/lvoogdt/Leaflet.awesome-markers/issues/57:
        'leaflet': {
            exports : 'L'
        },
		'leafletAwesomeMarkers': {
			deps: ['leaflet']
        },
		'leafletMarkerCluster': {
			deps: ['leaflet']
		}
	}
});

requirejs(["app/main"], function(main) {
	"use strict";
	console.log("app/main.js has been loaded");
	main.init();
});

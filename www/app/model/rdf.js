define(["rdflib", "app/eventbus", "model/uriqueue", "model/urifetcher", "model/rdfstore"], function(rdflib, eventbus, uriQueue, uriFetcher, rdfStore) {
	"use strict";

	var queue = new uriQueue.Queue("UriQueue");
	var store = new rdfStore.Store();
	var fetcher = new uriFetcher.Fetcher(store);

	function loadUri(uri) {
		queue.push(uri);
	}
	function onQueuePop(data) {
		console.log("rdf.onQueuePop: " + data.item);
		fetcher.fetch(data.item);
	}
	eventbus.subscribe({topic: queue.popEvent, callback: onQueuePop});

	var pub = {
		loadUri: loadUri
	};
	return pub;
});

// Model for SSE Initiatives.
define(["d3", "app/eventbus", "model/config"], function(d3, eventbus, config) {
  "use strict";

  let loadedInitiatives = [];
  let initiativesToLoad = [];
  let registeredActivities = { loading: "Loading directory" };
  let initiativesByUid = {};

  function Initiative(e) {
    const that = this;
    let primaryActivityCode = getSkosCode(e.primaryActivity);

    Object.defineProperties(this, {
      name: { value: e.name, enumerable: true },
      desc: { value: e.desc, enumerable: true },
      dataset: { value: e.dataset, enumerable: true },
      uri: { value: e.uri, enumerable: true },
      uniqueId: { value: e.uri, enumerable: true },
      within: { value: e.within, enumerable: true },
      lat: { value: e.lat, enumerable: true, writable: true },
      lng: { value: e.lng, enumerable: true, writable: true },
      www: { value: e.www, enumerable: true },
      regorg: { value: e.regorg, enumerable: true },
      street: { value: e.street, enumerable: true },
      locality: { value: e.locality, enumerable: true },
      postcode: { value: e.postcode, enumerable: true },
      primaryActivity: { value: primaryActivityCode, enumerable: true },
      activity: { value: [], enumerable: true, writable: true },
      orgStructure: { value: [], enumerable: true, writable: true },
      tel: { value: e.tel, enumerable: true },
      email: { value: e.email, enumerable: true }
    });
    // let primaryActivitySplit = e.primaryActivity.split("/");
    // let primaryActivityCode =
    //   primaryActivitySplit[primaryActivitySplit.length - 1];

    // this.primaryActivity = primaryActivityCode;

    registeredActivities.AM00
      ? registeredActivities.AM00.push(this)
      : (registeredActivities.AM00 = [this]);

    // if (registeredActivities[this.primaryActivity])
    //   registeredActivities[this.primaryActivity].push(this);
    // else {
    //   delete registeredActivities.loading;
    //   registeredActivities[this.primaryActivity] = [this];
    // }
    registerActivity(this.primaryActivity, this);
    loadedInitiatives.push(this);
    initiativesByUid[this.uniqueId] = this;
    // Run new query to get activities
    // loadPluralObjects("activities", this.uniqueId);
    // Run new query to get organisational structure
    loadPluralObjects("orgStructure", this.uniqueId, function() {
      eventbus.publish({ topic: "Initiative.new", data: that });
    });
  }
  function getRegisteredActivities() {
    return registeredActivities;
  }
  function getInitiativeByUniqueId(uid) {
    return initiativesByUid[uid];
  }
  function search(text) {
    // returns an array of sse objects whose name contains the search text
    var up = text.toUpperCase();
    return loadedInitiatives.filter(function(i) {
      return i.name.toUpperCase().includes(up);
    });
  }
  function latLngBounds() {
    // @returns an a pair of lat-long pairs that define the bounding box of all the initiatives,
    // The first element is south-west, the second north east
    //
    // Careful: isNaN(null) returns false ...
    const lats = loadedInitiatives
      .filter(obj => obj.lat !== null && !isNaN(obj.lat))
      .map(obj => obj.lat);
    const lngs = loadedInitiatives
      .filter(obj => obj.lng !== null && !isNaN(obj.lng))
      .map(obj => obj.lng);
    const west = Math.min.apply(Math, lngs);
    const east = Math.max.apply(Math, lngs);
    const south = Math.min.apply(Math, lats);
    const north = Math.max.apply(Math, lats);

    return [[south, west], [north, east]];
  }
  function loadNextInitiatives() {
    var i, e;
    var maxInitiativesToLoadPerFrame = 100;
    // By loading the initiatives in chunks, we keep the UI responsive
    for (i = 0; i < maxInitiativesToLoadPerFrame; ++i) {
      e = initiativesToLoad.pop();
      if (e !== undefined) {
        new Initiative(e);
      }
    }
    // If there's still more to load, we do so after returning to the event loop:
    if (e !== undefined) {
      setTimeout(function() {
        loadNextInitiatives();
      });
    }
  }
  function add(json) {
    initiativesToLoad = initiativesToLoad.concat(json);
    loadNextInitiatives();
  }

  function getSkosCode(originalValue) {
    let split = originalValue.split("/");
    return split[split.length - 1];
  }

  function registerActivity(activity, initiative) {
    activity = getSkosCode(activity);
    if (registeredActivities[activity])
      registeredActivities[activity].push(initiative);
    else {
      delete registeredActivities.loading;
      registeredActivities[activity] = [initiative];
    }
  }
  function errorMessage(response) {
    // Extract error message from parsed JSON response.
    // Returns error string, or null if no error.
    // API response uses JSend: https://labs.omniti.com/labs/jsend
    switch (response.status) {
      case "error":
        return response.message;
      case "fail":
        return response.data.toString();
      case "success":
        return null;
      default:
        return "Unexpected JSON error message - cannot be extracted.";
    }
  }
  function loadFromWebService() {
    var ds = config.namedDatasets();
    var i;
    for (i = 0; i < ds.length; i++) {
      loadDataset(ds[i]);
    }
  }
  function loadDataset(dataset) {
    var service =
      config.getServicesPath() + "get_dataset.php?dataset=" + dataset;
    var response = null;
    var message = null;
    eventbus.publish({
      topic: "Initiative.loadStarted",
      data: { message: "Loading data via " + service }
    });
    // We want to allow the effects of publishing the above event to take place in the UI before
    // continuing with the loading of the data, so we allow the event queue to be processed:
    //setTimeout(function() {
    d3.json(service).then(function(json) {
      // This now uses d3.fetch and the fetch API.
      // TODO - error handling
      // TODO - publish events (e.g. loading, success, failure)
      //        so that the UI can display info about datasets.
      //console.log(json);
      add(json.data);
      eventbus.publish({ topic: "Initiative.datasetLoaded" });
      // Make sure the initiatives are alpabetised
      for (let activity in registeredActivities) {
        registeredActivities[activity].sort(function(a, b) {
          const name1 = a.name.toLowerCase();
          const name2 = b.name.toLowerCase();
          if (name1 > name2) return 1;
          else if (name1 < name2) return -1;
          else return 0;
        });
      }
    });
  }
  function loadPluralObjects(query, uid, callback) {
    var ds = config.namedDatasets();
    for (let i in ds) {
      var service =
        config.getServicesPath() +
        "get_dataset.php?dataset=" +
        ds[i] +
        "&q=" +
        query +
        "&uid=" +
        uid;
      var response = null;
      var message = null;
      d3.json(service).then(function(json) {
        for (let result of json.data) {
          let initiative;
          for (let key in result) {
            if (!initiative) initiative = result[key];
            else if (key !== "dataset") {
              initiativesByUid[initiative][key].push(getSkosCode(result[key]));
              if (key === "activity")
                registerActivity(result[key], initiativesByUid[initiative]);
            }
          }
        }
        if (callback) callback();
      });
    }
  }
  var pub = {
    loadFromWebService: loadFromWebService,
    search: search,
    latLngBounds: latLngBounds,
    getRegisteredActivities: getRegisteredActivities,
    getInitiativeByUniqueId: getInitiativeByUniqueId
  };
  // Automatically load the data when the app is ready:
  //eventbus.subscribe({topic: "Main.ready", callback: loadFromWebService});
  return pub;
});

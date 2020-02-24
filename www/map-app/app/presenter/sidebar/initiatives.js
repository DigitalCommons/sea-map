define([
  "app/eventbus",
  "model/config",
  "model/sse_initiative",
  "presenter/sidebar/base",
  "view/map/marker"
], function(eventbus, config, sseInitiative, sidebarPresenter,markerView) {
  "use strict";

  function StackItem(initiatives) {
    this.initiatives = initiatives;
  }
  StackItem.prototype.isSearchResults = function() {
    // TODO - surely there's a more direct way to decide if this is a SearchResults object?
    return this.hasOwnProperty("searchString");
  };

  function SearchResults(initiatives, searchString) {
    // isa StackItem
    StackItem.call(this, initiatives);
    this.searchString = searchString;
  }
  SearchResults.prototype = Object.create(StackItem.prototype);

  function Presenter() {}

  var proto = Object.create(sidebarPresenter.base.prototype);

  proto.currentItem = function() {
    return this.contentStack.current();
  };

  proto.highlightCurrentData = function(){
    eventbus.publish({
      topic: "Markers.highlightMarkers",
      data: {
        initiativesToHighlight: this.contentStack.current().initiatives
      }
    });
  };


  proto.currentItemExists = function() {
    // returns true only if the contentStack is empty
    return typeof this.contentStack.current() !== "undefined";
  };
  proto.notifyMarkersNeedToShowNewSelection = function(lastContent,newContent = null) {
    if(!newContent){
      newContent = this.contentStack.current().initiatives
    }
    eventbus.publish({
      topic: "Markers.needToShowLatestSelection",
      data: {
        unselected: lastContent ? lastContent.initiatives : [],
        selected: newContent
      }
    });
  };
  function arrayMax(array) {
    return array.reduce((a, b) => Math.max(a, b));
  }
  function arrayMin(array) {
    return array.reduce((a, b) => Math.min(a, b));
  }
  proto.notifyMapNeedsToNeedsToBeZoomedAndPanned = function(sidebarWidth) {
    const initiatives = this.contentStack.current().initiatives;
    sidebarWidth = sidebarWidth || 0;
    const lats = initiatives.map(x => x.lat);
    const lngs = initiatives.map(x => x.lng);

    if (initiatives.length > 0) {
      eventbus.publish({
        topic: "Map.needsToBeZoomedAndPanned",
        data: {
          bounds: [
            [arrayMin(lats), arrayMin(lngs)],
            [arrayMax(lats), arrayMax(lngs)]
          ],
          options: {
            paddingTopLeft: [sidebarWidth, window.innerHeight / 2],
            paddingBottomRight: [0, 0]
          }
        }
      });
    }
  };

  proto.notifyMapNeedsToNeedsToBeZoomedAndPannedOneInitiative = function(initiative,sidebarWidth) {
    const initiatives = [initiative];
    const lats = initiatives.map(x => x.lat);
    const lngs = initiatives.map(x => x.lng);
    sidebarWidth = sidebarWidth || 0;

    if (initiatives.length > 0) {
      eventbus.publish({
        topic: "Map.needsToBeZoomedAndPanned",
        data: {
          bounds: [
            [arrayMin(lats), arrayMin(lngs)],
            [arrayMax(lats), arrayMax(lngs)]
          ],
          options: {
            paddingTopLeft: [sidebarWidth, window.innerHeight / 2],
            paddingBottomRight: [0, 0],
            maxZoom: 12
          }
        }
      });
    }
  };


  proto.notifyShowInitiativeTooltip = function(initiative) {
    eventbus.publish({
      topic: "Map.needToShowInitiativeTooltip",
      data: initiative
    });
  };
  proto.notifyHideInitiativeTooltip = function(initiative) {
    eventbus.publish({
      topic: "Map.needToHideInitiativeTooltip",
      data: initiative
    });
  };
  proto.notifySidebarNeedsToShowInitiatives = function() {
    eventbus.publish({ topic: "Sidebar.showInitiatives" });
  };
  proto.historyButtonsUsed = function(lastContent) {
    //console.log("sidebar/initiatives historyButtonsUsed");
    //console.log(lastContent);
    //this.notifyMarkersNeedToShowNewSelection(lastContent);
    this.view.refresh();
  };

  proto.onInitiativeResults = function(data) {
    // TODO - handle better when data.results is empty
    //        Prob don't want to put them on the stack?
    //        But still need to show the fact that there are no results.
    const lastContent = this.contentStack.current();
    const filters = markerView.getFiltered();
    console.log(filters);
    if(filters.length!=0){
      data.results = data.results.filter(i=>{
        return filters.includes(i.uniqueId);
      });
    }



    if(data.results.length == 1){

      this.contentStack.append(new SearchResults(data.results, data.text));
      this.notifyMarkersNeedToShowNewSelection(lastContent,data.results);
      this.notifyMapNeedsToNeedsToBeZoomedAndPannedOneInitiative(data.results[0]);
    }
    else{
      this.contentStack.append(new SearchResults(data.results, data.text));
     // this.notifyMarkersNeedToShowNewSelection(lastContent);
      this.notifyMapNeedsToNeedsToBeZoomedAndPanned();
      //This will leave out only the initiatives passed to the function
      eventbus.publish({
        topic: "Markers.highlightMarkers",
        data: {
          initiativesToHighlight: data.results
        }
      });
    }

    this.notifySidebarNeedsToShowInitiatives();
    this.view.refresh();
  };

  proto.onInitiativeClickedInSidebar = function(data) {
    console.log(data)

    const initiative = data.initiative;
    const lastContent = this.contentStack.current();
    //this.contentStack.append(new StackItem([initiative]));
    //console.log(this.contentStack.current());
    this.notifyMarkersNeedToShowNewSelection(lastContent,[initiative]);
    this.notifyMapNeedsToNeedsToBeZoomedAndPannedOneInitiative(initiative);
    this.view.refresh();
  };
  proto.onInitiativeMouseoverInSidebar = function(initiative) {
    this.notifyShowInitiativeTooltip(initiative);
  };
  proto.onInitiativeMouseoutInSidebar = function(initiative) {
    this.notifyHideInitiativeTooltip(initiative);
  };
  proto.onMarkerSelectionSet = function(data) {
    const initiative = data;
    //console.log(initiative);
    const lastContent = this.contentStack.current();
    this.contentStack.append(new StackItem([initiative]));
    this.notifyMarkersNeedToShowNewSelection(lastContent);
    // this.notifySidebarNeedsToShowInitiatives();
    this.view.refresh();
  };
  proto.onMarkerSelectionToggled = function(data) {
    const initiative = data;
    const lastContent = this.contentStack.current();
    // Make a clone of the current initiatives:
    const initiatives =
      typeof lastContent != "undefined" ? lastContent.initiatives.slice(0) : [];
    const index = initiatives.indexOf(initiative);
    if (index == -1) {
      initiatives.push(initiative);
    } else {
      // remove elment form array (sigh - is this really the best array method for this?)
      initiatives.splice(index, 1);
    }
    this.contentStack.append(new StackItem(initiatives));
    this.notifyMarkersNeedToShowNewSelection(lastContent);
    this.view.refresh();
  };

  Presenter.prototype = proto;

  function createPresenter(view) {


    var p = new Presenter();
    p.registerView(view);
    eventbus.subscribe({
      topic: "Search.initiativeResults",
      callback: function(data) {
        p.onInitiativeResults(data);
      }
    });
    /*
    eventbus.subscribe({
      topic: "Datasets.filterDataset",
      callback: function(data) {
        //p.onInitiativeResults(data);
      }
    });
    */

    eventbus.subscribe({
      topic: "Marker.SelectionToggled",
      callback: function(data) {
        p.onMarkerSelectionToggled(data);
      }
    });
    eventbus.subscribe({
      topic: "Marker.SelectionSet",
      callback: function(data) {
        p.onMarkerSelectionSet(data);
      }
    });
    eventbus.subscribe({
      topic: "Directory.initiativeClicked",
      callback: function(data) {
        p.onInitiativeClickedInSidebar(data);
      }
    });
    return p;
  }
  var pub = {
    createPresenter: createPresenter
  };
  return pub;
});

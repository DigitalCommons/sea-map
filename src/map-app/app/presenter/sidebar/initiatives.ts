import { EventBus } from '../../../eventbus';
import { MultiPropDef, VocabPropDef } from '../../model/data-services';
import { InitiativesSidebarView } from '../../view/sidebar/initiatives';
import { BaseSidebarPresenter } from './base';
import { SearchFilter, SearchResults } from '../../../search-results';
import { Initiative } from '../../model/initiative';
import { compactArray, initiativeUris, toString as _toString } from '../../../utils';
import { SidebarPresenter } from '../sidebar';
import { MapFilter } from '../../map-ui';

export class InitiativesSidebarPresenter extends BaseSidebarPresenter {
  readonly view: InitiativesSidebarView;
  
  _eventbusRegister(): void {
    EventBus.Search.initiativeResults.sub(results => this.onInitiativeResults(results));
    EventBus.Marker.selectionToggled.sub(initiative => this.onMarkerSelectionToggled(initiative));
    EventBus.Marker.selectionSet.sub(initiative => this.onMarkerSelectionSet(initiative));
    EventBus.Directory.initiativeClicked.sub(initiative => this.onInitiativeClickedInSidebar(initiative));
    EventBus.Initiatives.showSearchHistory.sub(() => this.onSearchHistory())
    EventBus.Initiative.searchedInitiativeClicked.sub(initiative => this.searchedInitiativeClicked(_toString(initiative.uri, undefined)));
    EventBus.Search.changeSearchText.sub(text => this.changeSearchText(text));
  }

  constructor(readonly parent: SidebarPresenter) {
    super(parent);
    this.view = new InitiativesSidebarView(this);
    this._eventbusRegister();
  }

  currentItem (): SearchResults | undefined {
    return this.parent.mapui.contentStack.current();
  }

  notifyMarkersNeedToShowNewSelection(lastContent: SearchResults, newContent?: Initiative[]) {
    if (!newContent)
      newContent = this.parent.mapui.contentStack.current()?.initiatives
    if (newContent)
      EventBus.Markers.needToShowLatestSelection.pub(newContent);
  }

  /// - propName  is the title of the property being filtered
  /// - filterValue is the value of the selected drop-down value (typically an abbreviated vocab URI,
  ///   but could also be "any"
  /// - filterValueText is the display text for the selecte drop-down value
  /// - searchText the current value of the text search, or an empty string.
  changeFilters(propName: string, filterValue: string, filterValueText: string, searchText: string) {
    const mapui = this.parent.mapui;
    
    // Get the property definition for propName
    const vocabProps = mapui.dataServices.getVocabPropDefs();
    const propDef = vocabProps[propName];
    if (!propDef)
      throw new Error(`filterable field ${propName} is not a vocab field, which is not currently supported`);
    // FIXME implement support for this later

    // Get the vocab for this property
    const vocabs = mapui.dataServices.getLocalisedVocabs();
    const vocab = vocabs[propDef.uri];
    if (!vocab)
      throw new Error(`filterable field ${propName} does not use a known vocab: ${propDef.uri}`);

    //remove old filter 
    const currentFilters = mapui.filter.getFiltersFull();

    if (currentFilters && currentFilters.length > 0) {
      const oldFilter = currentFilters.find(filter => {
        filter && filter.localisedVocabTitle === vocab.title // FIXME ideally use propDef.uri
      })
      
      if (oldFilter) {
        EventBus.Map.removeFilter.pub(oldFilter.filterName);
      }
    }

    //if filter is any, don't add a new filter
    if (filterValue === "any")
      return;

    // Get initiatives for new filter
    const allInitiatives = compactArray(Object.values(mapui.dataServices.getAggregatedData().initiativesByUid));
    let filteredInitiatives = Initiative.filter(allInitiatives, propName, filterValue);

    // Apply the text search on top
    filteredInitiatives = Initiative.textSearch(searchText, filteredInitiatives);

    // create new filter
    let filterData: MapFilter = {
      filterName: filterValue,
      result: filteredInitiatives,
      localisedVocabTitle: vocab.title,
      localisedTerm: filterValueText,
      verboseName: vocab.title + ": " + filterValueText,
      propName: propName,
      propValue: filterValue,
    }
    EventBus.Map.addFilter.pub(filterData);
    EventBus.Map.addSearchFilter.pub(filterData);
  }

  removeFilters() {
    EventBus.Directory.removeFilters.pub(undefined);
  }

  notifyMapNeedsToNeedsToBeZoomedAndPannedOneInitiative(initiative: Initiative) {
    const data = EventBus.Map.mkSelectAndZoomData([initiative]);
    EventBus.Map.needsToBeZoomedAndPanned.pub(data);
  }

  notifyMapNeedsToNeedsToBeZoomedAndPanned() {
    const initiatives = this.parent.mapui.contentStack.current()?.initiatives;
    if (!initiatives || initiatives.length <= 0)
      return;
    const data = EventBus.Map.mkSelectAndZoomData(initiatives);
    EventBus.Map.needsToBeZoomedAndPanned.pub(data);
  }

  notifyShowInitiativeTooltip(initiative: Initiative) {
    EventBus.Map.needToShowInitiativeTooltip.pub(initiative);
  }

  notifyHideInitiativeTooltip(initiative: Initiative) {
    EventBus.Map.needToHideInitiativeTooltip.pub(initiative);
  }

  notifySidebarNeedsToShowInitiatives() {
    EventBus.Sidebar.showInitiatives.pub();
  }
  
  historyButtonsUsed() {
    //console.log("sidebar/initiatives historyButtonsUsed");
    //console.log(lastContent);
    //this.notifyMarkersNeedToShowNewSelection(lastContent);
    this.view.refresh();
  }

  onInitiativeResults(data: EventBus.Search.Results) {
    // TODO - handle better when data.results is empty
    //        Prob don't want to put them on the stack?
    //        But still need to show the fact that there are no results.
    //get the uniquids of the applied filters
    const filterKeys = initiativeUris(this.parent.mapui.filter.getFiltered());

    //go in if there are any filters
    let results = [ ...data.results ];
    if (filterKeys.length != 0) {
      //get the intersection of the filtered content and the search data
      //search results should be a subset of filtered

      results = results.filter(initiative =>
        filterKeys.includes(_toString(initiative.uri))
                              );
    }

    // (SearchFilter is a subset of MapFilter)
    const searchFilters: SearchFilter[] = this.parent.mapui.filter.getFiltersFull()
    const searchResults = new SearchResults(results, data.text,
                                            searchFilters,
                                            this.parent.mapui.labels);
    this.parent.mapui.contentStack.push(searchResults);


    //highlight markers on search results 
    //reveal all potentially hidden markers before zooming in on them
    EventBus.Map.addSearchFilter.pub({ result: results });

    if (data.results.length == 1) {
      this.notifyMapNeedsToNeedsToBeZoomedAndPannedOneInitiative(results[0]);
    }
    else if (results.length == 0) {
      //do nothing on failed search
      console.log("no results");
    }
    else {
      //this.notifyMarkersNeedToShowNewSelection(lastContent);
      //deselect all
      this.notifyMapNeedsToNeedsToBeZoomedAndPanned(); //does not do anything?
    }

    this.notifySidebarNeedsToShowInitiatives();
    this.view.refresh();
  }

  getFilterNames() {
    return this.parent.mapui.filter.getFiltersVerbose();
  }

  initClicked(initiative: Initiative) {
    EventBus.Directory.initiativeClicked.pub(initiative);
    if (window.outerWidth <= 800) {
      EventBus.Directory.initiativeClickedHideSidebar.pub(initiative);
    }
  }

  onInitiativeClickedInSidebar(initiative?: Initiative) {
    if (!initiative)
      return;
    
    //this.parent.mapui.contentStack.append(new SearchResults([initiative]));
    //console.log(this.parent.mapui.contentStack.current());

    this.notifyMapNeedsToNeedsToBeZoomedAndPannedOneInitiative(initiative);
    this.view.refresh();
    EventBus.Initiative.searchedInitiativeClicked.pub(initiative);
  }
  
  onInitiativeMouseoverInSidebar(initiative: Initiative) {
    this.notifyShowInitiativeTooltip(initiative);
  }

  onInitiativeMouseoutInSidebar(initiative: Initiative) {
    this.notifyHideInitiativeTooltip(initiative);
  }
  
  onMarkerSelectionSet(initiative: Initiative) {
    //console.log(initiative);
    const lastContent = this.parent.mapui.contentStack.current();
    //this.parent.mapui.contentStack.append(new SearchResults([initiative]));
    if (lastContent)
      this.notifyMarkersNeedToShowNewSelection(lastContent);
    // this.notifySidebarNeedsToShowInitiatives();
    this.view.refresh();
  }

  onMarkerSelectionToggled(initiative: Initiative) {
    const lastContent = this.parent.mapui.contentStack.current();
    // Make a clone of the current initiatives:
    const initiatives =
      lastContent !== undefined ? lastContent.initiatives.slice(0) : [];
    const index = initiatives.indexOf(initiative);
    if (index == -1) {
      initiatives.push(initiative);
    } else {
      // remove elment form array (sigh - is this really the best array method for this?)
      initiatives.splice(index, 1);
    }
    //this.contentStack.append(new SearchResults(initiatives));
    if (lastContent)
      this.notifyMarkersNeedToShowNewSelection(lastContent);
    this.view.refresh();
  }

  onSearchHistory() {
    this.parent.mapui.contentStack.gotoEnd();
    EventBus.Map.removeSearchFilter.pub();
  }

  searchedInitiativeClicked(uri?: string) {
    if (uri) this.view.onInitiativeClicked(uri);
  }

  performSearch(text: string) {
    console.log("Search submitted: [" + text + "]");
    // We need to make sure that the search sidebar is loaded
    if (text.length > 0) {
      EventBus.Sidebar.hideInitiativeList.pub();
      EventBus.Markers.needToShowLatestSelection.pub([]);

      //should be async
      const results = Initiative.textSearch(text, this.parent.mapui.dataServices.getAggregatedData().loadedInitiatives);      
      EventBus.Search.initiativeResults.pub({ text: text, results: Initiative.textSort(results) });
    }

    else {
      this.performSearchNoText();
    }
  }

  performSearchNoText() {
    console.log("perform search no text")
    EventBus.Sidebar.hideInitiativeList.pub();
    EventBus.Markers.needToShowLatestSelection.pub([]);

    //should be async
    var results = Object.values(this.parent.mapui.dataServices.getAggregatedData().initiativesByUid)
      .filter((i): i is Initiative => !!i);
    EventBus.Search.initiativeResults.pub({ text: "", results: results });
  }

  changeSearchText(txt: string) {
    this.view.changeSearchText(txt);
  }
}


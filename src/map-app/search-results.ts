import { MapFilter, MapSearch } from "./app/map-ui";
import { Initiative } from "./app/model/initiative";
import { EventBus } from "./eventbus";
import { PhraseBook } from "./localisations";
import { Stack } from "./stack";

export interface SearchFilter {
  filterName: string;
  verboseName: string;  
}

/// Represents a search result on the sidebar contentStack
export class SearchResults { 
  readonly searchString: string;
  readonly filters: SearchFilter[];
  
  constructor(readonly initiatives: Initiative[],
              readonly searchedFor: string,
              filterVerboseNames: string[],
              filterNames: string[],
              labels: PhraseBook) {
    this.searchString = filterVerboseNames.length > 0 ?
      `"${searchedFor}" ${labels.in} ${filterVerboseNames.join(' '+labels.and+' ')}` :
      `"${searchedFor}"`;
    this.filters = filterNames.map((filterName, index) => ({
      filterName,
      verboseName: filterVerboseNames[index]
    }));
  }
}


/// A stack which represents the state of the map
export class StateStack extends Stack<SearchResults> {
  back(): void {
    //console.log("backButtonClicked");
    //console.log(this);
    const lastContent = this.current();
    const newContent = this.previous();
    if (!newContent || newContent == lastContent)
      return;
    
    // TODO: Think: maybe better to call a method on this that indicates thay
    //       the contentStack has been changed.
    //       Then it is up to the this to perform other actions related to this
    //       (e.g. where it affects which initiatives are selected)
    //this.view.refresh();

    EventBus.Map.removeFilters.pub();

    if(newContent instanceof SearchResults && newContent.filters[0]){    
      newContent.filters.forEach(filter=>{
        let filterData: MapFilter = {
          filterName: filter.filterName,
          result: newContent.initiatives,
          verboseName: filter.verboseName
        };
        EventBus.Map.addFilter.pub(filterData);
      });
    }

    const data: MapSearch = {result: newContent.initiatives};
    EventBus.Map.addSearchFilter.pub(data);
  }
  
  forward(): void {
    //console.log("forwardButtonClicked");
    //console.log(this);
    const lastContent = this.current();
    const newContent = this.next();
    if (newContent == lastContent)
      return;
    //this.view.refresh();
    if(newContent && newContent instanceof SearchResults){
      EventBus.Map.removeFilters.pub();

      if(newContent.filters[0]){     
        newContent.filters.forEach(filter=>{
          let filterData: MapFilter = {
            filterName: filter.filterName,
            result: newContent.initiatives,
            verboseName: filter.verboseName
          };
          EventBus.Map.addFilter.pub(filterData);
        });
      }

      const data: MapSearch = {result: newContent.initiatives};
      EventBus.Map.addSearchFilter.pub(data);
    }
    else{
      EventBus.Map.removeSearchFilter.pub();
    }
  }
}

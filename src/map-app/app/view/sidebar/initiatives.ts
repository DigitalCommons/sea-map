// The view aspects of the Main Menu sidebar
import * as d3 from 'd3';
import {  BaseSidebarView  } from './base';
import {  InitiativesSidebarPresenter  } from '../../presenter/sidebar/initiatives';
import type { d3Selection, d3DivSelection } from '../d3-utils';
import { Initiative } from '../../model/initiative';
import { promoteToArray, toString as _toString } from '../../../utils';
import { SentryValues } from '../base';



export class InitiativesSidebarView extends BaseSidebarView {
	readonly title: string = 'Initiatives';
  
  constructor(readonly presenter: InitiativesSidebarPresenter) {
    super();
  }

	populateFixedSelection(selection: d3Selection) {
    const labels = this.presenter.parent.mapui.labels;
		const container = selection
			.append("div")
			.attr("class", "w3-container");
		container
			.append("h1")
			.text(labels.search);
    
		this.createSearchBox(container);

    this.changeSearchText(this.presenter.parent.mapui.getSearchText());
    
		container
			.append("p")
			.attr("id", "searchTooltipText")
			.text(this.presenter.parent.mapui.getSearchDescription());

		//advanced search    
		const advancedSearchContainer = container
			.append("div")


		this.createAdvancedSearch(advancedSearchContainer);
	}

	onInitiativeClicked(id: string) {
		d3.select(".sea-search-initiative-active")
			.classed("sea-search-initiative-active", false);

		d3.select('[data-uid="' + id + '"]')
			.classed(
				"sea-search-initiative-active",
				true
			);
	}

	populateSelectionWithListOfInitiatives(
		selection: d3Selection,
		initiatives: Initiative[]
	) {
		initiatives.forEach((initiative) => {
			let initiativeClass = "w3-bar-item w3-button w3-mobile srch-initiative";

			if (!initiative.hasLocation()) {
				initiativeClass += " sea-initiative-non-geo";
			}

      const uri = _toString(initiative.uri, null);
      if (uri)
			  selection
				  .append("button")
				  .attr("class", initiativeClass)
				  .attr("data-uid", uri)
				  .attr("title", "Click to see details here and on map")
			// TODO - shift-click should remove initiative from selection,
			//        just like shift-clicking a marker.
				  .on("click", () => this.presenter.initClicked(initiative))
				  .on("mouseover", () => this.presenter.onInitiativeMouseoverInSidebar(initiative) )
				  .on("mouseout", () => this.presenter.onInitiativeMouseoutInSidebar(initiative) )
				  .text(_toString(initiative.name));
		});
	}

  getSearchText(): string {
    return d3.select("#search-box").property("value");
  }
  
	changeSearchText(txt: string) {
		d3.select("#search-box").property("value", txt);
	}

	createSearchBox(selection: d3DivSelection) {
		const selection2 = selection
			.append("form")
			.attr("id", "map-app-search-form")
			.attr(
				"class",
				"w3-card-2 w3-round map-app-search-form"
			)
			.on("submit", (event) => {
				// By default, submitting the form will cause a page reload!
				event.preventDefault();
				//event.stopPropagation();

				var searchText = this.getSearchText()
				this.presenter.performSearch(searchText);
			})
			.append("div")
			.attr("class", "w3-border-0");
		selection2
			.append("div")
			.attr("class", "w3-col")
			.attr("title", "Click to search")
			.style("width", "50px")
			.append("button")
			.attr("type", "submit")
			.attr("class", "w3-btn w3-border-0")
			.append("i")
			.attr("class", "w3-xlarge fa fa-search");
		selection2
			.append("div")
			.attr("class", "w3-rest")
			.append("input")
			.attr("id", "search-box")
			.attr("class", "w3-input w3-border-0 w3-round w3-mobile")
			.attr("type", "search")
			.attr("placeholder", this.presenter.parent.mapui.labels.searchInitiatives)
			.attr("autocomplete", "off");

		document.getElementById("search-box")?.focus();
	}

	private createAdvancedSearch(container: d3DivSelection) {
		const initatives = this.presenter.parent.mapui.currentItem().visibleInitiatives;

		//function used in the dropdown to change the filter
		const changeFilter = (event: Event) => {
      if (!event.target)
        return;
      const target = event.target; // Need some guarding here
      if (!(target instanceof HTMLSelectElement))
        return;
			//create the filter from the event of selecting the option
			const propName = target.id.split("-dropdown")[0];
			let filterValue: string|undefined = target.value;
      if (filterValue === SentryValues.OPTION_UNSELECTED)
        filterValue = undefined;
			this.presenter.changeFilters(propName, filterValue);
		}

    const mapui = this.presenter.parent.mapui;
		const possibleFilterValues = mapui.dataServices.getPossibleFilterValues(Array.from(mapui.currentItem().visibleInitiatives)); // FIXME review
    const propNames = mapui.config.getFilterableFields();
    const vocabPropDefs = mapui.dataServices.getVocabPropDefs();
    const vocabs = mapui.dataServices.getLocalisedVocabs();
    for(const propName of propNames) {
      const propDef = vocabPropDefs[propName];
      if (!propDef)
        throw new Error(`filterableFields contains ${propName}, which is not a valid vocab field`);

      const vocab = vocabs[propDef.uri];
      if (!vocab)
        throw new Error(`filterableFields contains ${propName}, `+
          `whose vocab ${propDef.uri} is not defined in the current language`);

      const propTitle = propName; // FIXME currently no localised way to get property titles!
      
			container
				.append("p")
				.attr("id", propName + "-dropdown-label")
				.attr("class", "advanced-label")
				.text(propTitle)

			const dropDown = container
				.append("div")
				.append("select")
				.attr("id", propName + "-dropdown")
				.attr("class", "w3-input w3-border-0 w3-round w3-mobile advanced-select")
				.on("change", (event) => changeFilter(event));

			dropDown
				.append("option")
				.text(`- ${mapui.labels.any} -`)
				.attr("value", SentryValues.OPTION_UNSELECTED)
				.attr("class", "advanced-option")

      
			const entryArray = Object.entries(vocab.terms);
			// Sort entries alphabetically by value (the human-readable labels)
			entryArray.sort((a, b) => String(a[1]).localeCompare(String(b[1])));


			const  alternatePossibleFilterValues = mapui.getAlternatePossibleFilterValues(propName);
      const filters = mapui.currentItem().propFilters;
      const filter = filters[propName];
      
			entryArray.forEach(entry => {
				const [value, label] = entry;
				const option = dropDown
					.append("option")
					.text(label ?? '')
					.attr("value", value)
					.attr("class", "advanced-option")

				// if there are active filters, label the one currently selected and disable empty choices
        if (filter && filter.valueRequired === value) {
					option.attr("selected", true);
        }
        if (!alternatePossibleFilterValues.has(value)) {
          option.attr("disabled", true);
        }
			})
		}
	}

	populateScrollableSelection(selection: d3Selection) {
    const labels = this.presenter.parent.mapui.labels;
		const noFilterTxt = labels.whenSearch;
    const freshSearchText = this.presenter.parent.mapui.getSearchDescription();

    const appState = this.presenter.parent.mapui.currentItem();
    if (appState.hasPropFilters) {
			// add clear button
			selection
				.append("div")
				.attr("class", "w3-container w3-center sidebar-button-container")
				.attr("id", "clearSearchFilterBtn")
				.append("button")
				.attr("class", "w3-button w3-black")
				.text(labels.clearFilters)
				.on("click", () => {
					//redo search
					this.presenter.removeFilters();
					});

			switch (appState.visibleInitiatives.size) {
				case 0:
					selection
							.append("div")
							.attr("class", "w3-container w3-center")
							.append("p")
							.text(labels.nothingMatched);

					break;
				case 1:
					//this.populateSelectionWithO neInitiative(selection, initiatives[0]);
					this.populateSelectionWithListOfInitiatives(selection, Array.from(appState.visibleInitiatives));
					break;
				default:
					this.populateSelectionWithListOfInitiatives(selection, Array.from(appState.visibleInitiatives));
			}

		}
		else {
			selection
				.append("div")
				.attr("class", "w3-container w3-center")
				.attr("id", "searchTooltipId")
				.append("p")
				.text(
					freshSearchText
				);
			// add clear button
			if (appState.hasPropFilters) {
				selection
					.append("div")
					.attr("class", "w3-container w3-center")
					.attr("id", "clearSearchFilterBtn")
					.append("button")
					.attr("class", "w3-button w3-black")
					.text(labels.clearFilters)
					.on("click", () => {
						// only remove filters and and reset text, no re-search needed
						this.presenter.resetSearch();
						selection.select("#searchTooltipId").text(noFilterTxt);
						selection.select("#clearSearchFilterBtn").remove();
					});
			}
		}

	}
}

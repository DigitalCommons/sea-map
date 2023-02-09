// The view aspects of the Main Menu sidebar
import * as d3 from 'd3';
import * as eventbus from '../../eventbus';
import {  BaseSidebarView  } from './base';
import {  InitiativesSidebarPresenter  } from '../../presenter/sidebar/initiatives';
import { MapPresenterFactory } from '../../presenter/map';
import { DataServices, Initiative } from '../../model/dataservices';
import { Dictionary } from '../../../common_types';
import { Config } from '../../model/config';
import { SidebarView } from '../sidebar';
import type { d3Selection, d3DivSelection } from '../d3-utils';
import { SearchResults } from '../../presenter/sidebar/searchresults';



export class InitiativesSidebarView extends BaseSidebarView {
  readonly presenter: InitiativesSidebarPresenter;
  
	readonly title: string = 'Initiatives';
  
  constructor(readonly parent: SidebarView,
              readonly config: Config,
              readonly labels: Dictionary,
              readonly dataServices: DataServices,
              readonly mapPresenterFactory: MapPresenterFactory) {
    super();
    this.presenter = new InitiativesSidebarPresenter(this, labels, config, dataServices, mapPresenterFactory);
  }

	populateFixedSelection(selection: d3Selection) {
		const container = selection
			.append("div")
			.attr("class", "w3-container");
		container
			.append("h1")
			.text(this.labels?.search ?? '');

		this.createSearchBox(container);

		let textContent = ""; // default content, if no initiatives to show
    const item = this.presenter.currentItem();
		if (item instanceof SearchResults) {
			textContent = this.labels.search + ": " + item.searchString;

			//change the text in the search bar
			eventbus.publish({
				topic: "Search.changeSearchText",
				data: {
					txt: item.searchedFor
				}
			});
		}

		container
			.append("p")
			.attr("id", "searchTooltipText")
			.text(textContent);

		//advanced search    
		const advancedSearchContainer = container
			.append("div")


		const terms = this.dataServices.getTerms();

		this.createAdvancedSearch(advancedSearchContainer, terms);
	}

	geekZoneContentAtD3Selection(selection: d3DivSelection, initiative: Initiative) {
		const s = selection.append("div").attr("class", "w3-bar-block");
		if (initiative.lat) {
			s.append("div")
				.attr("class", BaseSidebarView.sectionClasses)
				.text("Latitude: " + initiative.lat);
		}
		if (initiative.lng) {
			s.append("div")
				.attr("class", BaseSidebarView.sectionClasses)
				.text("Longitude: " + initiative.lng);
		}
		if (initiative.uri) {
			s.append("div")
				.attr("class", BaseSidebarView.sectionClasses + BaseSidebarView.hoverColour)
				.text("Detailed data for this initiative")
				.style("cursor", "pointer")
				.on("click", () => {
					this.openInNewTabOrWindow(initiative.uri);
				});
		}
		if (initiative.within) {
			s.append("div")
				.attr("class", BaseSidebarView.sectionClasses + BaseSidebarView.hoverColour)
				.text("Ordnance Survey postcode information")
				.style("cursor", "pointer")
				.on("click", () => {
					this.openInNewTabOrWindow(initiative.within);
				});
		}
		if (initiative.regorg) {
			const serviceToDisplaySimilarCompanies =
				document.location.origin +
				document.location.pathname +
				this.config.getServicesPath() +
				"display_similar_companies/main.php";
			const serviceToDisplaySimilarCompaniesURL =
				serviceToDisplaySimilarCompanies +
				"?company=" +
				encodeURIComponent(initiative.regorg);
			s.append("div")
				.attr("class", BaseSidebarView.sectionClasses + BaseSidebarView.hoverColour)
				.attr("title", "A tech demo of federated Linked Open Data queries!")
				.text("Display similar companies nearby using Companies House data")
				.style("cursor", "pointer")
				.on("click", () => {
					this.openInNewTabOrWindow(serviceToDisplaySimilarCompaniesURL);
				});
		}
	}
  
	populateSelectionWithOneInitiative(selection: d3Selection, initiative: Initiative) {
		const s = selection.append("div").attr("class", "w3-bar-block");
		if (initiative.www) {
			s.append("div")
				.attr("class", BaseSidebarView.sectionHeadingClasses)
				.text("website");
			s.append("div")
				.attr("class", BaseSidebarView.sectionClasses + BaseSidebarView.hoverColour)
				.text(initiative.www)
				.style("cursor", "pointer")
				.on("click", () => {
					this.openInNewTabOrWindow(initiative.www);
				});
		}
		s.append("div")
			.attr("class", BaseSidebarView.sectionHeadingClasses)
			.text("description");
		s.append("div")
			.attr("class", BaseSidebarView.sectionClasses)
			.text(initiative.desc || "No description available");
    
		// Make an accordion for opening up the geek zone
		this.makeAccordionAtD3Selection({
			selection: s,
			heading: "Geek zone",
			headingClasses: BaseSidebarView.accordionClasses,
			makeContentAtD3Selection: (contentD3Selection: d3DivSelection) => {
				this.geekZoneContentAtD3Selection(contentD3Selection, initiative);
			},
			hideContent: true
		});
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

			selection
				.append("button")
				.attr("class", initiativeClass)
				.attr("data-uid", initiative.uri)
				.attr("title", "Click to see details here and on map")
				// TODO - shift-click should remove initiative from selection,
				//        just like shift-clicking a marker.
				.on("click", () => this.presenter.initClicked(initiative))
				.on("mouseover", () => this.presenter.onInitiativeMouseoverInSidebar(initiative) )
				.on("mouseout", () => this.presenter.onInitiativeMouseoutInSidebar(initiative) )
				.text(initiative.name);
		});
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

				var searchText = d3.select("#search-box").property("value");
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
			.attr("placeholder", this.labels?.searchInitiatives ?? '')
			.attr("autocomplete", "off");

		document.getElementById("search-box")?.focus();
	}

	createAdvancedSearch(container: d3DivSelection, vocabDict: Dictionary<Dictionary>) {
		const currentFilters = this.mapPresenterFactory.getFilters();
		const item = this.presenter.currentItem();

		//function used in the dropdown to change the filter
		const changeFilter = (event: Event) => {
      if (!event.target)
        return;
      const target = event.target; // Need some guarding here
      if (!(target instanceof HTMLSelectElement))
        return;
			//create the filter from the event of selecting the option
			const filterCategoryName = target.id.split("-dropdown")[0];
			const filterValue = target.value;
			const filterValueText = target.selectedOptions[0].text;

			this.presenter.changeFilters(filterCategoryName, filterValue, filterValueText);

			//repeat the last search after changing the filter
			//if there is no last search, or the last search is empty, do a special search
			if (item instanceof SearchResults) {
				if (item.searchedFor == "")
					this.presenter.performSearchNoText();
				else
					this.presenter.performSearch(item.searchedFor);
      }
			else
      	this.presenter.performSearchNoText();
		}

		const possibleFilterValues = this.dataServices.getPossibleFilterValues(this.mapPresenterFactory.getFiltered());
		const activeFilterCategories = this.mapPresenterFactory.getFiltersFull().map(filter =>
			filter.verboseName.split(":")[0]);

		for (const field in vocabDict) {
			container
				.append("p")
				.attr("id", field + "dropdown-label")
				.attr("class", "advanced-label")
				.text(field)

			const dropDown = container
				.append("div")
				.append("select")
				.attr("id", field + "-dropdown")
				.attr("class", "w3-input w3-border-0 w3-round w3-mobile advanced-select")
				.on("change", (event) => changeFilter(event));

			dropDown
				.append("option")
				.text(`- ${this.labels.any} -`)
				.attr("value", "any")
				.attr("class", "advanced-option")

      const vocabTerms = vocabDict[field]
      if (!vocabTerms)
        continue;
      
			const entryArray = Object.entries(vocabTerms);
			// Sort entries alphabetically by value (the human-readable labels)
			entryArray.sort((a, b) => String(a[1]).localeCompare(String(b[1])));

			//find alternative possible filters for an active filter
			let alternatePossibleFilterValues: unknown[] = [];
			if (currentFilters.length > 0 && activeFilterCategories.includes(field))
				alternatePossibleFilterValues = this.dataServices.getAlternatePossibleFilterValues(
					this.mapPresenterFactory.getFiltersFull(), field);

			entryArray.forEach(entry => {
				const [id, label] = entry;
				const option = dropDown
					.append("option")
					.text(label ?? '')
					.attr("value", id)
					.attr("class", "advanced-option")

				//if there are active filters, make them selected and disable empty choices
				if (currentFilters.length > 0) {
					if (currentFilters.includes(id))
						option.attr("selected", true);

					if (activeFilterCategories.includes(field)) {
						if (currentFilters.length > 1 && !alternatePossibleFilterValues.includes(id))
							option.attr("disabled", true);
					}
					else
						if (!possibleFilterValues.includes(id)) {
							option.attr("disabled", true);
						}
				}
			})
		}
	}

	populateScrollableSelection(selection: d3Selection) {
		var noFilterTxt = this.labels?.whenSearch ?? '';
		var freshSearchText = this.presenter.getFilterNames().length > 0 ?
			" Searching in " + this.presenter.getFilterNames().join(", ") : noFilterTxt;

    const item = this.presenter.currentItem();
		if (item instanceof SearchResults) {
			// add clear button
			if (this.presenter.getFilterNames().length > 0) {
				selection
					.append("div")
					.attr("class", "w3-container w3-center sidebar-button-container")
					.attr("id", "clearSearchFilterBtn")
					.append("button")
					.attr("class", "w3-button w3-black")
					.text(this.labels?.clearFilters ?? '')
					.on("click", () => {
						//redo search
						this.presenter.removeFilters();
						if (item.searchedFor)
							this.presenter.performSearch(item.searchedFor);
						else
							this.presenter.performSearchNoText();
					});
			}

			const initiatives = item == null ? [] : item.initiatives;
			switch (initiatives.length) {
				case 0:
					selection
							.append("div")
							.attr("class", "w3-container w3-center")
							.append("p")
							.text(this.labels?.nothingMatched ?? '');

					break;
				case 1:
					//this.populateSelectionWithO neInitiative(selection, initiatives[0]);
					this.populateSelectionWithListOfInitiatives(selection, initiatives);
					break;
				default:
					this.populateSelectionWithListOfInitiatives(selection, initiatives);
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
			if (this.presenter.getFilterNames().length > 0) {
				selection
					.append("div")
					.attr("class", "w3-container w3-center")
					.attr("id", "clearSearchFilterBtn")
					.append("button")
					.attr("class", "w3-button w3-black")
					.text(this.labels?.clearFilters ?? '')
					.on("click", () => {
						// only remove filters and and reset text, no re-search needed
						this.presenter.removeFilters();
						this.presenter.performSearchNoText();
						selection.select("#searchTooltipId").text(noFilterTxt);
						selection.select("#clearSearchFilterBtn").remove();
					});
			}
		}

	}
}

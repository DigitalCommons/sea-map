// The view aspects of the About sidebar
"use strict";
const d3 = require('d3');
const eventbus = require('../../eventbus');

function init(registry) {
  const config = registry('config');
  const sidebarView = registry('view/sidebar/base');
  const sseInitiative = registry('model/sse_initiative');
  const presenter = registry('presenter/sidebar/about');

  const labels = sseInitiative.getFunctionalLabels();

  // Our local Sidebar object:
  function Sidebar() { }

  // Our local Sidebar inherits from sidebar:
  var proto = Object.create(sidebarView.base.prototype);

  // And adds some overrides and new properties of it's own:
  proto.title = "about";
  proto.hasHistoryNavigation = false; // No forward/back buttons for this sidebar

  // TODO These same consts are here and in view/sidebar/initiative.
  //      Find a common place for them.
  const sectionHeadingClasses =
    "w3-bar-item w3-tiny w3-light-grey w3-padding-small";
  const hoverColour = " w3-hover-light-blue";
  const accordionClasses =
    "w3-bar-item w3-tiny w3-light-grey w3-padding-small" + hoverColour;
  const sectionClasses = "w3-bar-item w3-small w3-white w3-padding-small";

  proto.populateFixedSelection = function (selection) {
    let textContent = labels.aboutTitle;
    selection
      .append("div")
      .attr("class", "w3-container")
      .append("h1")
      .text(textContent);
  };

  proto.populateScrollableSelection = function (selection) {
    const that = this;

    const lang = config.getLanguage();
    
    // We need to be careful to guard against weird characters, especially quotes,
    // from the language code, as these can create vulnerabilities.
    if (lang.match(/[^\w -]/))
      throw new Error(`rejecting suspect language code '${lang}'`);
    
    selection
      .append('div')
      .attr("class", "w3-container about-text")
      .html(config.aboutHtml())
    // Remove all elements which have a language tag which is not the target language tag
      .selectAll(`[lang]:not([lang='${lang}'])`)
      .remove();
    
    const dataSection = selection.append('div')
      .attr("class", "w3-container about-data");

    const sourceParag = dataSection.append('p')
    sourceParag.text(labels.source)

    sourceParag
      .append('ul')
      .selectAll('li')
      .data(Object.values(sseInitiative.getDatasets()))
      .enter()
      .append('li')
      .append('a')
      .text(d => d.name)
      .attr('href', d => d.dgu.replace(/\/*$/, '/')) // ensure URI has trailing slash, needed for lod.coop
      .attr('target', '_blank');

    dataSection.append('p')
      .text(labels.technicalInfo);

    const technicalInfoUrl = 'https://github.com/SolidarityEconomyAssociation/sea-map/wiki';
    dataSection
      .append('p')
      .append('a')
      .text(technicalInfoUrl)
      .attr('href', technicalInfoUrl)
      .attr('target', '_blank');


    // If a version is available display it
    const version = config.getVersionTag();
    if (version) {
      selection
        .append("div")
        .attr("class", "w3-container about-version")
        .append("p")
        .attr("style", "font-style: italic;")
        .text(`sea-map@${version}`);
    }
  };


  Sidebar.prototype = proto;

  proto.hasHistoryNavigation = false;

  function createSidebar() {
    var view = new Sidebar();
    view.setPresenter(presenter.createPresenter(view));
    return view;
  }
  return {
    createSidebar: createSidebar
  };
}

module.exports = init;

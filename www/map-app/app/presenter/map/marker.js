define(["app/eventbus", "presenter", "model/config", "model/sse_initiative"], function (
  eventbus,
  presenter,
  config,
  sse_initiatives
) {
  "use strict";

  function Presenter() { }

  const proto = Object.create(presenter.base.prototype);
  const serviceToDisplaySimilarCompanies =
    document.location.origin +
    document.location.pathname +
    config.getServicesPath() +
    "display_similar_companies/main.php";

  proto.notifySelectionToggled = function (initiative) {
    eventbus.publish({ topic: "Marker.SelectionToggled", data: initiative });
  };
  proto.notifySelectionSet = function (initiative) {
    eventbus.publish({ topic: "Marker.SelectionSet", data: initiative });
  };

  proto.getLatLng = function (initiative) {
    return [initiative.lat, initiative.lng];
  };
  proto.getHoverText = function (initiative) {
    return initiative.name;
  };
  proto.prettyPhone = function (tel) {
    return tel.replace(/^(\d)(\d{4})\s*(\d{6})/, "$1$2 $3");
  };
  // proto.getAllOrgStructures = function() {
  //   return sse_initiatives.getVerboseValuesForFields()["Organisational Structure"];
  // };
  proto.getInitiativeContent = function (initiative) {
    let orgStructures = sse_initiatives.getVerboseValuesForFields()["Organisational Structure"];
    let activitiesVerbose = sse_initiatives.getVerboseValuesForFields()["Activities"];
    let address = "",
      street,
      locality,
      postcode,
      dotcoop =
        config.namedDatasets().indexOf("dotcoop") > -1 ||
        config.namedDatasets().indexOf("dotcooptest") > -1 ||
        config.namedDatasets().indexOf("dotcoop-sandbox") > -1,
      popupHTML =
        '<div class="sea-initiative-details">' +
        '<h2 class="sea-initiative-name">{initiative.name}</h2>' +
        '<h4 class="sea-initiative-org-structure">{initiative.org-structure}</h4>' +
        '<h4 class="sea-initiative-economic-activity">Activity: {initiative.economic-activity}</h4>' +
        "<p>{initiative.desc}</p>" +
        "{dotcoop.domains}" +
        "</div>" +
        '<div class="sea-initiative-contact">' +
        "<h3>Contact</h3>" +
        "{initiative.address}" +
        "{initiative.tel}" +
        '<div class="sea-initiative-links">' +
        "{initiative.www}" +
        "{initiative.email}" +
        "{initiative.facebook}" +
        "{initiative.twitter}" +
        "</div>" +
        "</div>";
    // All initiatives should have a name
    popupHTML = popupHTML.replace("{initiative.name}", initiative.name);
    // TODO Add org type
    if (initiative.orgStructure && initiative.orgStructure.length > 0) {
      popupHTML = popupHTML.replace(
        "{initiative.org-structure}",
        initiative.orgStructure.map(OS => orgStructures[OS]).join(", ")
      );
    }
    else {
      if (initiative.regorg) {
        popupHTML = popupHTML.replace(
          "{initiative.org-structure}",
          orgStructures[initiative.regorg.substr(initiative.regorg.lastIndexOf('/') + 1)]
        );
      } else {
        popupHTML = popupHTML.replace(
          "{initiative.org-structure}",
          ""
        );
      }

    }


    if (initiative.primaryActivity) {

      popupHTML = popupHTML.replace(
        "{initiative.economic-activity}",
        activitiesVerbose[initiative.primaryActivity]
      );
    } else {
      popupHTML = popupHTML.replace(
        "{initiative.economic-activity}",
        ""
      );

    }



    // All initiatives should have a description (this isn't true with dotcoop)
    popupHTML = popupHTML.replace("{initiative.desc}", initiative.desc || "");

    // If we're building a dotcoop map then list the domains
    if (initiative.www && dotcoop) {
      let domains = initiative.www.split(";");
      var domainsList = "<p>Domains</p><ul>";
      for (let domain of domains) {
        domainsList += '<li><a href="' + domain + '">' + domain + "</a></li>";
      }
      domainsList += "</ul>";
    }
    popupHTML = popupHTML.replace(
      "{dotcoop.domains}",
      domainsList ? domainsList : ""
    );

    // We want to add the whole address into a single para
    // Not all orgs have an address
    if (initiative.street) {
      let streetArray = initiative.street.split(";");
      for (let partial of streetArray) {
        if (partial === initiative.name) continue;
        if (street) street += "<br/>";
        street = street ? (street += partial) : partial;
      }
      address += street;
    }
    if (initiative.locality) {
      address += (address.length ? "<br/>" : "") + initiative.locality;
    }
    if (initiative.region) {
      address += (address.length ? "<br/>" : "") + initiative.region;
    }
    if (initiative.postcode) {
      address += (address.length ? "<br/>" : "") + initiative.postcode;
    }
    if (initiative.country) {
      address += (address.length ? "<br/>" : "") + initiative.country;
    }
    if (address.length) {
      address = '<p class="sea-initiative-address">' + address + "</p>";
    }
    popupHTML = popupHTML.replace("{initiative.address}", address);

    // Not all orgs have an email
    if (initiative.email) {
      popupHTML = popupHTML.replace(
        "{initiative.email}",
        '<a class="fa fa-at" href="mailto:' + initiative.email + '"></a>'
      );
    } else popupHTML = popupHTML.replace("{initiative.email}", "");

    // not all have twitter
    if (initiative.twitter) {
      popupHTML = popupHTML.replace(
        "{initiative.twitter}",
        '<a class="fab fa-twitter" href="https://twitter.com/' + initiative.twitter + '"></a>'
      );
    } else popupHTML = popupHTML.replace("{initiative.twitter}", "");

    // not all have a facebook
    if (initiative.facebook) {
      popupHTML = popupHTML.replace(
        "{initiative.facebook}",
        '<a class="fab fa-facebook" href="https://facebook.com/' + initiative.facebook + '"></a>'
      );
    } else popupHTML = popupHTML.replace("{initiative.facebook}", "");

    // Not all orgs have a phone number
    popupHTML = popupHTML.replace(
      "{initiative.tel}",
      initiative.tel
        ? '<p class="sea-initiative-tel">' +
        this.prettyPhone(initiative.tel) +
        "</p>"
        : ""
    );
    // Not all orgs have a website
    popupHTML = popupHTML.replace(
      "{initiative.www}",
      initiative.www && !dotcoop
        ? '<a class="fa fa-link" target="_blank" href="' +
        initiative.www +
        '"></a>'
        : ""
    );

    return popupHTML;
  };

  proto.getMarkerColor = function (initiative) {
    const hasWww = initiative.www && initiative.www.length > 0;
    const hasReg = initiative.regorg && initiative.regorg.length > 0;
    const markerColor =
      hasWww && hasReg ? "purple" : hasWww ? "blue" : hasReg ? "red" : "green";
    return markerColor;
  };
  proto.getIconOptions = function (initiative) {
    const icon = initiative.dataset == "dotcoop" ? "globe" : "certificate";
    return {
      icon: icon,
      popuptext: popuptext,
      hovertext: hovertext,
      cluster: true,
      markerColor: markerColor
    };
  };
  proto.getIcon = function (initiative) {
    return initiative.dataset == "dotcoop" ? "globe" : "certificate";
  };

  Presenter.prototype = proto;

  function createPresenter(view) {

    const p = new Presenter();
    p.registerView(view);
    return p;
  }

  var pub = {
    createPresenter: createPresenter
  };
  return pub;
});

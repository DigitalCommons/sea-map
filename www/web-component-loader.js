'use strict';

(function(){
	let tmpl = document.createElement('template');
	tmpl.innerHTML = `
		<!-- Sidebar -->
		<div class="w3-sidebar w3-teal w3-bar-block w3-border-right w3-animate-left w3-mobile"
			style="display:none;flex-direction:column;" 
			id="sidebar">
			<div style="flex: 0 1 auto;">
				<div id="sidebar-header">
				</div>
			</div>
			<!-- Fixed part of Sidebar that may change for different types of the sidebar (e.g. Search results) -->
			<!-- If this is not a separate flex div, then it doesn't quite render properly on iPhone:
			     the bottom of the div slightly overlaps the scrollable section of the sidebar below -->
			<div style="flex: 0 1 auto;">
				<div id="sidebar-fixed-section"></div>
			</div>
			<!-- scrollable part of sidebar -->
			<!-- occupies the remaining vertical space, with scrollbar added if needed. -->
			<div id="sidebar-scrollable-section" class="w3-white" style="flex: 1 1 auto;overflow-y:auto;height:100%">
			</div>
		</div>
		<!-- Page Content -->
		<div class="w3-teal content">
			<div class="mapContainer" id="map">
			</div>
			<div class="w3-display-container display-container">
				<!--  Button to show sidebar -->
				<div id="sidebar-button">
				</div>
				<!--  Search box -->
				<div id="search-widget">
				</div>
			</div>
		</div>

	`;
	class MapApp extends HTMLElement {
		// element to which the above template is to be attached.
		// To properly encapsulate the map-app, this should be the shadow DOM 
		// attached to this custom element.
		// However, that did not work on first try!
		// So, as a temporary fix, append to the <map-app> element in the normal DOM
		parentElement: null;

		constructor() {
			// establish prototype chain
			super();

			console.log("MapApp constructor");


			// For proper encapsulation: USE THE SHADOW DOM:
			// (need more work to debug it - doesn't seem to load via require.js when we do this)
			//
			// attaches shadow tree and returns shadow root reference
			// https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow
			//this.parentElement = this.attachShadow({ mode: 'open' });

			// Workaround: DON'T USE THE SHADOW DOM:
			this.parentElement = this;
			this.parentElement.appendChild(tmpl.content.cloneNode(true));

			// For testing only:
			const script = document.createElement('script');
			script.innerText = 'console.log("Script inside template");';
			this.parentElement.appendChild(script);
		}
		connectedCallback() {
			console.log("MapApp connectedCallback");

			// Get require.js to load the app:
			// <script data-main="app" src="lib/require.js"></script> 
			const loader = document.createElement('script');
			const dataMain = document.createAttribute('data-main');
			dataMain.value = 'app';	// i.e. app.js
			loader.setAttributeNode(dataMain);
			const src = document.createAttribute('src');
			src.value = 'lib/require.js';
			loader.setAttributeNode(src);
			this.parentElement.appendChild(loader);
		}
	}
	customElements.define('map-app', MapApp);


})();

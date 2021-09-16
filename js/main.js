// Essential Imports
import 'ol/ol.css';
import BingMaps from 'ol/source/BingMaps';
import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import {defaults as defaultControls} from 'ol/control';
import {defaults as interactionDefaults} from 'ol/interaction';
import $ from 'jquery';
import olms from 'ol-mapbox-style';

// #####################################################
// VARIABLE DEFINITIONS
// #####################################################

var Main = function() {
  return;
 };

Main.focussedMap = -1;

Main.maps = [
  {
    "id" : 1,
    "name": "Aerial",
    "description": "Satellite",
    "keybind": 49,
    "slider": "sldArial",
    "type": "bing",
    "initialOpacity" : 100
  },
  {
    "id" : 2,
    "name": "OrdnanceSurvey",
    "description": "Ordnance Survey",
    "keybind": 50,
    "slider": "sldOS",
    "type": "bing",
    "initialOpacity" : 50
  },
  {
    "id" : 3,
    "name": "OSM",
    "description": "OSM",
    "keybind": 51,
    "slider": "sldOsmOutdoor",
    "type": "osm",
    "initialOpacity" : 0
  }
]

Main.layers = [];


// Essential Exports
window.$ = $;
window.Main = Main;

// #####################################################
// MAIN FUNCTIONS
// #####################################################

Main.setLayerOpacity = function(layerName, opacity) {
  if(opacity < 0 || opacity > 1) {
    console.log("Warning, invalid opacity ("+opacity+") specified for layer "+layerName)
  } else {
    console.log("Setting opacity for layer "+layerName+" to "+opacity)
    for (var i = 0, layersLength = Main.layers.length; i < layersLength; ++i) {
      if(Main.layers[i].get("name") === layerName) {
        if( opacity > 0) {
          Main.layers[i].setVisible(true);
          Main.layers[i].setOpacity(opacity);
        } else {
          Main.layers[i].setVisible(false);
        }
      }
    }
  }
}

Main.handleOpacityChange = function() {
  console.log(Main.maps);
  console.log("Test");
  for (var i = 0; i < Main.maps.length; i++) {
    var currentSlider = Main.maps[i].slider;
    $("#txtSlider"+Main.maps[i].id).removeClass("focusedMap");
    var sliderValue = $("#"+currentSlider).val();
    console.log("Slider "+currentSlider+ " is at " +sliderValue);
    Main.setLayerOpacity(Main.maps[i].name,sliderValue/100);
  }
}

Main.focus = function(mapToFocus) {
  if(Main.focussedMap === mapToFocus) {
    console.log("Map "+mapToFocus+ " is already focussed - cancelling focus.");
    // Map already has focus, so cancel the focus by going back to the slider values
    Main.focussedMap = -1;
    Main.handleOpacityChange();
  } else {
    Main.focussedMap = mapToFocus;
    for (var i = 0; i < Main.maps.length; i++) {
      if(mapToFocus === Main.maps[i].id) {
        console.log("Map "+mapToFocus+ " found - setting focus on layer.");
        $("#txtSlider"+Main.maps[i].id).addClass("focusedMap");
        Main.setLayerOpacity(Main.maps[i].name, 1);
      } else {
        $("#txtSlider"+Main.maps[i].id).removeClass("focusedMap");
        Main.setLayerOpacity(Main.maps[i].name, 0);
      }
    }
  }
}

// #####################################################
// EVENT REGISTRATION HANDLERS
// #####################################################

$( document ).ready(function() {
  console.log("Initialising Page....");

  for (var i = 0, ii = Main.maps.length; i < ii; ++i) {
    // Add the map layers to Open Layers
    if(Main.maps[i].type ==="bing") {
      console.log("Adding Bing map "+Main.maps[i].name)
      Main.layers.push(
        new TileLayer({
          name: Main.maps[i]["name"],
          visible: false,
          preload: Infinity,
          source: new BingMaps({
            key: process.env.bingkey,
            imagerySet: Main.maps[i]["name"],
            // use maxZoom 19 to see stretched tiles instead of the BingMaps
            // "no photos at this zoom level" tiles
            // maxZoom: 19
          }),
        })
      );
    } else if (Main.maps[i].type ==="osm") {

    }

    // Create an opacity slider for the map
    var $divToEnter = $( "<div class='slidecontainer'><p id='txtSlider"+Main.maps[i].id+"'>"+Main.maps[i].description+"</p><input type='range' min='0' max='100' value='"+Main.maps[i].initialOpacity+"' class='slider' id='"+Main.maps[i].slider+"'></div>" );
    $("#opacityControl").append($divToEnter);
    $("#"+Main.maps[i].slider).on("change", function() {
      Main.handleOpacityChange();
    });
  }

  Main.map = new Map({
    layers: Main.layers,
    target: 'map',
    interactions : interactionDefaults({doubleClickZoom :false}),
    view: new View({
      center: [-340000, 7250000],
      zoom: 13,
    }),
    controls : defaultControls({
      zoom:false,
    })
  });

  // Set Initial mapping state
  Main.handleOpacityChange();

  // Start the routing system
  Routes.initialise();

  // Register some global event handlers
  $("#btnNewRoute").on("click", function() {
    console.log("New route requested by GUI.");
    var route = Routes.newRoute();
    var $divToEnter = $( "<div class='routeContainer'><input type='textbox' value='"+route.name+"' class='routeNameTextbox' id='routeName-"+route.id+"'></div>" );
    $("#routeControl").append($divToEnter);
    Routes.startSketching(route);
  });

  $(document).on("keypress", function(e) {
    console.log("Key "+e.which+" pressed.");
    for(var i = 0; i < Main.maps.length; i++) {
      console.log("Checking if map "+Main.maps[i].name+" matching this keybinding...");
      if(e.which == Main.maps[i].keybind) {
        Main.focus(Main.maps[i].id);
      }
    }
  });
});


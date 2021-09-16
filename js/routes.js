// Essential Imports
import 'ol/ol.css';
import Map from 'ol/Map';

import Draw from 'ol/interaction/Draw';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {LineString, Polygon} from 'ol/geom';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {getArea, getLength} from 'ol/sphere';
import {unByKey} from 'ol/Observable';
import GPX from 'ol/format/GPX';
import FileSaver from 'file-saver';

import $ from 'jquery';

var Routes = function() {
    return;
};

Routes.sketch;
Routes.sketchLock = false;
Routes.currentRoute;
Routes.helpTooltipElement;
Routes.helpTooltip;
Routes.measureTooltipElement;
Routes.measureTooltip;
Routes.continueLineMsg = 'Click to continue drawing the line';
Routes.source = new VectorSource();
Routes.draw;
Routes.newRouteNameCounter = 1;
Routes.selectedRoute;

Routes.routeList = [];

Routes.vectorLayer = new VectorLayer({
  source: Routes.source,
  style: new Style({
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.2)',
    }),
    stroke: new Stroke({
      color: '#ffcc33',
      width: 2,
    }),
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({
        color: '#ffcc33',
      }),
    }),
  }),
});

window.Routes = Routes;
window.GPX = GPX;

class Route {
    constructor() {
        this.id = Routes.newRouteNameCounter;
        this.name = "New Route "+Routes.newRouteNameCounter++;
        this.source = new VectorSource();
        this.vectorLayer = new VectorLayer({
            source: this.source,
            style: new Style({
              fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
              }),
              stroke: new Stroke({
                color: '#ffcc33',
                width: 2,
              }),
              image: new CircleStyle({
                radius: 7,
                fill: new Fill({
                  color: '#ffcc33',
                }),
              }),
            }),
        });
        window.Main.map.addLayer(this.vectorLayer);
    }
}

Routes.initialise = function() {
    console.log("Initialising routing system");
    var map = window.Main.map;

    Routes.createMeasureTooltip();
    Routes.createHelpTooltip();
    Routes.helpTooltipElement.classList.add('hidden');
    Routes.measureTooltipElement.classList.add('hidden');

    window.Main.map.on('pointermove', Routes.pointerMoveHandler);
      
    window.Main.map.getViewport().addEventListener('mouseout', function () {
        Routes.helpTooltipElement.classList.add('hidden');
    });
    //map.addLayer(Routes.vectorLayer)
    //Routes.addInteraction();
}

Routes.newRoute = function() {
    const route = new Route();
    console.log("Created new route "+route.name);
    this.routeList.push(route);
    Routes.selectedRoute = route;
    return route;
}

Routes.startSketching = function(route) {
    console.log("Attempting to start sketching for route: "+route.name);
    if(Routes.sketchLock) {
        if(Routes.sketch) {
            alert("Already creating a route ("+Routes.currentRoute.name+"). Please start (click anywhere on the map) and finish (double click on the map once started) before creating another.");
            console.log("Failed to get sketch lock - lock held by "+Routes.currentRoute.name+" and the route has been started.");
        } else {
            alert("Already creating a route ("+Routes.currentRoute.name+"). Please finish that route before starting another (double click on the map to finish)");
            console.log("Failed to get sketch lock - lock held by "+Routes.currentRoute.name+", but the route has not yet been started.");
        }
    } else {
        console.log("Sketch lock obtained for route: "+route.name);
        Routes.addInteraction(route);
        Routes.sketchLock = true;
        Routes.currentRoute = route;
    }
}

Routes.pointerMoveHandler = function (evt) {
  if (evt.dragging) {
    return;
  }
  
  var helpMsg = 'Click to start drawing';

  if (Routes.sketch) {
    helpMsg = Routes.continueLineMsg;
  }

  Routes.helpTooltipElement.innerHTML = helpMsg;
  Routes.helpTooltip.setPosition(evt.coordinate);

  if(Routes.sketchLock) {
    Routes.helpTooltipElement.classList.remove('hidden');
  } else {
    Routes.helpTooltipElement.classList.add('hidden');
  }
};

Routes.formatLength = function (line) {
  var length = getLength(line);
  var output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
  } else {
    output = Math.round(length * 100) / 100 + ' ' + 'm';
  }
  return output;
};

Routes.addInteraction = function(route) {
  var type = 'LineString';
  Routes.draw = new Draw({
    source: route.source,
    type: type,
    style: new Style({
      stroke: new Stroke({
        color: 'rgba(235, 52, 177, 0.8)',
        lineDash: [5, 7],
        width: 4,
      }),
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 1)',
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
      }),
    }),
  });
  window.Main.map.addInteraction(Routes.draw);

  var listener;
  Routes.draw.on('drawstart', function (evt) {
    // set sketch
    Routes.sketch = evt.feature;

    /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
    var tooltipCoord = evt.coordinate;

    listener = Routes.sketch.getGeometry().on('change', function (evt) {
        var geom = evt.target;
        var output;
        output = Routes.formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
        Routes.measureTooltipElement.innerHTML = output;
        Routes.measureTooltip.setPosition(tooltipCoord);
    });
  });

  Routes.draw.on('drawend', function () {
    window.Main.map.removeInteraction(Routes.draw);
    Routes.sketchLock = false;
    Routes.currentRoute = null;

    Routes.measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    Routes.measureTooltip.setOffset([0, -7]);
    // unset sketch
    Routes.sketch = null;
    // unset tooltip so that a new one can be created
    Routes.measureTooltipElement = null;
    Routes.createMeasureTooltip();
    unByKey(listener);

    $("#fred").on("click",function(){
        
    });

  });
}

Routes.download = function() {
    // GPX TESTING
    var route = Routes.routeList[0];
    var format = new GPX();
    var gpx = format.writeFeatures(route.source.getFeatures());
    var blob = new Blob([gpx], {type: "data:text/xml;charset=utf-8"});
    FileSaver.saveAs(blob,"newroute.gpx");
}

/**
 * Creates a new help tooltip
 */
Routes.createHelpTooltip = function() {
  if (Routes.helpTooltipElement) {
    Routes.helpTooltipElement.parentNode.removeChild(Routes.helpTooltipElement);
  }
  Routes.helpTooltipElement = document.createElement('div');
  Routes.helpTooltipElement.className = 'ol-tooltip hidden';
  Routes.helpTooltip = new Overlay({
    element: Routes.helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left',
  });
  window.Main.map.addOverlay(Routes.helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
Routes.createMeasureTooltip = function() {
  if (Routes.measureTooltipElement) {
    Routes.measureTooltipElement.parentNode.removeChild(Routes.measureTooltipElement);
  }
  Routes.measureTooltipElement = document.createElement('div');
  Routes.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  Routes.measureTooltip = new Overlay({
    element: Routes.measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
  });
  window.Main.map.addOverlay(Routes.measureTooltip);
}
import './style/style.css'
import * as helpers from './lib/helpers';
import * as tools from './lib/tools';
import orbit from './lib/orbit';
import srcFloor from '/floors/floor.svg?raw';
import type * as Types from './lib/types';
import { SVG, Polyline, PointArray, Polygon } from '@svgdotjs/svg.js'
import { Surface } from './lib/shapes';



function frame(fastRender: boolean, rotation: number, tilt: number, height: number) {
  for (const surface of surfaces) surface.reset();
  tools.transform(surfaces, rotation, tilt);
  if (fastRender) {
    for (const surface of surfaces) surface.draw(fastRender, height);
  } else {
    const surfacesSorted = tools.sortSurfaces(surfaces, false);
    for (const surface of surfacesSorted) surface.draw(fastRender, height);
  }
}

const svg = SVG().size(1000, 800);
const svgSize: Types.Point = { x: new Number(svg.width()).valueOf(), y: new Number(svg.height()).valueOf() };
const stage = svg;

svg.addTo('body');


// Import floor plan SVG
const s = SVG().svg(srcFloor);
// Get the elements inside the SVG file. We have to do 'children()' twice because the top-level
// child is just the SVG tag itself
const elements = s.children()[0].children();

const surfaces: Surface[] = [];

function pointsToSurfaces(points: PointArray, addFirstAgain=false) {
  let trailingPoint = helpers.arrayXYToPoint(points[0]);
  if (addFirstAgain) points.push(points[0]);
  for (let i = 1; i < points.length; i++) {
    const point = helpers.arrayXYToPoint(points[i]);
    surfaces.push(new Surface(stage, trailingPoint, point));
    trailingPoint = point;
  }
}

for (const element of elements) {
  if (element instanceof Polyline) pointsToSurfaces(element.array());
  if (element instanceof Polygon) pointsToSurfaces(element.array(), true);
}

tools.centerScale(surfaces, svgSize);

new orbit(svg.node, frame);
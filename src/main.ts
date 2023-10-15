import './style/style.css'
import * as tools from './lib/tools';
import srcFloor from '/floors/floor-outlined.svg?raw';
import orbit from './lib/orbit';
import type * as Types from './lib/types';
import * as parser from './lib/parser';
import { SVG } from '@svgdotjs/svg.js'
import { Entity, Surface } from './lib/shapes';



const svg = SVG().size(1000, 800);
const svgSize: Types.Point = { x: new Number(svg.width()).valueOf(), y: new Number(svg.height()).valueOf() };
const stage = svg;

svg.addTo('body');


const entities: Entity[] = parser.parse(stage, svgSize, srcFloor);
const surfaces = entities.filter((e) => e instanceof Surface) as Surface[];

function frame(fastRender: boolean, rotation: number, tilt: number, height: number) {
  for (const entity of entities) entity.reset();
  tools.transform(entities, rotation, tilt);
  if (fastRender) {
    for (const entity of entities) entity.draw(fastRender, height);
  } else {
    const surfacesSorted = tools.sortSurfaces(surfaces, false);
    for (const surface of surfacesSorted) surface.draw(fastRender, height);
  }
}

new orbit(svg.node, frame);
import { G, Path, PointArray, Polygon, Polyline, SVG, Svg } from '@svgdotjs/svg.js';
import { Entity } from '../shapes';
import type * as Types from '../types';
import * as tools from '../tools';
import * as layer from '../layers';
// import * as helpers from '../helpers';
import '@svgdotjs/svg.topoly.js';
import { Rect } from '@svgdotjs/svg.js';

const parseFloorplan = (src: G, interior: layer.Interior, outline: layer.Outline, walls: layer.Walls) => {
  const elements = src.children();
  const entities: Entity[] = [];
  for (const element of elements) {
    const id = element.id().replace(/_x5F/gm, '');
    console.log(`Adding '${id}'`);
    if (id === 'outline') {
      let points: PointArray;
      if (element instanceof Path) {
        points = element.toPoly().array();
      } else if (element instanceof Polygon || element instanceof Polyline) {
        points = element.array();
      } else if (element instanceof Rect) {
        points = tools.rectToPoints(element);
      } else {
        console.warn(`Invalid Shape Type: '${element.type}'\nElement named '${id}' could not be parsed as an outline because it was not a Rect, Path, Polygon or Polyline. `);
        continue;
      }
      outline.set(points, walls);
    } else if (id === 'interior') {
      if (element instanceof Path) {
        interior.set(element);
      } else {
        console.warn(`Invalid Shape Type: '${element.type}'\nElement named '${id}' could not be parsed as an interior because it was not a Path. `);
      }
    }
  }
  return entities;
}

const parseRooms = (src: G, rooms: layer.Rooms, walls: layer.Walls) => {
  const elements = src.children();
  const entities: Entity[] = [];
  for (const element of elements) {
    const id = element.id().replace(/_x5F/gm, '');
    if (element instanceof G) {
      console.log(`Adding room group '${id}'`);
      parseRooms(element, rooms, walls);
    } else {
      console.log(`Adding room '${id}'`);
      let points: PointArray;
      if (element instanceof Polygon || element instanceof Polyline) {
        points = element.array();
      } else if (element instanceof Rect) {
        points = tools.rectToPoints(element);
      } else {
        console.warn(`Invalid Shape Type: '${element.type}'\nElement named '${id}' could not be parsed as a room because it was not a Rect, Polygon or Polyline. `);
        continue;
      }
      rooms.add(points, id);
      walls.add(points, id);
    }
  }
  return entities;
}

export const parse = (stage: Svg, svgSize: Types.Point, inputSVG: string) => {

  // Import floor plan SVG
  const s = SVG().svg(inputSVG);
  // Get the elements inside the SVG file. We have to do 'children()' twice because the top-level
  // child is just the SVG tag itself
  const elements = s.children()[0].children();
  console.log(elements);


  const walls = new layer.Walls(stage);
  const interior = new layer.Interior(stage);
  const rooms = new layer.Rooms(stage);
  const outline = new layer.Outline(stage);

  for (const element of elements) {

    if (element instanceof G) {
      const id = element.id();
      switch (id) {
        case 'plan':
          parseFloorplan(element, interior, outline, walls);
          break;
        case 'room':
        case 'rooms':
          parseRooms(element, rooms, walls);
          break;
        case 'doors':
        case 'door':
          break
        default:
          console.warn(`Unknown group name '${id}'`);
      }
    }
  }

  const basisTranslation = outline.getBasisTranslation();

  const center = {
    x: svgSize.x / 2,
    y: svgSize.y / 2
  }

  const scale = 0.5;

  walls.centerScale(center, basisTranslation, scale);
  rooms.centerScale(center, basisTranslation, scale);
  interior.centerScale(center, basisTranslation, scale);
  outline.centerScale(center, basisTranslation, scale);
}
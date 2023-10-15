import { G, Path, PointArray, Polygon, Polyline, SVG, Svg } from '@svgdotjs/svg.js';
import { Entity, PathWrapper, Surface } from '../shapes';
import type * as Types from '../types';
import * as tools from '../tools';
import * as helpers from '../helpers';
import '@svgdotjs/svg.topoly.js';
import { Rect } from '@svgdotjs/svg.js';

const rectToPoints = (rect: Rect) => {
  const x = new Number(rect.x()).valueOf();
  const y = new Number(rect.y()).valueOf();
  const w = new Number(rect.width()).valueOf();
  const h = new Number(rect.height()).valueOf();
  return new PointArray([
    x, y,
    x + w, y,
    x + w, y + h,
    x, y + h,
    x, y,
  ]);
}

const pointsToSurfaces = (points: PointArray, stage: Svg, addFirstAgain = false): Surface[] => {
  let trailingPoint = helpers.arrayXYToPoint(points[0]);
  if (addFirstAgain) points.push(points[0]);
  const surfaces: Surface[] = [];
  for (let i = 1; i < points.length; i++) {
    const point = helpers.arrayXYToPoint(points[i]);
    surfaces.push(new Surface(stage, trailingPoint, point));
    trailingPoint = point;
  }
  return surfaces;
}

const parseFloorplan = (group: G, stage: Svg) => {
  const elements = group.children();
  const entities: Entity[] = [];
  for (const element of elements) {
    const id = element.id().replace(/_x5F/gm, '');
    console.log(`Adding '${id}'`);
    if (id === 'outline') {
      if (element instanceof Path) {
        const pointArray = element.toPoly()
        entities.push(...pointsToSurfaces(pointArray.array(), stage));
      } else if (element instanceof Polygon) {
        entities.push(...pointsToSurfaces(element.array(), stage, true));
      } else if (element instanceof Polyline) {
        entities.push(...pointsToSurfaces(element.array(), stage));
      } else if (element instanceof Rect) {
        entities.push(...pointsToSurfaces(rectToPoints(element), stage));
      } else {
        console.warn(`Invalid Shape Type: '${element.type}'\nElement named '${id}' could not be parsed as an outline because it was not a Rect, Path, Polygon or Polyline. `);
      }
    } else if (id === 'interior') {
      // stage.add(element.fill({color: '#fff'}));
      // console.log(stage)
      if (element instanceof Path) {
        entities.push(new PathWrapper(element, stage));
      } else {
        console.warn(`Invalid Shape Type: '${element.type}'\nElement named '${id}' could not be parsed as an interior because it was not a Path. `);
      }

    }
  }
  return entities;
}

// TODO: Make room objects
const parseRooms = (group: G, stage: Svg) => {
  const elements = group.children();
  const entities: Entity[] = [];
  for (const element of elements) {
    const id = element.id().replace(/_x5F/gm, '');
    if (element instanceof G) {
      console.log(`Adding room group '${id}'`);
      entities.push(...parseRooms(element, stage));
    } else {
      console.log(`Adding room '${id}'`);
      if (element instanceof Polygon) {
        entities.push(...pointsToSurfaces(element.array(), stage, true));
      } else if (element instanceof Polyline) {
        entities.push(...pointsToSurfaces(element.array(), stage));
      } else if (element instanceof Rect) {
        entities.push(...pointsToSurfaces(rectToPoints(element), stage));
      } else {
        console.warn(`Invalid Shape Type: '${element.type}'\nElement named '${id}' could not be parsed as a room because it was not a Rect, Polygon or Polyline. `);
      }
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

  const entities: Entity[] = [];

  console.log(elements);

  for (const element of elements) {

    if (element instanceof G) {
      const id = element.id();
      switch (id) {
        case 'plan':
          entities.push(...parseFloorplan(element, stage));
          break;
        case 'room':
        case 'rooms':
          entities.push(...parseRooms(element, stage));
          break;
        case 'doors':
        case 'door':
          break
        default:
          console.warn(`Unknown group name '${id}'`);
      }
    }


    // // console.log(element);
    // if (element instanceof Polyline) entities.concat(pointsToSurfaces(element.array(), stage));
    // if (element instanceof Polygon) entities.concat(pointsToSurfaces(element.array(), stage, true));
    // if (element instanceof Path) {
    //   // console.log(element);
    //   // console.log(element.array());
    // }
  }

  const surfaces = entities.filter((e) => e instanceof Surface) as Surface[];
  tools.centerScale(surfaces, svgSize);

  // console.log(entities);

  return entities;
}
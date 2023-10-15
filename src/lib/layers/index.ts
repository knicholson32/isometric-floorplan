import { Svg } from '@svgdotjs/svg.js';
import type * as Types from '../types';
import { G } from '@svgdotjs/svg.js';
import { Entity, PathWrapper, Surface } from '../shapes';
import * as helpers from '../helpers';
import { PointArray } from '@svgdotjs/svg.js';
import { Path } from '@svgdotjs/svg.js';

export class Layer {

  layer: G;

  static layers: Layer[] = [];

  static getAllEntities() {
    const entities: Entity[] = [];
    for (const layer of Layer.layers) entities.push(...layer.getEntities());
    return entities;
  }

  static get() {
    return this.layers;
  }

  constructor(stage: Svg, id: string) {
    this.layer = stage.group();
    this.layer.id(id);
    Layer.layers.push(this);
  }

  front() {
    this.layer.front();
  }

  centerScale(_center: Types.Point, _scale: number) {}

  getEntities(): Entity[] {
    return [];
  }

}



export class Walls extends Layer {

  walls: Surface[];

  constructor(stage: Svg) {
    super(stage, 'Walls');
    this.walls = [];
  }

  addWall(point1: Types.Point, point2: Types.Point) {
    this.walls.push(new Surface(this.layer, point1, point2));
  }

  add(points: PointArray) {
    // Make sure the last point goes back to the first point
    if (points[0][0] !== points[points.length-1][0]) points.push(points[0]);
    let trailingPoint = helpers.arrayXYToPoint(points[0]);
    for (let i = 1; i < points.length; i++) {
      const point = helpers.arrayXYToPoint(points[i]);
      this.addWall(trailingPoint, point);
      trailingPoint = point;
    }
  }

  getBoundingBox() {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const surface of this.walls) {
      if (surface.point1.x < minX) minX = surface.point1.x;
      if (surface.point2.x < minX) minX = surface.point2.x;
      if (surface.point1.x > maxX) maxX = surface.point1.x;
      if (surface.point2.x > maxX) maxX = surface.point2.x;
      if (surface.point1.y < minY) minY = surface.point1.y;
      if (surface.point1.y < minY) minY = surface.point1.y;
      if (surface.point2.y > maxY) maxY = surface.point2.y;
      if (surface.point2.y > maxY) maxY = surface.point2.y;
    }
    return { minX, minY, maxX, maxY };
  }

  centerScale(center: Types.Point, scale: number) {
    // Move the floorplan to the 0,0 position
    let mm = this.getBoundingBox();
    const translate = {
      x: -mm.minX - (mm.maxX - mm.minX) / 2,
      y: -mm.minY - (mm.maxY - mm.minY) / 2
    };
    for (const entity of this.walls) entity.basisTranslate(translate);
    // TODO: Calculate this better
    for (const entity of this.walls) entity.basisScale(scale);

    // mm = getMinMaxCoords(surfaces);
    // stage.polygon([mm.minX,mm.minY, mm.minX,mm.maxY, mm.maxX,mm.maxY, mm.maxX,mm.minY, mm.minX,mm.minY]).fill({opacity: 0}).stroke({color: '#f00', width: 3});
    // The transformations will all be done around 0,0. After translations, the running translate points will move the 
    // shape to be centered around the specified location
    for (const entity of this.walls) entity.runningTranslate(center);
  }

  getEntities(): Entity[] {
    return this.walls;
  }

}


export class Rooms extends Layer {

  constructor(stage: Svg) {
    super(stage, 'Rooms');
  }

  add(points: PointArray) {
    if (points[0][0] !== points[points.length - 1][0]) points.push(points[0]);
  }

}

export class Interior extends Layer {

  path: PathWrapper | undefined;

  constructor(stage: Svg) {
    super(stage, 'Interior');
  }

  set(p: Path) {
    this.path = new PathWrapper(p, this.layer);
  }

  centerScale(center: Types.Point, scale: number) {
    if (this.path === undefined) return;
    this.path.basisScale(scale);
    this.path.runningTranslate(center);
  }

  getEntities(): Entity[] {
    if (this.path === undefined) return [];
    else return [this.path];
  }

}

export class Outline extends Layer {

  constructor(stage: Svg) {
    super(stage, 'Interior');
  }

  set(points: PointArray) {
    if (points[0][0] !== points[points.length - 1][0]) points.push(points[0]);
  }

}
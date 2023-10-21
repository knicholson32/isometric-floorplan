import type { Svg } from '@svgdotjs/svg.js';
import type * as Types from '$lib/types';
import type { G } from '@svgdotjs/svg.js';
import { Entity, Extrusion, PathWrapper, PolyWrapper, Surface } from '$lib/shapes';
import * as helpers from '$lib/helpers';
import type { PointArray } from '@svgdotjs/svg.js';
import type { Path } from '@svgdotjs/svg.js';
import { Box } from '@svgdotjs/svg.js';
import { Door } from '$lib/features';

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

	centerScale(_center: Types.Point, _basisTranslation: Types.Point, _scale: number) {}

	getEntities(): Entity[] {
		return [];
	}
}

export class Walls extends Layer {
	walls: Surface[];

	constructor(stage: Svg) {
		super(stage, 'walls');
		this.walls = [];
	}

	addWall(point1: Types.Point, point2: Types.Point, roomID: string) {
		// this.walls.push(new Wall(this.layer, roomID, point1, point2, ['wall', roomID]));
		this.walls.push(new Surface(this.layer, point1, point2, roomID, ['wall', roomID]));
	}

	add(points: PointArray, roomID: string) {
		// Make sure the last point goes back to the first point
		if (
			points[0][0] !== points[points.length - 1][0] ||
			points[0][1] !== points[points.length - 1][1]
		)
			points.push(points[0]);
		let trailingPoint = helpers.arrayXYToPoint(points[0]);
		for (let i = 1; i < points.length; i++) {
			const point = helpers.arrayXYToPoint(points[i]);
			this.addWall(trailingPoint, point, roomID);
			trailingPoint = point;
		}
	}

	assignDoors(segmentsToCheck: Types.LineSegment[]) {
		// We need to go through every wall and check if any are intersected by exactly two of these segments
		const doors: Door[] = [];
		for (const wall of this.walls) {
			const wallSegment = wall.getAsSegment();

			const intersectPoints: Types.Point[] = [];
			// Loop through each segment and check intersections
			for (const segment of segmentsToCheck) {
				const intersection = helpers.lineSegmentsIntersect(wallSegment, segment);
				if (intersection !== null) intersectPoints.push(intersection);
			}

			// If there were two intersections, this is a wall that needs a door
			if (intersectPoints.length >= 2) {
				const fullScale = helpers.distanceBetween(wallSegment.p1, wallSegment.p2);
				const descriptions: Types.DoorDescription[] = [];
				for (let i = 0; i < intersectPoints.length; i += 2) {
					// We need to save the two ratios for the door: Two values that represent how far along
					// the surface the door should start and end, as a value from 0-1;
					const r1 = helpers.distanceBetween(wallSegment.p1, intersectPoints[0]) / fullScale;
					const r2 = helpers.distanceBetween(wallSegment.p1, intersectPoints[1]) / fullScale;
					descriptions.push({ r1, r2 });
				}

				const d = new Door(wall, descriptions);
				doors.push(d);
			}
		}

		if (doors.length > 1) {
			console.log(doors.length);
			for (let i = 0; i < doors.length; i += 2) {
				const d1 = doors[i];
				const d2 = doors[i + 1];
				d1.link(d2);
				d2.link(d1);
			}
		}

		// for (const remove of toRemove) remove.remove();
		// this.walls = this.walls.filter((e) => !toRemove.includes(e));
		// this.walls = this.walls.concat(doors);
	}

	getBoundingBox() {
		let minX = Infinity,
			minY = Infinity;
		let maxX = -Infinity,
			maxY = -Infinity;
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

	static _translate: Types.Point = { x: 0, y: 0 };
	centerScale(center: Types.Point, basisTranslation: Types.Point, scale: number) {
		// Move the floorplan to the 0,0 position
		// let mm = this.getBoundingBox();
		// const translate = {
		//   x: -mm.minX - (mm.maxX - mm.minX) / 2,
		//   y: -mm.minY - (mm.maxY - mm.minY) / 2
		// };
		// Walls._translate = translate;
		for (const entity of this.walls) entity.basisTranslate(basisTranslation);
		// TODO: Calculate this better
		for (const entity of this.walls) entity.basisScale(scale);

		// mm = getMinMaxCoords(surfaces);
		// stage.polygon([mm.minX,mm.minY, mm.minX,mm.maxY, mm.maxX,mm.maxY, mm.maxX,mm.minY, mm.minX,mm.minY]).fill({opacity: 0}).stroke({color: '#f00', width: 3});
		// The transformations will all be done around 0,0. After translations, the running translate points will move the
		// shape to be centered around the specified location
		for (const entity of this.walls) entity.runningTranslate(center);
	}

	getEntities(): Entity[] {
		const entities: Entity[] = [];
		for (const wall of this.walls) entities.push(wall);
		return entities;
	}
}

export class Rooms extends Layer {
	polys: PolyWrapper[] = [];

	constructor(stage: Svg) {
		super(stage, 'rooms');
	}

	add(points: PointArray, id: string) {
		if (
			points[0][0] !== points[points.length - 1][0] ||
			points[0][1] !== points[points.length - 1][1]
		)
			points.push(points[0]);
		this.polys.push(new PolyWrapper(points, this.layer, `room.${id}`, ['room', id]));
	}

	centerScale(center: Types.Point, basisTranslation: Types.Point, scale: number) {
		// const translate = Walls._translate;
		for (const entity of this.polys) entity.basisTranslate(basisTranslation);
		for (const entity of this.polys) entity.basisScale(scale);
		// The transformations will all be done around 0,0. After translations, the running translate points will move the
		// shape to be centered around the specified location
		for (const entity of this.polys) entity.runningTranslate(center);
	}

	getEntities(): Entity[] {
		return this.polys;
	}
}

export class Interior extends Layer {
	path: PathWrapper | undefined;

	constructor(stage: Svg) {
		super(stage, 'interior');
	}

	set(p: Path) {
		this.path = new PathWrapper(p, this.layer, ['interior']);
	}

	centerScale(center: Types.Point, _basisTranslation: Types.Point, scale: number) {
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
	poly: Extrusion | undefined = undefined;

	boundingBox: Box = new Box();

	constructor(stage: Svg) {
		super(stage, 'outline');
	}

	set(points: PointArray, walls: Walls) {
		// if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) points.push(points[0]);
		this.poly = new Extrusion(points, this.layer, 'outline', ['outline']);

		this.boundingBox = this.poly.calculateInitialBoundingBox();

		// Make the walls that are associated with the outline
		walls.add(points, 'outline-wall');
	}

	getBasisTranslation() {
		return {
			x: -this.boundingBox.x - (this.boundingBox.x2 - this.boundingBox.x) / 2,
			y: -this.boundingBox.y - (this.boundingBox.y2 - this.boundingBox.y) / 2
		};
	}

	centerScale(center: Types.Point, basisTranslation: Types.Point, scale: number) {
		// const translate = Walls._translate;
		if (this.poly === undefined) return;
		this.poly.basisTranslate(basisTranslation);
		this.poly.basisScale(scale);
		// The transformations will all be done around 0,0. After translations, the running translate points will move the
		// shape to be centered around the specified location
		this.poly.runningTranslate(center);
	}

	getEntities(): Entity[] {
		return this.poly === undefined ? [] : [this.poly];
	}
}

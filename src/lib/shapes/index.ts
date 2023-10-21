import type * as Types from '$lib/types';
import * as helpers from '$lib/helpers';

import type { Polygon, Container, ArrayXY, Path } from '@svgdotjs/svg.js';
import { Matrix } from '@svgdotjs/svg.js';
import { Door, type Feature } from '$lib/features';
import type { PointArray } from '@svgdotjs/svg.js';
import type { Box } from '@svgdotjs/svg.js';
import * as tools from '$lib/tools';
import type { G } from '@svgdotjs/svg.js';

const WALL_HEIGHT_INITIAL = 100;

export const ShapeVariables = {
	initialWallHeight: WALL_HEIGHT_INITIAL,
	wallHeight: WALL_HEIGHT_INITIAL,
	doorHeight: 10,
	setScale: (scale: number) => {
		ShapeVariables.wallHeight = ShapeVariables.initialWallHeight * scale;
	}
};

export class Entity {
	_basisTranslate: Types.Point = { x: 0, y: 0 };
	_basisScale: number = 1;
	_runningTranslate: Types.Point = { x: 0, y: 0 };

	container: Container | G;

	constructor(container: Container) {
		this.container = container;
	}

	matrixTransform(_matrix: Types.Matrix2D) {}

	basisTranslate(_point: Types.Point) {
		this._basisTranslate = _point;
	}

	basisScale(_scale: number) {
		this._basisScale = _scale;
	}

	runningTranslate(point: Types.Point) {
		this._runningTranslate = point;
	}

	draw(_fastRender: boolean, _height: number) {}

	reset() {}

	remove() {}
}

export class PathWrapper extends Entity {
	path;

	constructor(path: Path, container: Container, cssClasses: string[]) {
		super(container);
		this.path = path;
		this.path.center(0, 0);

		cssClasses.push('path');
		for (const c of cssClasses) this.path.addClass(c);

		container.add(this.path);
	}

	matrixTransform(matrix: Types.Matrix2D) {
		this.path.transform(
			new Matrix(
				matrix[0][0],
				matrix[1][0],
				matrix[0][1],
				matrix[1][1],
				this._runningTranslate.x,
				this._runningTranslate.y
			)
		);
		this.path.scale(this._basisScale);
	}

	draw(fastRender: boolean, _height: number) {
		if (fastRender) {
			if (this.path.classes().indexOf('wireframe') === -1) this.path.addClass('wireframe');
		} else this.path.removeClass('wireframe');
	}
}

export class PolyWrapper extends Entity {
	poly: Polygon;

	points: Types.Point[];
	initialPoints: Types.Point[];

	constructor(points: PointArray, container: Container, id: string, cssClasses: string[]) {
		super(container);

		this.points = helpers.pointArrayToPoints(points);
		this.initialPoints = helpers.pointArrayToPoints(points);

		this.poly = container.polygon(points);

		this.poly.id(id);
		cssClasses.push('poly');
		for (const c of cssClasses) this.poly.addClass(c);
	}

	calculateInitialBoundingBox(): Box {
		this.poly.clear();
		this.poly.plot(helpers.pointsToArrayXY(this.points));
		const ret = this.poly.bbox();
		this.poly.clear();
		return ret;
	}

	basisTranslate(point: Types.Point) {
		for (const p of this.initialPoints) {
			p.x += point.x;
			p.y += point.y;
		}
	}

	basisScale(scale: number) {
		for (const p of this.initialPoints) {
			p.x *= scale;
			p.y *= scale;
		}
	}

	reset() {
		this.points = [];
		for (const p of this.initialPoints) this.points.push({ x: p.x, y: p.y });
	}

	remove() {
		this.poly.remove();
	}

	matrixTransform(matrix: Types.Matrix2D) {
		for (const p of this.points) {
			const x = p.x;
			const y = p.y;
			p.x = x * matrix[0][0] + y * matrix[0][1];
			p.y = x * matrix[1][0] + y * matrix[1][1];
		}
	}

	draw(fastRender: boolean, _height: number) {
		this.poly.clear();
		if (fastRender) this.poly.addClass('wireframe');
		else this.poly.removeClass('wireframe');
		this.poly.plot(helpers.pointsToArrayXY(this.points, this._runningTranslate));
	}
}

export class Surface extends Entity {
	point1: Types.Point;
	point2: Types.Point;

	initial: {
		point1: Types.Point;
		point2: Types.Point;
	};

	id: string;
	classes: string[] = [];
	shapes: Polygon[] = [];
	container: Container;
	initialContainer: Container;

	static surfaceCounter = 0;
	static surfaces: Surface[] = [];

	index;
	renderOrderCache: { [key: number]: boolean | undefined } = {};

	features: Feature[] = [];

	constructor(
		container: Container,
		initialPoint1: Types.Point,
		initialPoint2: Types.Point,
		id: string,
		cssClasses: string[]
	) {
		super(container);
		this.container = container;
		this.initialContainer = container;
		this.id = id;
		this.index = Surface.surfaceCounter++;
		for (const c of cssClasses) this.classes.push(c);
		this.classes.push('surface');

		this.allocateShapes(1);

		if (
			Math.abs(initialPoint1.x - initialPoint2.x) < 0.1 &&
			Math.abs(initialPoint1.y - initialPoint2.y) < 0.1
		) {
			console.log('CLOSE POINT!', initialPoint1, initialPoint2);
		}

		this.point1 = initialPoint1;
		this.point2 = initialPoint2;

		this.initial = {
			point1: {
				x: initialPoint1.x,
				y: initialPoint1.y
			},
			point2: {
				x: initialPoint2.x,
				y: initialPoint2.y
			}
		};
		this.updateEq();
		Surface.surfaces.push(this);
	}

	addClasses(classes: string[]) {
		this.classes = this.classes.concat(classes);
		for (const shape of this.shapes) for (const c of classes) shape.addClass(c);
	}

	allocateShapes(numShapes: number) {
		// If the number of shapes allocates is already correct, nothing to do
		if (this.shapes.length === numShapes) return;
		// If there is more than one shape, we'll make a group
		if (numShapes > 1) {
			// Check if we need to make a group. If there is one already made, nothing to do
			if (this.container === this.initialContainer) this.container = this.initialContainer.group();
		} else {
			// If we had previously made a group, we need to remove it
			if (this.container !== this.initialContainer) this.container.remove();
			// The group is the initial container since we have only 1 shape
			this.container = this.initialContainer;
		}
		// Remove all the existing shapes
		for (const s of this.shapes) s.remove();
		// Clear the shape array
		this.shapes = [];
		// Add shapes based on how many we want
		for (let i = 0; i < numShapes; i++) {
			// Create the new shape
			const s = this.container.polygon();
			// Set the ID
			s.id(this.id + (numShapes > 1 ? i : ''));
			// Add the classes
			for (const c of this.classes) s.addClass(c);
			// Save the shape
			this.shapes.push(s);
		}
	}

	attachFeature(feature: Feature) {
		// Check if this feature to add is a door
		if (feature instanceof Door) {
			// Go through the features we have so far. We need to tell the first door about all the doors
			for (const f of this.features) {
				if (f instanceof Door) {
					// Tell the first door about this door
					f.addRelatedDoor(feature);
					break;
				}
			}
		}
		// Add it to the feature list
		this.features.push(feature);
	}

	// createShape() {
	// 	this.shape = this.container.polygon();
	// 	this.shape.id(this.id);
	// 	for (const c of this.classes) this.shape.addClass(c);
	// }

	getAsSegment(): Types.LineSegment {
		return { p1: this.initial.point1, p2: this.initial.point2 };
	}

	isDoor = false;
	doorRatio: { d1: number; d2: number }[] = [];
	door(d1: number, d2: number) {
		this.isDoor = true;
		this.doorRatio.push({ d1, d2 });
	}

	basisTranslate(point: Types.Point) {
		this.initial.point1.x += point.x;
		this.initial.point2.x += point.x;
		this.initial.point1.y += point.y;
		this.initial.point2.y += point.y;
	}

	basisScale(scale: number) {
		this.initial.point1.x *= scale;
		this.initial.point1.y *= scale;
		this.initial.point2.x *= scale;
		this.initial.point2.y *= scale;
	}

	remove() {
		for (const s of this.shapes) s.remove();
	}

	eq = (x: number): number => x;
	slope = NaN;

	lowY = 0;
	highY = 0;
	updateEq() {
		// Protect against an odd slope
		if (Math.abs(this.point1.x - this.point2.x) < 0.1) {
			this.eq = (_blank) => NaN;
			this.slope = NaN;
			return;
		}

		// Calculate the slope
		const m = (this.point2.y - this.point1.y) / (this.point2.x - this.point1.x);
		this.slope = m;

		// Calculate the y-intercept
		const b = this.point1.y - m * this.point1.x;

		this.eq = (x) => m * x + b;
		this.lowY = this.point1.y < this.point2.y ? this.point1.y : this.point2.y;
		this.highY = this.point1.y > this.point2.y ? this.point1.y : this.point2.y;
	}

	reset() {
		this.point1 = {
			x: this.initial.point1.x,
			y: this.initial.point1.y
		};
		this.point2 = {
			x: this.initial.point2.x,
			y: this.initial.point2.y
		};
		// this.updateEq();
		this.renderOrderCache = {};
	}

	matrixTransform(matrix: Types.Matrix2D) {
		this.point1 = {
			x: this.point1.x * matrix[0][0] + this.point1.y * matrix[0][1],
			y: this.point1.x * matrix[1][0] + this.point1.y * matrix[1][1]
		};
		this.point2 = {
			x: this.point2.x * matrix[0][0] + this.point2.y * matrix[0][1],
			y: this.point2.x * matrix[1][0] + this.point2.y * matrix[1][1]
		};
		this.updateEq();
	}

	draw(fastRender: boolean, heightNormalized: number) {
		const translated1: Types.Point = {
			x: this.point1.x + this._runningTranslate.x,
			y: this.point1.y + this._runningTranslate.y
		};
		const translated2: Types.Point = {
			x: this.point2.x + this._runningTranslate.x,
			y: this.point2.y + this._runningTranslate.y
		};

		let polygons: ArrayXY[][];

		if (this.features.length === 0) {
			// If we have no feature, this is a simple wall

			// if (height <= 0.001) {
			// 	this.shape.remove();
			// 	this.removed = true;
			// 	return;
			// }

			// Create a simple surface polygon
			const points: ArrayXY[] = [
				[translated1.x, translated1.y],
				[translated1.x, translated1.y + heightNormalized * ShapeVariables.wallHeight],
				[translated2.x, translated2.y + heightNormalized * ShapeVariables.wallHeight],
				[translated2.x, translated2.y],
				[translated1.x, translated1.y]
			];
			// Add the simple surface to the polygon array
			polygons = [points];
		} else {
			// This is a feature. Let the feature come up with all the polygons
			polygons = this.features[0].render(translated1, translated2, heightNormalized);
		}

		if (fastRender) {
			for (const s of this.shapes) s.addClass('wireframe');
		} else {
			for (const s of this.shapes) s.clear();
			for (const s of this.shapes) s.removeClass('wireframe');
			if (this.shapes.length > 1) this.container.front();
			else this.shapes[0].front();
		}

		// Draw all the polygons
		for (let i = 0; i < this.shapes.length && i < polygons.length; i++)
			this.shapes[i].plot(polygons[i]);
	}

	isRenderedBefore(b: Surface, _debug = false): boolean | undefined {
		// If one segment is entirely above or below the other one, this is easy
		if (this.highY < b.lowY) return true;
		if (b.highY < this.lowY) return false;

		// If either slope is NaN (vertical line) we won't be able to tell which is above the other
		if (b.index in this.renderOrderCache) {
			// console.log('cache hit');
			return this.renderOrderCache[b.index];
		}
		if (this.index in b.renderOrderCache) {
			const r = b.renderOrderCache[this.index];
			if (r === undefined) return undefined;
			return !r;
		}
		if (isNaN(this.slope) || isNaN(b.slope)) {
			this.renderOrderCache[b.index] = undefined;
			return undefined;
		}

		const overlap = helpers.do1DLineSegmentsOverlap(
			[this.point1.x, this.point2.x],
			[b.point1.x, b.point2.x]
		);

		if (overlap) {
			// They overlap. It may be a segment, or just one point.
			if (Math.abs(overlap[0] - overlap[1]) < 0.001) {
				// Single point overlap. We still don't know anything
				this.renderOrderCache[b.index] = undefined;
				return undefined;
			} else {
				// Range overlap. Check one of the points and see which is above the other

				const midpoint = (overlap[0] + overlap[1]) * 0.5;

				const thisY = this.eq(midpoint);
				const bY = b.eq(midpoint);

				if (thisY > bY) {
					// This object is lower in the scene, and is therefore "above", or rendered after the other object
					this.renderOrderCache[b.index] = false;
					return false;
				} else {
					// This object is above in the scene, and is therefore "below", or rendered before the other object
					this.renderOrderCache[b.index] = true;
					return true;
				}
			}
		} else {
			// If they don't overlap with X at all, we don't know anything
			this.renderOrderCache[b.index] = undefined;
			return undefined;
		}
	}
}

export class Extrusion extends PolyWrapper {
	// Extrusion steps
	// Take a polygon and copy it lower, to make the two levels
	// Draw vertical lines between every pair of points
	// Move to the highest point on the stage to start
	//  Travel left to right. If the traversal intercepts a vertical line, follow it up until point pair or intersection.
	//  If a direction reversal is encountered, travel down until the point pair or another intersection of a line

	// Instead of changing left-right direction, prefer to travel up or down a vertical
	// Take every intersection line as long as it isn't on a segment point itself (only between points)

	// extrude: Polygon;

	constructor(points: PointArray, container: Container, id: string, cssClasses: string[]) {
		super(points, container, id, cssClasses);
	}

	_highestPointIndex() {
		let highestPoint = this.points[0].y;
		let highestPointIndex = 0;
		for (let i = 0; i < this.points.length; i++) {
			const p = this.points[i];
			if (p.y < highestPoint) {
				highestPoint = p.y;
				highestPointIndex = i;
			}
		}
		return highestPointIndex;
	}

	draw(fastRender: boolean, height: number) {
		this.poly.clear();

		if (fastRender) {
			this.poly.opacity(0);
			return;
		}

		const lowerPoly: Types.Point[] = [];
		const upperPoly: Types.Point[] = [];
		for (const point of this.points) {
			lowerPoly.push({ x: point.x, y: point.y + height * ShapeVariables.wallHeight });
			upperPoly.push({ x: point.x, y: point.y });
		}

		const walls: Types.Point[][] = [];
		let trailingPoint = this.points[0];
		for (let i = 1; i < this.points.length; i++) {
			const point = this.points[i];
			const wall: Types.Point[] = [
				helpers.roundPoint({ x: point.x - 0.01, y: point.y - 0.01 }),
				helpers.roundPoint({ x: trailingPoint.x + 0.01, y: trailingPoint.y }),
				helpers.roundPoint({
					x: trailingPoint.x + 0.01,
					y: trailingPoint.y + height * ShapeVariables.wallHeight + 0.01
				}),
				helpers.roundPoint({
					x: point.x - 0.01,
					y: point.y + height * ShapeVariables.wallHeight + 0.01
				}),
				helpers.roundPoint({ x: point.x - 0.01, y: point.y - 0.01 })
			];
			// this.segmentShapesDebugO.push(this.container.polygon(helpers.pointsToArrayXY(wall, this._runningTranslate)).stroke({ color: '#0f0', width: 3 }).attr('fill', 'none'));
			walls.push(wall);
			trailingPoint = point;
		}

		this.poly.opacity(1);

		if (height > 0.001) {
			let poly = tools.unionAll([...walls]);
			poly = tools.unionAll([...poly, this.points]);
			poly = tools.unionAll([...poly, lowerPoly]);
			this.poly.plot(helpers.pointsToArrayXY(poly[0], this._runningTranslate));
		} else {
			const poly = tools.unionAll([this.points]);
			this.poly.plot(helpers.pointsToArrayXY(poly[0], this._runningTranslate));
		}
	}
}

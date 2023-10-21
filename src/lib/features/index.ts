import type * as Types from '$lib/types';
import type * as Shapes from '$lib/shapes';
import { ShapeVariables } from '$lib/shapes';
import type { ArrayXY } from '@svgdotjs/svg.js';
import * as helpers from '$lib/helpers';

export class Feature {
	surface: Shapes.Surface;

	constructor(surface: Shapes.Surface) {
		this.surface = surface;
		this.surface.attachFeature(this);
	}

	rendered = false;
	hasRendered(assign?: boolean): boolean {
		const r = this.rendered;
		this.rendered = assign !== undefined ? assign : false;
		return r;
	}

	/**
	 * Render an output based on two positional points describing the position of the wall in the scene. The polygons
	 * returned from this function will be translated and transformed based on the orbit controls. They will all be
	 * rendered in the same z-index layer
	 * @param point1 the first point
	 * @param point2 the second point
	 * @param heightNormalized the height od the floor plan as a number from 0 to 1
	 * @returns an array of polygons to draw. During a fast render, only the first polygon will be drawn
	 */
	render(_point1: Types.Point, _point2: Types.Point, _heightNormalized: number): ArrayXY[][] {
		return [];
	}
}

export class Door extends Feature {
	doors: Types.DoorDescription[];
	linkedDoor: Door | undefined;

	constructor(surface: Shapes.Surface, doors: Types.DoorDescription[], linkedDoor?: Door) {
		super(surface);
		// Assume we will use 2 shapes (most doors are linked to another door)
		surface.allocateShapes(2);
		// Add the door class
		surface.addClasses(['door']);
		// Assign the door descriptions
		this.doors = doors;
		// If a link was included, do the link
		if (linkedDoor) linkedDoor.link(this);
		this.linkedDoor = linkedDoor;
	}

	link(linkedDoor: Door) {
		this.linkedDoor = linkedDoor;
	}

	// Save the last rendered points, just in case the linked door needs them
	doorPoint1: Types.Point = { x: 0, y: 0 };
	doorPoint2: Types.Point = { x: 0, y: 0 };

	/**
	 * Render an output based on two positional points describing the position of the wall in the scene. The polygons
	 * returned from this will all be rendered in the same z-index layer
	 * @param point1 the first point
	 * @param point2 the second point
	 * @param heightNormalized the height od the floor plan as a number from 0 to 1
	 * @returns an array of polygons to draw. During a fast render, only the first polygon will be drawn
	 */
	render(point1: Types.Point, point2: Types.Point, heightNormalized: number): ArrayXY[][] {
		// Create an empty polygon array
		const polygons: ArrayXY[][] = [];

		// Using interpolation, calculate the start and end points of the door section. Using these synthesized
		// points and the surface primary points, we can draw the door. d1 is closer to point1, d2 is farther.
		const d1 = helpers.interpolate(
			{ x: point1.x, y: point1.y },
			{ x: point2.x, y: point2.y },
			this.doors[0].r1
		);
		const d2 = helpers.interpolate(
			{ x: point1.x, y: point1.y },
			{ x: point2.x, y: point2.y },
			this.doors[0].r2
		);

		// Check if we have a linked door, and check if that other door has rendered. This way, only 1 door renders
		// a door jam and we can rely on the other door having accurate points
		if (this.linkedDoor !== undefined && this.linkedDoor.hasRendered()) {
			// Update the number of shapes to 2
			this.surface.allocateShapes(2);
			// We will render the door jam that is actually visible (the one with a lower y value)
			const d = d1.y > d2.y ? d2 : d1;
			const linked =
				this.linkedDoor.doorPoint1.y > this.linkedDoor.doorPoint2.y
					? this.linkedDoor.doorPoint2
					: this.linkedDoor.doorPoint1;
			// Draw the door jam
			polygons.push([
				[d.x, d.y],
				[d.x, d.y + heightNormalized * ShapeVariables.wallHeight],
				[linked.x, linked.y + heightNormalized * ShapeVariables.wallHeight],
				[linked.x, linked.y],
				[d.x, d.y]
			]);
		} else {
			// This is a single door, there is only 1 shape
			this.surface.allocateShapes(1);
		}

		// Assign this feature as having been rendered
		this.doorPoint1 = d1;
		this.doorPoint2 = d2;
		this.hasRendered(true);

		// We need to draw the door in the proper order. Check which point (d1 or d2) is closer to point1
		if (Math.abs(d1.x - point1.x) < Math.abs(d2.x - point1.x)) {
			// Draw the door
			const points: ArrayXY[] = [
				[point1.x, point1.y],
				[point2.x, point2.y],
				[point2.x, point2.y + heightNormalized * ShapeVariables.wallHeight],
				[d2.x, d2.y + heightNormalized * ShapeVariables.wallHeight],
				[d2.x, d2.y + heightNormalized * ShapeVariables.doorHeight],
				[d1.x, d1.y + heightNormalized * ShapeVariables.doorHeight],
				[d1.x, d1.y + heightNormalized * ShapeVariables.wallHeight],
				[point1.x, point1.y + heightNormalized * ShapeVariables.wallHeight],
				[point1.x, point1.y]
			];
			// Add the door to the polygon array
			polygons.push(points);
		} else {
			// Draw the door
			const points: ArrayXY[] = [
				[point1.x, point1.y],
				[point2.x, point2.y],
				[point2.x, point2.y + heightNormalized * ShapeVariables.wallHeight],
				[d1.x, d1.y + heightNormalized * ShapeVariables.wallHeight],
				[d1.x, d1.y + heightNormalized * ShapeVariables.doorHeight],
				[d2.x, d2.y + heightNormalized * ShapeVariables.doorHeight],
				[d2.x, d2.y + heightNormalized * ShapeVariables.wallHeight],
				[point1.x, point1.y + heightNormalized * ShapeVariables.wallHeight],
				[point1.x, point1.y]
			];
			// Add the door to the polygon array
			polygons.push(points);
		}

		// Done
		return polygons;
	}
}

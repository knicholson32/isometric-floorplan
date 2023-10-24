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

	otherDoorsOnSurface: Door[] = [];

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

	addRelatedDoor(door: Door) {
		this.otherDoorsOnSurface.push(door);
	}

	// Save the last rendered points, just in case the linked door needs them
	doorPoint1: Types.Point = { x: 0, y: 0 };
	doorPoint2: Types.Point = { x: 0, y: 0 };

	/**
	 * Generate the core data for this doorway (the area along the bottom that "pushes in" to form the door)
	 * @param point1 point1 of the surface
	 * @param point2 point2 of the surface
	 * @param heightNormalized the height value
	 * @returns the core data
	 */
	core(
		point1: Types.Point,
		point2: Types.Point,
		heightNormalized: number,
		description: Types.DoorDescription = this.doors[0]
	): { doorway: ArrayXY[]; doorJam?: ArrayXY[]; ref: number } {
		// Using interpolation, calculate the start and end points of the door section. Using these synthesized
		// points and the surface primary points, we can draw the door. d1 is closer to point1, d2 is farther.
		const d1 = helpers.interpolate(
			{ x: point1.x, y: point1.y },
			{ x: point2.x, y: point2.y },
			description.r1
		);
		const d2 = helpers.interpolate(
			{ x: point1.x, y: point1.y },
			{ x: point2.x, y: point2.y },
			description.r2
		);

		let doorJam: ArrayXY[] | undefined = undefined;

		// Check if we have a linked door, and check if that other door has rendered. This way, only 1 door renders
		// a door jam and we can rely on the other door having accurate points
		if (this.linkedDoor !== undefined && this.linkedDoor.hasRendered()) {
			// We will render the door jam that is actually visible (the one with a lower average y value)
			// TODO: This render needs to be based on the slope of the door jam instead, to account for angles doors
			const [l1, l2] = [this.linkedDoor.doorPoint1, this.linkedDoor.doorPoint2];
			const drawD1 = (d1.y + l1.y) / 2 <= (d2.y + l2.y) / 2;
			const d = drawD1 ? d1 : d2;
			const linked = drawD1 ? this.linkedDoor.doorPoint1 : this.linkedDoor.doorPoint2;
			// Draw the door jam
			doorJam = [
				[d.x, d.y],
				[d.x, d.y + heightNormalized * ShapeVariables.wallHeight],
				[linked.x, linked.y + heightNormalized * ShapeVariables.wallHeight],
				[linked.x, linked.y],
				[d.x, d.y]
			];
		}

		// Assign this feature as having been rendered
		this.doorPoint1 = d1;
		this.doorPoint2 = d2;
		this.hasRendered(true);

		let core: ArrayXY[] = [];
		const ref = description.r1 < description.r2 ? description.r1 : description.r2;

		// We need to draw the door in the proper order. Check which point (d1 or d2) is closer to point1
		if (Math.abs(d1.x - point1.x) < Math.abs(d2.x - point1.x)) {
			// Draw the door
			core = [
				[d2.x, d2.y + heightNormalized * ShapeVariables.wallHeight],
				[d2.x, d2.y + heightNormalized * ShapeVariables.doorHeight],
				[d1.x, d1.y + heightNormalized * ShapeVariables.doorHeight],
				[d1.x, d1.y + heightNormalized * ShapeVariables.wallHeight]
			];
		} else {
			// Draw the door
			core = [
				[d1.x, d1.y + heightNormalized * ShapeVariables.wallHeight],
				[d1.x, d1.y + heightNormalized * ShapeVariables.doorHeight],
				[d2.x, d2.y + heightNormalized * ShapeVariables.doorHeight],
				[d2.x, d2.y + heightNormalized * ShapeVariables.wallHeight]
			];
		}

		return {
			doorway: core,
			doorJam,
			ref
		};
	}

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
		// Get this door core data
		const core = this.core(point1, point2, heightNormalized);
		// Add the starting points that will be the same for every door on this surface
		let points: ArrayXY[] = [
			[point1.x, point1.y],
			[point2.x, point2.y],
			[point2.x, point2.y + heightNormalized * ShapeVariables.wallHeight]
		];
		// Set the number of shapes the surface should render
		let shapes = 1;
		// If another door just wants the core data, return it
		if (this.otherDoorsOnSurface.length === 0) {
			points = points.concat(core.doorway);
			if (core.doorJam !== undefined) {
				shapes++;
				polygons.push(core.doorJam);
			}
		} else {
			// Set an array of all the cores for the doors on this surface
			const cores = [core];
			// Add the other cores to this array
			for (const d of this.otherDoorsOnSurface)
				cores.push(d.core(point1, point2, heightNormalized));
			// Sort the cores based on their description reference, so they are drawn correctly
			cores.sort((a, b) => b.ref - a.ref);
			// We will go through the cores and add points / door jams
			for (const c of cores) {
				// Add the actual door-frame points
				points = points.concat(c.doorway);
				// Check if there is a door jam. If so, add it
				if (c.doorJam !== undefined) {
					// One additional shape for the surface
					shapes++;
					// Add it to the final shape list
					polygons.push(c.doorJam);
				}
			}
		}
		// Add the ending points
		points = points.concat([
			[point1.x, point1.y + heightNormalized * ShapeVariables.wallHeight],
			[point1.x, point1.y]
		]);
		// Add the door to the polygon array
		polygons.push(points);
		// Assign the number of shapes
		this.surface.allocateShapes(shapes);
		// Done
		return polygons;
	}
}

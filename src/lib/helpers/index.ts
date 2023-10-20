import type { ArrayXY } from '@svgdotjs/svg.js';
import type * as Types from '$lib/types';
import type { PointArray } from '@svgdotjs/svg.js';

const POINT_EQUAL_THRESHOLD = 0.001;

/**
 * Get a matrix that can isometrically distort the scene
 * @param angleInDegrees the angle of the isometric distortion, from 0-90 degrees
 * @returns the distortion matrix
 */
export const getIsometricMatrix = (angleInDegrees: number): Types.Matrix2D => {
	if (angleInDegrees < 0) angleInDegrees = 0;
	if (angleInDegrees > 90) angleInDegrees = 90;
	const angleInRadians = ((angleInDegrees / 2) * Math.PI) / 180;
	const cosA = Math.cos(angleInRadians);
	const sinA = Math.sin(angleInRadians);
	return [
		[cosA, -cosA],
		[sinA, sinA]
	];
};

/**
 * Get a matrix that can scale the scene
 * @param scale the scale factor
 * @returns the scale matrix
 */
export const getScaleMatrix = (scale: number): Types.Matrix2D => {
	return [
		[scale, 0],
		[0, scale]
	];
};

/**
 * Convert from an ArrayXY to a Point
 * @param pointArray the ArrayXY
 * @returns the Point
 */
export const arrayXYToPoint = (pointArray: ArrayXY): Types.Point => {
	return {
		x: pointArray[0] / 1, //1.25
		y: pointArray[1] / 1
	};
};

/**
 * Convert from an PointArray to a Point[]
 * @param pointArray the PointArray
 * @returns the Point[]
 */
export const pointArrayToPoints = (pointArray: PointArray): Types.Point[] => {
	const points: Types.Point[] = [];
	for (const p of pointArray) points.push({ x: p[0], y: p[1] });
	return points;
};

/**
 * Convert from a points array to ArrayXY
 * @param points the points array
 * @param translate the optional translation vector (point)
 * @returns the ArrayXY
 */
export const pointsToArrayXY = (points: Types.Point[], translate?: Types.Point) => {
	const exportPoints: ArrayXY[] = [];
	if (translate) {
		for (const p of points) exportPoints.push([p.x + translate.x, p.y + translate.y]);
	} else {
		for (const p of points) exportPoints.push([p.x, p.y]);
	}
	return exportPoints;
};

/**
 * Get matrix that can rotate the scene
 * @param angleInDegrees the degrees to rotate
 * @returns the rotation matrix
 */
export const getRotationMatrix = (angleInDegrees: number): Types.Matrix2D => {
	// Convert the angle to radians
	const angleInRadians = ((angleInDegrees - 45) * Math.PI) / 180;

	// Define the initial rotation matrix
	return [
		[Math.cos(angleInRadians), -Math.sin(angleInRadians)],
		[Math.sin(angleInRadians), Math.cos(angleInRadians)]
	];
};

/**
 * Calculate whether or not two line segments overlap
 * @param segment1 the first segment
 * @param segment2 the second segment
 * @returns the overlapping section, or false if no overlap
 */
export const do1DLineSegmentsOverlap = (
	segment1: [number, number],
	segment2: [number, number]
): false | [number, number] => {
	// let [A, B] = segment1.sort((a, b) => a - b);
	// let [C, D] = segment2.sort((a, b) => a - b);

	const [A, B] = segment1[0] < segment1[1] ? [segment1[0], segment1[1]] : [segment1[1], segment1[0]];
	const [C, D] = segment2[0] < segment2[1] ? [segment2[0], segment2[1]] : [segment2[1], segment2[0]];

	if (B < C || D < A) {
		return false; // No overlap
	}

	const overlapStart = Math.max(A, C);
	const overlapEnd = Math.min(B, D);

	return [overlapStart, overlapEnd];
};

// This function multiplies
// mat1[][] and mat2[][], and
// stores the result in res[][]
export const multiply = (mat1: number[][], mat2: number[][], N = 2) => {
	const res: number[][] = new Array(N).fill(0).map(() => new Array(N).fill(0));
	for (let i = 0; i < N; i++) {
		res.push([]);
		for (let j = 0; j < N; j++) {
			res[i][j] = 0;
			for (let k = 0; k < N; k++) res[i][j] += mat1[i][k] * mat2[k][j];
		}
	}
	return res;
};

/**
 * Calculate the distance between two points
 * @param p1 the first point
 * @param p2 the second point
 * @returns the distance between the points
 */
export const distanceBetween = (p1: Types.Point, p2: Types.Point): number => {
	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Interpolate between two points
 * @param a the first point
 * @param b the second point
 * @param frac the ratio (0-1) between the first and second point
 * @returns the new point
 */
export const interpolate = (a: Types.Point, b: Types.Point, frac: number): Types.Point => {
	// https://stackoverflow.com/questions/17190981/how-can-i-interpolate-between-2-points-when-drawing-with-canvas
	const nx = a.x + (b.x - a.x) * frac;
	const ny = a.y + (b.y - a.y) * frac;
	return { x: nx, y: ny };
};

/**
 * Check for segment intersection
 * @param segment1 the first segment
 * @param segment2 the second segment
 * @returns the intersection point, or null if there is no intersection
 */
export const lineSegmentsIntersect = (
	segment1: Types.LineSegment,
	segment2: Types.LineSegment
): Types.Point | null => {
	// Define the endpoints of the first segment
	// const { x: x1, y: y1 } = segment1[0];
	// const { x: x2, y: y2 } = segment1[1];
	const x1 = segment1.p1.x;
	const y1 = segment1.p1.y;
	const x2 = segment1.p2.x;
	const y2 = segment1.p2.y;

	// Define the endpoints of the second segment
	// const { x: x3, y: y3 } = segment2[0];
	// const { x: x4, y: y4 } = segment2[1];
	const x3 = segment2.p1.x;
	const y3 = segment2.p1.y;
	const x4 = segment2.p2.x;
	const y4 = segment2.p2.y;

	// Calculate the direction vectors of the two segments
	const dx1 = x2 - x1;
	const dy1 = y2 - y1;
	const dx2 = x4 - x3;
	const dy2 = y4 - y3;

	// Calculate the determinant to check if the lines are parallel
	const det = dx1 * dy2 - dx2 * dy1;

	// Check if the lines are parallel (det == 0)
	if (det === 0) {
		return null; // The lines are parallel and do not intersect.
	} else {
		// Calculate the parameters for the intersection point
		const t1 = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / det;
		const t2 = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / det;

		// Check if the intersection point is within the bounds of both line segments
		if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
			const intersectionX = x1 + t1 * dx1;
			const intersectionY = y1 + t1 * dy1;
			return { x: intersectionX, y: intersectionY };
		} else {
			return null; // The lines intersect outside the line segments.
		}
	}
};

/**
 * Checks if two points are equal, accounting for floating point error
 * @param p1 the first point
 * @param p2 the second point
 * @returns whether or not they are equal
 */
export const pointsEqual = (p1: Types.Point, p2: Types.Point): boolean => {
	return (
		Math.abs(p1.x - p2.x) < POINT_EQUAL_THRESHOLD && Math.abs(p1.y - p2.y) < POINT_EQUAL_THRESHOLD
	);
};

/**
 * Round a point to a certain precision
 * @param point the point to round
 * @param precision the optional precision (10000 default as 1/10000)
 * @returns the rounded point (new object)
 */
export const roundPoint = (point: Types.Point, precision = 10000): Types.Point => {
	return {
		x: Math.round((point.x + Number.EPSILON) * precision) / precision, // + (Math.random() - 0.5) * 0.01,
		y: Math.round((point.y + Number.EPSILON) * precision) / precision // + (Math.random() - 0.5) * 0.01
	};
};

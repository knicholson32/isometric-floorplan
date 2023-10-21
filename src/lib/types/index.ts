export type Segment = [number, number];

export type Matrix2D = [[number, number], [number, number]];

export type Point = {
	x: number;
	y: number;
};

export type LineSegment = { p1: Point; p2: Point };

export type DoorDescription = {
	r1: number;
	r2: number;
};

import type * as Types from '../types';
import * as helpers from '../helpers';

import { Polygon, Container, ArrayXY, Path } from '@svgdotjs/svg.js'
import { Matrix } from '@svgdotjs/svg.js';
import { PointArray } from '@svgdotjs/svg.js';
import { Box } from '@svgdotjs/svg.js';
import * as tools from '../tools';


const wallHeight = 150;

export class Entity {

  _basisTranslate: Types.Point = { x: 0, y: 0 };
  _basisScale: number = 1;
  _runningTranslate: Types.Point = { x: 0, y: 0 };

  container: Container;

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
    this.path.transform(new Matrix(matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], this._runningTranslate.x, this._runningTranslate.y));
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

    this.poly = container.polygon(points)

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

  matrixTransform(matrix: Types.Matrix2D) {
    for (const p of this.points) {
      const x = p.x;
      const y = p.y
      p.x = x * matrix[0][0] + y * matrix[0][1];
      p.y = x * matrix[1][0] + y * matrix[1][1];
    }
  }

  draw(fastRender: boolean, _height: number) {
    this.poly.clear()
    if (fastRender) this.poly.addClass('wireframe');
    else this.poly.removeClass('wireframe');
    this.poly.plot(helpers.pointsToArrayXY(this.points, this._runningTranslate));
  }
}

export class Surface extends Entity {
  point1: Types.Point;
  point2: Types.Point;

  initial: {
    point1: Types.Point,
    point2: Types.Point
  };


  shape: Polygon;
  container: Container;
  
  static surfaceCounter = 0;
  static surfaces: Surface[] = [];
  
  index;
  renderOrderCache: { [key: number]: boolean | undefined } = {};

  constructor(container: Container, initialPoint1: Types.Point, initialPoint2: Types.Point, id: string, cssClasses: string[]) {
    super(container);
    this.container = container;
    this.shape = container.polygon();
    this.index = Surface.surfaceCounter++;
    this.shape.id(id);

    cssClasses.push('surface');
    for (const c of cssClasses) this.shape.addClass(c);

    if (Math.abs(initialPoint1.x - initialPoint2.x) < 0.1 && Math.abs(initialPoint1.y - initialPoint2.y) < 0.1) {
      console.log('CLOSE POINT!', initialPoint1, initialPoint2);
    }

    this.point1 = initialPoint1;
    this.point2 = initialPoint2;

    this.initial = {
      point1: {
        x: initialPoint1.x,
        y: initialPoint1.y,
      },
      point2: {
        x: initialPoint2.x,
        y: initialPoint2.y,
      }
    };
    this.updateEq();
    Surface.surfaces.push(this);
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

  eq = (x: number): number => x;
  slope = NaN;

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
  }

  reset() {
    this.point1 = {
      x: this.initial.point1.x,
      y: this.initial.point1.y
    };
    this.point2 = {
      x: this.initial.point2.x,
      y: this.initial.point2.y
    }
    // this.updateEq();
    this.renderOrderCache = {};
  }

  matrixTransform(matrix: Types.Matrix2D) {
    this.point1 = {
      x: this.point1.x * matrix[0][0] + this.point1.y * matrix[0][1],
      y: this.point1.x * matrix[1][0] + this.point1.y * matrix[1][1]
    }
    this.point2 = {
      x: this.point2.x * matrix[0][0] + this.point2.y * matrix[0][1],
      y: this.point2.x * matrix[1][0] + this.point2.y * matrix[1][1]
    }
    this.updateEq();
  }

  draw(fastRender: boolean, height: number) {
    this.renderOrderCache = {};
    this.shape.clear()

    if (fastRender) this.shape.addClass('wireframe');
    else this.shape.removeClass('wireframe');

    const translated1X = this.point1.x + this._runningTranslate.x;
    const translated2X = this.point2.x + this._runningTranslate.x;
    const translated1Y = this.point1.y + this._runningTranslate.y;
    const translated2Y = this.point2.y + this._runningTranslate.y;

    const points: ArrayXY[] = [
      [translated1X, translated1Y],
      [translated1X, translated1Y + height * wallHeight],
      [translated2X, translated2Y + height * wallHeight],
      [translated2X, translated2Y],
      [translated1X, translated1Y]
    ]
    if (!fastRender) this.shape.front();
    this.shape.plot(points);    
  }


  isRenderedBefore(b: Surface, debug = false): boolean | undefined {

    // if (fast) {
    //   if (this.getLowestPoint() > b.getLowestPoint()) return false;
    //   return true;
    // }

    // TODO: There may be a speedup by analyzing the range of y values:
    //       if all y values are larger on one line, it is above?

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
    if (debug) console.log('this', this);
    if (debug) console.log('b', b);
    if (debug) console.log('slopes', this.slope, b.slope);
    if (isNaN(this.slope) || isNaN(b.slope)) {
      this.renderOrderCache[b.index] = undefined;
      return undefined;
    }

    const overlap = helpers.do1DLineSegmentsOverlap([this.point1.x, this.point2.x], [b.point1.x, b.point2.x]);
    if (debug) console.log('overlap', overlap);

    if (overlap) {
      // They overlap. It may be a segment, or just one point.
      if (Math.abs(overlap[0] - overlap[1]) < 0.001) {
        // Single point overlap. We still don't know anything
        if (debug) console.log('very small overlap');
        this.renderOrderCache[b.index] = undefined;
        return undefined;
      } else {
        // Range overlap. Check one of the points and see which is above the other

        const midpoint = (overlap[0] + overlap[1]) * 0.5;

        let thisY = this.eq(midpoint);
        let bY = b.eq(midpoint);

        if (debug) console.log('y values', thisY, bY);

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

  _rotateList(startIndex: number, list: any[]) {
    const newList = [];
    for (let i = 0; i < list.length; i++) {
      let idx = startIndex + i;
      if (idx >= list.length) {
        startIndex = -i;
        idx = startIndex + i;
      }
      newList.push(list[idx]);
    }
    return newList;
  }

  // segmentShapesDebugO: Polygon[] = []
  draw(_fastRender: boolean, height: number) {
    this.poly.clear();
    // for (const s of this.segmentShapesDebugO) s.remove();
    // this.segmentShapesDebugO = [];

    const lowerPoly: Types.Point[] = [];
    const upperPoly: Types.Point[] = [];
    for (const point of this.points) {
      lowerPoly.push({ x: point.x, y: point.y + height * wallHeight });
      upperPoly.push({ x: point.x, y: point.y });
    }

    const walls: Types.Point[][] = [];
    let trailingPoint = this.points[0];
    for (let i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      // this.container.line([[point.x + this._runningTranslate.x, point.y + this._runningTranslate.y], [trailingPoint.x + this._runningTranslate.x, trailingPoint.y + this._runningTranslate.y]]).stroke({color: '#0f0', width: 3});
      const wall: Types.Point[] = [
        helpers.roundPoint({ x: point.x-0.01, y: point.y-0.01 }),
        helpers.roundPoint({ x: trailingPoint.x+0.01, y: trailingPoint.y }),
        helpers.roundPoint({ x: trailingPoint.x+0.01, y: trailingPoint.y + height * wallHeight+0.01 }),
        helpers.roundPoint({ x: point.x-0.01, y: point.y + height * wallHeight+0.01 }),
        helpers.roundPoint({ x: point.x-0.01, y: point.y-0.01 }),
      ];
      // this.segmentShapesDebugO.push(this.container.polygon(helpers.pointsToArrayXY(wall, this._runningTranslate)).stroke({ color: '#0f0', width: 3 }).attr('fill', 'none'));
      walls.push(wall);
      trailingPoint = point;
    }

  
    let poly = tools.unionAll([...walls]);

    poly = tools.unionAll([...poly, this.points]);
    poly = tools.unionAll([...poly, lowerPoly]);

    this.poly.opacity(1);
    this.poly.plot(helpers.pointsToArrayXY(poly[0], this._runningTranslate));
  }


}
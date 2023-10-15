import type * as Types from '../types';
import * as helpers from '../helpers';

import { Polygon, Container, StrokeData, FillData, ArrayXY, Path } from '@svgdotjs/svg.js'
import { Matrix } from '@svgdotjs/svg.js';


const wallHeight = 150;

export class Entity {

  _basisTranslate: Types.Point = { x: 0, y: 0 };
  _basisScale: number = 1;
  _runningTranslate: Types.Point = { x: 0, y: 0 };

  constructor() {

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

  constructor(path: Path, container: Container) {
    super();
    this.path = path;
    this.path.center(0, 0);

    this.path.fill({
      color: '#000'
    });
    this.path.stroke({
      color: '#fff',
      width: 2
    })
    container.add(this.path);

  }

  matrixTransform(matrix: Types.Matrix2D) {
    this.path.transform(new Matrix(matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], this._runningTranslate.x, this._runningTranslate.y));
    this.path.scale(this._basisScale * 0.8);
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

  stroke: StrokeData = {
    color: '#444',
    width: 1
  };

  fill: FillData = {
    color: '#000000',
    opacity: 1
  };

  constructor(container: Container, initialPoint1: Types.Point, initialPoint2: Types.Point) {
    super();
    this.container = container;
    this.shape = container.polygon();
    this.index = Surface.surfaceCounter;
    this.shape.attr('id', 'surface ' + Surface.surfaceCounter++);

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
    // this.strokeColor = '#000000';
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

    if (fastRender) {
      this.shape.stroke({
        color: '#333',
        width: 0.5
      });
      this.shape.fill({
        opacity: 0
      });
    } else {
      this.shape.stroke(this.stroke);
      this.shape.fill(this.fill);
    }

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
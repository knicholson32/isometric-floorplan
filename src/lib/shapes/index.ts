import type * as Types from '../types';
import * as helpers from '../helpers';

import { Polygon, Container, StrokeData, FillData, ArrayXY, Path } from '@svgdotjs/svg.js'
import { Matrix } from '@svgdotjs/svg.js';


const wallHeight = 150;

export class Entity {

  constructor() {

  }

  matrixTransform(_matrix: Types.Matrix2D) {}

  draw(_fastRender: boolean, _height: number) {}

  reset() {}

}


export class PathWrapper extends Entity {

  path;

  constructor(path: Path, container: Container) {
    super();
    this.path = path;

    this.path.fill({
      color: '#fff'
    });
    this.path.stroke({
      color: '#fff',
      width: 2
    })
    container.add(this.path);
  }

  matrixTransform(matrix: Types.Matrix2D) {
    this.path.transform(new Matrix(matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], 0, 0));
  }

}


export class Surface extends Entity {
  point1: Types.Point;
  point2: Types.Point;

  initial: {
    point1: Types.Point,
    point2: Types.Point
  };

  runningTranslate: Types.Point = {x: 0, y: 0};

  shape: Polygon;
  container: Container;
  
  static surfaceCounter = 0;
  static surfaces: Surface[] = [];
  
  index;
  renderOrderCache: { [key: number]: boolean | undefined } = {};

  stroke: StrokeData = {
    color: '#ffffff',
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


  coreTranslate(xTranslate: number, yTranslate: number) {
    this.initial.point1.x += xTranslate;
    this.initial.point2.x += xTranslate;
    this.initial.point1.y += yTranslate;
    this.initial.point2.y += yTranslate;
  }

  coreScale(scale: number) {
    this.initial.point1.x *= scale;
    this.initial.point1.y *= scale;
    this.initial.point2.x *= scale;
    this.initial.point2.y *= scale;
  }

  setRunningTranslate(xTranslate: number, yTranslate: number) {
    this.runningTranslate.x = xTranslate;
    this.runningTranslate.y = yTranslate;
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

    const translated1X = this.point1.x + this.runningTranslate.x;
    const translated2X = this.point2.x + this.runningTranslate.x;
    const translated1Y = this.point1.y + this.runningTranslate.y;
    const translated2Y = this.point2.y + this.runningTranslate.y;

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



export class Region {

  path;
  container: Container;

  constructor(container: Container, path: Path) {
    this.path = path;
    this.container = container;
  }
}
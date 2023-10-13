wallHeight = 200;

class Surface {
  point1;
  point2;
  initial;

  shape;
  container;

  static surfaceCounter = 0;

  static surfaces = [];

  renderOrderCache = {};

  constructor(container, initialPoint1, initialPoint2) {
    this.container = container;
    this.shape = new createjs.Shape();
    this.index = Surface.surfaceCounter;
    this.shape.name = 'surface ' + Surface.surfaceCounter++;
    this.shape.class = 'abc123';
    this.container.addChild(this.shape);

    if (Math.abs(initialPoint1.x - initialPoint2.x) < 0.1 && Math.abs(initialPoint1.y - initialPoint2.y) < 0.1) {
      console.log('CLOSE POINT!', initialPoint1, initialPoint2);
    }

    this.point1 = initialPoint1;
    this.point2 = initialPoint2;

    this.initial = {};

    this.initial.point1 = {
      x: initialPoint1.x,
      y: initialPoint1.y,
    };

    this.initial.point2 = {
      x: initialPoint2.x,
      y: initialPoint2.y,
    }
    this.updateEq();

    Surface.surfaces.push(this);
  }

  eq = (x) => x;
  slope = NaN;

  updateEq() {
    // const { x1: x1, y1: y1, x2: x2, y2: y2 } = line;

    // Protect against an odd slope
    if (Math.abs(this.point1.x - this.point2.x) < 0.1) {
      this.eq = (x) => NaN;
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

  // updatePoints(point1, point2) {
  //   this.point1 = point1;
  //   this.point2 = point2;
  //   return this;
  // }

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

  matrixTransform(matrix) {
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

  getLowestPoint() {
    return this.point1.y > this.point2.y ? this.point1.y : this.point2.y;
  }

  getHighestPoint() {
    return this.point1.y < this.point2.y ? this.point1.y : this.point2.y;
  }

  getLowestPoint() {
    return this.point1.y > this.point2.y ? this.point1.y : this.point2.y;
  }

  getAverageY() {
    return (this.point1.y + this.point2.y) / 2;
  }

  getSlope() {
    // return (this.point2.y - this.point1.y) / (this.point2.x - this.point1.x);
    return this.slope;
  }

  shouldOmit() {
    if (this instanceof Door) {
      return false;
    }
    // Use the slope to see if this wall is on the visible side or not
    const m = this.getSlope();
    // Based on the slope and direction of the line, omit this wall if required
    if (m > 0) {
      if (this.point2.y > this.point1.y) {
        this.shape.graphics.clear();
        return true;
      }
    } else {
      if (this.point2.y < this.point1.y) {
        this.shape.graphics.clear();
        return true;
      }
    }
    return false;
  }


  isRenderedBefore(b, debug=false) {

    // if (fast) {
    //   if (this.getLowestPoint() > b.getLowestPoint()) return false;
    //   return true;
    // }

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

    const overlap = do1DLineSegmentsOverlap([this.point1.x, this.point2.x], [b.point1.x, b.point2.x]);
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


  compareZIndex(b) {
    // // If both corners of wall a is below both corners of wall b, then a is in front of b
    // // If both corners of wall a is above both corners of wall b, then b is in front of a
    // if (this.getLowestPoint() < b.getHighestPoint()) return 1;  // B is in front of this surface
    // if (b.getLowestPoint() < this.getHighestPoint()) return -1; // B is behind this surface

    // For each line that overlaps with regards to y value, we need to do additional processing to calculate 
    // which surface should be rendered above the other.
    // Every surface (unless it is perfectly vertical), splits the screen into two regions based on the slope and
    // position of the surface: the area "above" and the area "below". When the slope is horizontal, this is easy
    // to see. When the slope is near-vertical it is less obvious.

    // If the other line segment is in this area that is "above" the surface, then the surface should be rendered
    // later. The opposite is also true.

    // If the slope of this segment is perfectly vertical (IE. the x positions for both points is the same), then
    // the one with the lower point should go on top.



    // If these two surfaces share a point, we can't actually determine which will be above the other unless 
    // they overlap on the X-axis also


    // return 0;

    // if (this.index === 0) {
    //   console.log(this.slope);
    //   this.strokeColor = '#ff00ff';
    // } else {
    //   this.strokeColor = '#ff0000';
    // }


    // Start by checking that the slope of this line
    if (isNaN(this.slope)) {
      // The slope is perfectly vertical. The one with the lower point is on top;
      // TODO: Test this function somehow
      this.strokeColor = '#ff00ff';
      if (this.getLowestPoint() > b.getLowestPoint()) {
        return -1; // B is behind this surface
      } else {
        return 1; // B is in front of this surface
      }
    }

    this.strokeColor = '#ff0000';

    // // We need to do this calculation with respect to the more horizontal line.
    // let determinantSeg;
    // let target;
    // let reverse = 1;
    // // If the other slope is vertical or if this slope is "shallower" than the other, use this line. Else use the other
    // if (isNaN(b.slope) || Math.abs(this.slope) < Math.abs(b.slope)) {
    //   // console.log(Math.abs(this.slope), Math.abs(b.slope));
    //   determinantSeg = this;
    //   target = b;
    //   this.strokeColor = '#ffff00';
    // } else {
    //   determinantSeg = b;
    //   target = this;
    //   reverse = -1;
    //   b.strokeColor = '#ffff00';
    // }


    // Use this segments slope to divide the scene into two areas
    const midPoint = {
      x: (b.point1.x + b.point2.x) / 2,
      y: (b.point1.y + b.point2.y) / 2
    }


    if (this.eq(midPoint.x) < midPoint.y) return 0;
    return -1;


    // const det = calculateDeterminant(midPoint, determinantSeg.point1, determinantSeg.point2);
    // if (det < 0) {
    //   return -1;
    // }
    // if (det > 0) {
    //   return 1
    // }

    // const p1 = determinantSeg.point1.x < determinantSeg.point2.x ? determinantSeg.point1 : determinantSeg.point2;
    // const p2 = determinantSeg.point1.x < determinantSeg.point2.x ? determinantSeg.point2 : determinantSeg.point1;

    // if (isLeft(p1, p2, midPoint)) {
    //   return -1;
    // } else {
    //   return 1;
    // }
    
    // console.log('Wow');
    return 0;


    if (overlap && overlap[0] !== overlap[1]) {
      // There is overlap. We need to figure out which one is above the other
      // We can do this by sampling at the center of the overlap. Whichever is higher will be above the other
      const midpointOfOverlap = (overlap[0] + overlap[1]) / 2;

      // console.log('mid', midpointOfOverlap);

      if (b.eq(midpointOfOverlap) < this.eq(midpointOfOverlap)) {
        // if (this.clicked && b.clicked) {
        //   console.log('' + (this.meta ? 'red' : 'green') + ' above', overlap, midpointOfOverlap);
        // }
        return 1;
      } else {
        // if (this.clicked && b.clicked) {
        //   console.log('' + (b.meta ? 'red' : 'green') + ' above', overlap, midpointOfOverlap);
        // }
        return -1;
      }
    } else {
      // No horizontal overlap. We can't tell which is above the other, so weight them as equal
      // console.log('unknown');
      const c = '#' + Math.floor(Math.random() * 0xffffff).toString(16);
      this.fillColor = c;
      b.fillColor = c;

      return 0;
      // // No overlap. Just choose based on which has the highest Y point
      // if (this.getHighestPoint() > b.getHighestPoint()) return 1;
      // else return -1;
    }


    // if (this.getLowestPoint() > b.getLowestPoint()) return 1;
    // return -1;
  }

}

class Door extends Surface {


  constructor(container, initialPoint1, initialPoint2) {
    super(container, initialPoint1, initialPoint2);
    this.shape.name = 'door ' + this.index;
    return this;
  }

  draw() {
    this.shape.graphics.clear();

    this.shape.graphics.setStrokeStyle(3);
    this.shape.graphics.beginStroke('#FF0000');
    // this.shape.graphics.beginFill(this.fillColor);

    // this.container.setChildIndex(this.shape, this.container.numChildren - 1);


    this.shape.graphics.moveTo(this.point1.x, this.point1.y);
    this.shape.graphics.moveTo(this.point2.x, this.point2.y);
    this.shape.graphics.lineTo(this.point2.x, this.point2.y + wallHeight);
    this.shape.graphics.lineTo(this.point1.x, this.point1.y + wallHeight);
    this.shape.graphics.lineTo(this.point1.x, this.point1.y);
    this.shape.graphics.lineTo(this.point2.x, this.point2.y);

    this.shape.graphics.endStroke();
    return this;
  }

}

class Wall extends Surface {

  static index = 0;

  strokeWidth = 1;
  strokeColor = '#aaaaaa';
  fillColor = '#000000';

  eq = () => {};

  clicked = false;
  meta = false;

  constructor(container, initialPoint1, initialPoint2) {
    super(container, initialPoint1, initialPoint2);
    this.shape.name = 'wall ' + Wall.index++;
    this.shape.on('click', (event) => {
      if (this.clicked) {
        this.clicked = false;
        this.fillColor = '#000000';
        this.draw();
        stage.update();
        return;
      }
      this.clicked = true;
      console.log(this.shape.name);
      if (event.nativeEvent.metaKey) {
        this.fillColor = '#FF0000';
        this.meta = true;
      } else {
        this.fillColor = '#00FF00';
        this.meta = false;
      }

      for (const surface of Surface.surfaces) {
        if (surface === this) continue;
        if (surface.clicked) {
          const res = this.isRenderedBefore(surface, true);
          this.fillColor = '#ff00ff';
          if (res === true) {
            console.log('Purple is rendered before');
          } else if (res === undefined) {
            console.log('Unknown render order');
          } else if (res === false) {
            console.log('Purple is rendered after');
          } 
        }
      }

      this.draw();
      stage.update();
    });
    return this;
  }

  draw() {

    this.renderOrderCache = {};
    this.shape.graphics.clear();
    // let point1DropDist = floorPlan.calculateDropDistance(this.point1);
    // let point2DropDist = floorPlan.calculateDropDistance(this.point2);

    // if (point1DropDist < 50 && point2DropDist < 50) return this;

    // if (this.shouldOmit()) return this;

    // if (this.clicked) this.fillColor = '#ff0000';

    this.shape.graphics.setStrokeStyle(this.strokeWidth);
    this.shape.graphics.beginStroke(this.strokeColor);
    this.shape.graphics.beginFill(this.fillColor);
    // this.container.setChildIndex(this.shape, this.container.numChildren - 1);
    
    this.shape.graphics.moveTo(this.point1.x, this.point1.y);
    this.shape.graphics.lineTo(this.point1.x, this.point1.y + wallHeight);
    this.shape.graphics.lineTo(this.point2.x, this.point2.y + wallHeight);
    this.shape.graphics.lineTo(this.point2.x, this.point2.y);
    this.shape.graphics.lineTo(this.point1.x, this.point1.y);
    
    // const centerX = (this.point1.x + this.point2.x) / 2
    // const centerY = (this.point1.y + this.point2.y) / 2

    // const width = Math.abs(this.point2.x - this.point1.x);
    // const height = Math.abs(this.point2.y - this.point1.y);

    // this.shape.graphics.moveTo(centerX + width / 2, centerY + width / 2);
    // this.shape.graphics.lineTo(centerX - width / 2, centerY + width / 2);
    // this.shape.graphics.lineTo(centerX - width / 2, centerY - width / 2);
    // this.shape.graphics.lineTo(centerX + width / 2, centerY - width / 2);
    // this.shape.graphics.lineTo(centerX + width / 2, centerY + width / 2);

    this.shape.graphics.endStroke();
    return this;
  }
}

class Polygon {
  points;
  initialPoints;

  upperShape;

  upperFillColor = '#000000';

  strokeColor = '#ffffff';
  strokeWidth = 3;

  static polygonIndex = 0;

  constructor(points, upperContainer) {
    this.points = points;
    this.initialPoints = [];
    for (const p of points) this.initialPoints.push({ x: p.x, y: p.y });

    this.upperShape = new createjs.Shape();
    this.upperShape.name = 'poly ' + Polygon.polygonIndex++;
    upperContainer.addChild(this.upperShape);
  }

  reset() {
    for (let i = 0; i < this.initialPoints.length; i++) {
      this.points[i].x = this.initialPoints[i].x;
      this.points[i].y = this.initialPoints[i].y;
    }
    // for (const wall of this.walls) wall.reset();
  }

  transform(x, y, scale) {
    for (const point of this.points) {
      point.x = (point.x + x) * scale;
      point.y = (point.y + y) * scale;
    }
  }

  getMinMaxCoords() {
    let maxX = this.points[0].x, maxY = this.points[0].y;
    let minX = this.points[0].x, minY = this.points[0].y;
    for (const point of this.points) {
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
    }
    return { minX, minY, maxX, maxY };
  }

  getMaxCoords() {
    let maxX = this.points[0].x, maxY = this.points[0].y;
    for (const point of this.points) {
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
    return {x: maxX, y: maxY};
  }

  matrixTransform(matrix) {
    for (const point of this.points) {
      const xPrime = point.x * matrix[0][0] + point.y * matrix[0][1];
      const yPrime = point.x * matrix[1][0] + point.y * matrix[1][1];    
      point.x = xPrime;
      point.y = yPrime;
    }
    // for (const wall of this.walls) wall.matrixTransform(matrix);
  }

  draw() {
    this.upperShape.graphics.clear();
    this.upperShape.graphics.setStrokeStyle(this.strokeWidth);
    this.upperShape.graphics.beginStroke(this.strokeColor);
    this.upperShape.graphics.beginFill(this.upperFillColor);
    stage.setChildIndex(this.upperShape, stage.numChildren - 1);
    let trailingPoint = this.points[this.points.length - 1];
    this.upperShape.graphics.moveTo(trailingPoint.x, trailingPoint.y);
    for (const point of this.points) {
      this.upperShape.graphics.lineTo(point.x, point.y);
    }
    this.upperShape.graphics.endStroke()
  }
}

class FloorPlan {

  polyPoints = [];
  doorPoints = [];

  polygons = [];
  surfaces = [];

  container;


  constructor() {
    this.container = {
      upper: new createjs.Container(),
      surface: new createjs.Container()
    }
    this.container.surface.name = 'Surface';
    this.container.upper.name = 'Floorplan';

    stage.addChild(this.container.surface);
    stage.addChild(this.container.upper);

    // this.upperContainer.setTransform(0, 0, 1, 1, 0, 0, 0, 500, 400);

  }

  addPolygon (points) {
    this.polyPoints.push(points);
  }

  addDoor (point1, point2) {
    this.doorPoints.push([point1, point2]);
  }

  getMinMaxCoords() {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const point of this.polyPoints.flat()) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
    return { minX, minY, maxX, maxY };
  }

  center(size, center) {
    // Move the floorplan to the 0,0 position
    let mm = this.getMinMaxCoords();
    for (const poly of this.polyPoints) {
      for (const point of poly) {
        point.x += -mm.minX - (mm.maxX - mm.minX) / 2;
        point.y += -mm.minY - (mm.maxY - mm.minY) / 2;
        point.x *= 1.25;
        point.y *= 1.25;
      }
    }
    for (const door of this.doorPoints) {
      for (const point of door) {
        point.x += -mm.minX - (mm.maxX - mm.minX) / 2;
        point.y += -mm.minY - (mm.maxY - mm.minY) / 2;
        point.x *= 1.25;
        point.y *= 1.25;
      }
    }

    // // Scale the floorplan so it fills the size specified
    // mm = this.getMinMaxCoords();
    // const scaleX = size.x / mm.maxX;
    // const scaleY = size.y / mm.maxY;
    // let scale = scaleX;
    // if (scaleY < scaleX) scale = scaleY;
    // for (const poly of this.polyPoints) {
    //   for (const point of poly) {
    //     point.x *= scale;
    //     point.y *= scale;
    //   }
    // }

    // // Move the floorplan to the 0,0 position
    // mm = this.getMinMaxCoords();
    // for (const poly of this.polyPoints) {
    //   for (const point of poly) {
    //     point.x += (mm.maxX - mm.minX) / 2;
    //     point.y += (mm.maxY - mm.minY) / 2;
    //   }
    // }

    this.container.upper.setTransform(center.x, center.y);
    this.container.surface.setTransform(center.x, center.y);

    for (const polyPoints of this.polyPoints) {
      const p = new Polygon(polyPoints, this.container.upper);
      this.polygons.push(p);
      for (let i = 0; i < polyPoints.length - 1; i++) {
        const initialPoint1 = polyPoints[i];
        const initialPoint2 = polyPoints[i + 1];
        if (Math.abs(initialPoint1.x - initialPoint2.x) < 0.1 && Math.abs(initialPoint1.y - initialPoint2.y) < 0.1) {
          console.warn('Two adjacent points appear to be duplicated', initialPoint1, initialPoint2);
        } else {
          this.surfaces.push(new Wall(this.container.surface, initialPoint1, initialPoint2));
        }
      }
    }

    for (const doorPoints of this.doorPoints) {
      const p = new Door(this.container.surface, doorPoints[0], doorPoints[1]);
      this.surfaces.push(p);
    }
  }

  translate(baseRotation, isometricRotation) {

    const rotationMatrix = getRotationMatrix(baseRotation);
    const isometricMatrix = getIsometricMatrix(isometricRotation);

    wallHeight = Math.cos((isometricRotation * Math.PI * 2) / 180) * 200;
    // wallHeight = 20;
    

    for (const poly of this.polygons) {
      poly.reset();
      poly.matrixTransform(rotationMatrix);
      poly.matrixTransform(isometricMatrix);
    }

    for (const surface of this.surfaces) {
      surface.reset();
      surface.matrixTransform(rotationMatrix);
      surface.matrixTransform(isometricMatrix);
    }
  }

  draw (fast=false) {

    // const t0 = performance.now();

    const debug = false;

    let toSort = this.surfaces.concat([]); // this.surfaces.filter((a) => !a.shouldOmit());
    for (const surface of toSort) {
      surface.strokeColor = '#ffffff';
      if (fast) {
        surface.fillColor = undefined;
        surface.strokeColor = '#333333';
      }
      else surface.fillColor = '#000000';
    }

    for (const poly of this.polygons) {
      if (fast) poly.strokeColor = '#333333';
      else poly.strokeColor = '#ffffff';
    }

    let toDraw = [];
    let numComparisons = 0;

    if (fast) {
      toDraw = this.surfaces;
    } else {

      if (debug) {
        for (const surface of toSort) surface.shape.graphics.clear();
        stage.update();
        console.clear();
      }

      

      // We need to loop through each z-slot and find the best shape to go there
      // We will describe "best" as no other shapes are below it ~and~ as few undefined orders as possible

      // We'll go through every shape and compare it against every other shape. Then we will pick the one
      // with the best score, add it to the toDraw array, remove it from the toSort array, and start again.
      // This process repeats until there are no more surfaces in the toSort array

      let done = false;

      while (toSort.length > 0 || done) {
        // Clear the options array
        let options = [];
        for (const primary of toSort) {
          // In order for a shape to be eligible to be drawn next, it has to have no shapes below it
          let hasNoBelow = true;
          let numUndefined = 0;
          for (const surface of toSort) {
            if (primary === surface) continue;
            const res = primary.isRenderedBefore(surface);
            numComparisons++;
            if (res === undefined) numUndefined++;
            else if (res === false) {
              hasNoBelow = false;
              break;
            }
          }
          // If we get here and hasNoBelow is still true, we can consider this shape eligible
          if (hasNoBelow === true) {
            options.push({
              surface: primary,
              numUndefined: numUndefined
            })
          }
        }


        // If there are no options, not sure what to do
        if (options.length === 0) {
          console.log('NO OPTIONS');
          break;
        } else {
          // We go through the options and pick the best one. Will will therefore sort by numUndefined
          // options.sort((a, b) => a.numUndefined - b.numUndefined);
          let bestOption = options[0];
          for (const option of options) {
            if (option.numUndefined < bestOption.numUndefined) bestOption = option;
          }
          // Add the best surface to the toDraw list
          toDraw.push(bestOption.surface);
          // Move this shape to the right location
          this.container.surface.setChildIndex(bestOption.surface.shape, this.container.surface.numChildren - 1);
          // Remove the surface from the sort list
          const idx = toSort.indexOf(bestOption.surface);
          toSort.splice(idx, 1);

          if (debug) {
            console.log(bestOption.surface.shape.name);
            options[0].surface.draw();
            stage.update();
          }
        }

        // if (debug) await new Promise(r => setTimeout(r, 100));
      }
    }

    for (const surface of toDraw) surface.draw();
    for (const poly of this.polygons) poly.draw();

    // stage.update();

    // const t1 = performance.now();
    // console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);
    // console.log(`${numComparisons.toLocaleString()} numComparisons`);

  }

  draw2() {
    // Filter the surfaces that are obviously not supposed to be drawn (the ones behind the walls in polygons)
    let toSort = this.surfaces.concat([]); // this.surfaces.filter((a) => !a.shouldOmit());
    // let toSort = this.surfaces.filter((a) => !a.shouldOmit());

    // console.log('starting with', toSort.length)

    // We need to loop through every possible z-slot and figure out which shape should go there.
    let toDraw = [];
    const iterations = toSort.length;
    for (let i = 0; i < iterations; i++) {
      // Find the right surface for this slot
      let currentFarthest = toSort[0];
      let sorting = true;

      // Go through every combo of surfaces and keep track of which one is the farthest. If a new
      // surface is found to be farther, restart the sort process to get every comparison. Repeat
      // until the same surface is the farthest throughout the entire process

      // console.log('sort process with', toSort.length);

      let sortCounter = 0;
      while (sorting && sortCounter < toSort.length + 10) {
        // Assume we will find the farthest surface
        sorting = false;
        sortCounter++;
        // Loop through every surface
        for (const surface of toSort) {
          // Skip the same-surface comparison
          if (surface === currentFarthest) {
            // sorting = true;
            // console.log('continue');
            continue;
          }
          // If the other surface is farther from the camera, it is the new farthest
          const res = currentFarthest.isRenderedBefore(surface);
          if (res === undefined) console.log('z');
          if (res === false) {
            // Assign and break from this loop. We will redo the check using this new surface
            currentFarthest = surface;
            sorting = true;
            break;
          }
        }
      }

      currentFarthest.fillColor = '#' + Math.round(((i + 16) / (iterations + 16)) * 256).toString(16) + Math.round(((i + 16) / (iterations + 16)) * 256).toString(16) + Math.round(((i + 16) / (iterations + 16)) * 256).toString(16);
      // console.log(currentFarthest.strokeColor);


      // Add this one to the list to be drawn first
      toDraw.push(currentFarthest);

      // Remove the surface from the sort list
      const idx = toSort.indexOf(currentFarthest);
      toSort.splice(idx, 1);

      // console.log('Sort Counter', sortCounter);
      // console.log(toSort.length);
      // console.log(toDraw.length);
      // console.log(currentFarthest, idx);
      // break;
    }

    // console.log('toDraw', toDraw.length);

    // Draw the surfaces and polygons
    // toDraw = this.surfaces.concat([]); // this.surfaces.filter((a) => !a.shouldOmit());
    // toDraw.sort((a, b) => a.compareZIndex(b) * -1);
    for (const surface of toDraw) surface.draw();
    // for (const poly of this.polygons) poly.draw();
  }

  reset() {
    for (const poly of this.polygons) poly.reset();
    for (const surface of this.surfaces) surface.reset();
  }

}
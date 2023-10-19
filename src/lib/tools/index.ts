import { Entity, Surface } from "../shapes";
import * as helpers from '../helpers';
import * as Types from '../types';
import { Rect } from '@svgdotjs/svg.js';
import { PointArray } from '@svgdotjs/svg.js';
import * as martinez from 'martinez-polygon-clipping'


export const transform = (surfaces: Entity[], baseRotation: number, isometricRotation: number, scale: number) => {
  const scaleMatrix = helpers.getScaleMatrix(scale);
  const rotationMatrix = helpers.getRotationMatrix(baseRotation);
  const isometricMatrix = helpers.getIsometricMatrix(isometricRotation);

  const scaleRotation = helpers.multiply(rotationMatrix, scaleMatrix, 2) as Types.Matrix2D
  const isometricTransform = helpers.multiply(isometricMatrix, scaleRotation, 2) as Types.Matrix2D

  for (const surface of surfaces) {
    surface.reset();
    surface.matrixTransform(isometricTransform);
  }
}

export const sortSurfaces = (surfaces: Surface[], fast=true) => {
  // const debug = false;

  let toSort = surfaces.concat([]);

  // for (const surface of toSort) {
  //   surface.strokeColor = '#ffffff';
  //   if (fast) {
  //     surface.fillColor = undefined;
  //     surface.strokeColor = '#333333';
  //   }
  //   else surface.fillColor = '#000000';
  // }

  // for (const poly of this.polygons) {
  //   if (fast) poly.strokeColor = '#333333';
  //   else poly.strokeColor = '#ffffff';
  // }

  let toDraw = [];
  let numComparisons = 0;

  if (fast) {
    return surfaces;
  } else {

    // if (debug) {
    //   for (const surface of toSort) surface.shape.graphics.clear();
    //   stage.update();
    //   console.clear();
    // }



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
        // // Move this shape to the right location
        // this.container.surface.setChildIndex(bestOption.surface.shape, this.container.surface.numChildren - 1);
        // Remove the surface from the sort list
        const idx = toSort.indexOf(bestOption.surface);
        toSort.splice(idx, 1);

        // if (debug) {
        //   console.log(bestOption.surface.shape.name);
        //   options[0].surface.draw();
        //   stage.update();
        // }
      }

      // if (debug) await new Promise(r => setTimeout(r, 100));
    }
  }

  return toDraw;
}

export const rectToPoints = (rect: Rect) => {
  const x = new Number(rect.x()).valueOf();
  const y = new Number(rect.y()).valueOf();
  const w = new Number(rect.width()).valueOf();
  const h = new Number(rect.height()).valueOf();
  return new PointArray([
    x, y,
    x + w, y,
    x + w, y + h,
    x, y + h,
    x, y,
  ]);
}


const _pointPolyToGeometryPoly = (points: Types.Point[]): martinez.Polygon => {
  const poly: martinez.Polygon = [];
  poly[0] = [];
  for (const point of points) {
    const position: martinez.Position = [point.x, point.y];
    poly[0].push(position);
  }
  return poly;
}


/**
 * Union all polygons together in a group
 * @param polygons the polygons to union together
 * @returns the resulting polygons
 */
export const unionAll = (polygons: Types.Point[][]): Types.Point[][] => {
  // TODO: Consider trying another lib: https://github.com/w8r/GreinerHormann
  let runningPoly: martinez.MultiPolygon = [_pointPolyToGeometryPoly(polygons[0])];
  for (let i = 1; i < polygons.length; i++) {
    const result = martinez.union(runningPoly, _pointPolyToGeometryPoly(polygons[i]));
    if (typeof result[0][0][0] === 'number') {
      // The result is a Polygon
      runningPoly = [result as martinez.Polygon];
    } else {
      // The result is a MultiPolygon
      runningPoly = result as martinez.MultiPolygon;
    }
  }

  const unionPolygons: Types.Point[][] = [];

  for (const poly of runningPoly) {
    const exportPoly: Types.Point[] = [];
    for (const p of poly[0]) {
      exportPoly.push({
        x: p[0],
        y: p[1]
      });
    }
    unionPolygons.push(exportPoly);
  }

  return unionPolygons;
}
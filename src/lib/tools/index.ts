import { Entity, Surface } from "../shapes";
import * as helpers from '../helpers';
import type * as Types from '../types';


export const transform = (surfaces: Entity[], baseRotation: number, isometricRotation: number) => {
  const rotationMatrix = helpers.getRotationMatrix(baseRotation);
  const isometricMatrix = helpers.getIsometricMatrix(isometricRotation);

  for (const surface of surfaces) {
    surface.reset();
    surface.matrixTransform(helpers.multiply(isometricMatrix, rotationMatrix, 2) as Types.Matrix2D);
  }
}

export const getMinMaxCoords = (surfaces: Surface[]) => {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const surface of surfaces) {
    if (surface.point1.x < minX) minX = surface.point1.x;
    if (surface.point2.x < minX) minX = surface.point2.x;
    if (surface.point1.x > maxX) maxX = surface.point1.x;
    if (surface.point2.x > maxX) maxX = surface.point2.x;
    if (surface.point1.y < minY) minY = surface.point1.y;
    if (surface.point1.y < minY) minY = surface.point1.y;
    if (surface.point2.y > maxY) maxY = surface.point2.y;
    if (surface.point2.y > maxY) maxY = surface.point2.y;
  }
  return { minX, minY, maxX, maxY };
}

export const centerScale = (surfaces: Surface[], size: Types.Point) => {
  const center = {
    x: size.x / 2,
    y: size.y / 2
  };
  // Move the floorplan to the 0,0 position
  let mm = getMinMaxCoords(surfaces);
  {
    const xTranslate = -mm.minX - (mm.maxX - mm.minX) / 2;
    const yTranslate = -mm.minY - (mm.maxY - mm.minY) / 2;
    for (const surface of surfaces) surface.coreTranslate(xTranslate, yTranslate);
    // TODO: Calculate this better
    for (const surface of surfaces) surface.coreScale(0.75);
  }

  // mm = getMinMaxCoords(surfaces);
  // stage.polygon([mm.minX,mm.minY, mm.minX,mm.maxY, mm.maxX,mm.maxY, mm.maxX,mm.minY, mm.minX,mm.minY]).fill({opacity: 0}).stroke({color: '#f00', width: 3});
  // The transformations will all be done around 0,0. After translations, the running translate points will move the 
  // shape to be centered around the specified location
  for (const surface of surfaces) surface.setRunningTranslate(center.x, center.y);
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
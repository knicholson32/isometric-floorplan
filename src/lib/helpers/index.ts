
import { ArrayXY } from '@svgdotjs/svg.js';
import type * as Types from '../types';

/**
 * Get a matrix that can isometrically distort the scene
 * @param angleInDegrees the angle of the isometric distortion
 * @returns the distortion matrix
 */
export const getIsometricMatrix = (angleInDegrees: number): Types.Matrix2D => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  const cosA = Math.cos(angleInRadians);
  const sinA = Math.sin(angleInRadians);

  return [
    [cosA, -cosA],
    [sinA, sinA]
  ];
}

/**
 * Convert from an ArrayXY to a Point
 * @param pointArray the ArrayXY
 * @returns the Point
 */
export const arrayXYToPoint = (pointArray: ArrayXY): Types.Point => {
  return {
    x: pointArray[0] / 1.25,
    y: pointArray[1] / 1.25
  }
}

/**
 * Get matrix that can rotate the scene
 * @param angleInDegrees the degrees to rotate
 * @returns the rotation matrix
 */
export const getRotationMatrix = (angleInDegrees: number): Types.Matrix2D => {
  // Convert the angle to radians
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  // Define the initial rotation matrix
  return [
    [Math.cos(angleInRadians), -Math.sin(angleInRadians)],
    [Math.sin(angleInRadians), Math.cos(angleInRadians)]
  ];
}


/**
 * Calculate whether or not two line segments overlap
 * @param segment1 the first segment
 * @param segment2 the second segment
 * @returns the overlapping section, or false if no overlap
 */
export const do1DLineSegmentsOverlap = (segment1: [number, number], segment2: [number, number]): false | [number, number] => {
  // let [A, B] = segment1.sort((a, b) => a - b);
  // let [C, D] = segment2.sort((a, b) => a - b);

  let [A, B] = segment1[0] < segment1[1] ? [segment1[0], segment1[1]] : [segment1[1], segment1[0]];
  let [C, D] = segment2[0] < segment2[1] ? [segment2[0], segment2[1]] : [segment2[1], segment2[0]];

  if (B < C || D < A) {
    return false; // No overlap
  }

  let overlapStart = Math.max(A, C);
  let overlapEnd = Math.min(B, D);

  return [overlapStart, overlapEnd];
}


// This function multiplies 
// mat1[][] and mat2[][], and 
// stores the result in res[][] 
export const multiply = (mat1: number[][], mat2: number[][], N=2) => {
  const res: number[][] = new Array(N).fill(0).map(() => new Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    res.push([]);
    for (let j = 0; j < N; j++) {
      res[i][j] = 0;
      for (let k = 0; k < N; k++)
        res[i][j] += mat1[i][k] * mat2[k][j];
    }
  }
  return res;
}
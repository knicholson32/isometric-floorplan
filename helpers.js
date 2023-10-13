function getIsometricMatrix(angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  const cosA = Math.cos(angleInRadians);
  const sinA = Math.sin(angleInRadians);

  return [
    [cosA, -cosA],
    [sinA, sinA]
  ];
}

function getRotationMatrix(angleInDegrees) {
  // Convert the angle to radians
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  // Define the initial rotation matrix
  return [
    [Math.cos(angleInRadians), -Math.sin(angleInRadians)],
    [Math.sin(angleInRadians), Math.cos(angleInRadians)]
  ];
}


function doLineSegmentsIntersect(line1, line2) {
  // Extract coordinates of line1 and line2
  const { x1: x1a, y1: y1a, x2: x2a, y2: y2a } = line1;
  const { x1: x1b, y1: y1b, x2: x2b, y2: y2b } = line2;

  // Calculate the direction vectors of the lines
  const dx1 = x2a - x1a;
  const dy1 = y2a - y1a;
  const dx2 = x2b - x1b;
  const dy2 = y2b - y1b;

  // Calculate the determinants
  const determinant = dx1 * dy2 - dx2 * dy1;
  const t1 = ((x1b - x1a) * dy2 - (y1b - y1a) * dx2) / determinant;
  const t2 = ((x1b - x1a) * dy1 - (y1b - y1a) * dx1) / determinant;

  // Check if there is an intersection within the line segments
  if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
    const intersectionX = x1a + t1 * dx1;
    const intersectionY = y1a + t1 * dy1;
    return { x: intersectionX, y: intersectionY };
  }

  return null;
}

function do1DLineSegmentsOverlap(segment1, segment2) {
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

function lineEq(line, x) {
  // const { x1: x1, y1: y1, x2: x2, y2: y2 } = line;

  // Calculate the slope
  const m = (line.y2 - line.y1) / (line.x2 - line.x1);

  // Calculate the y-intercept
  const b = line.y1 - m * line.x1;

  return m * x + b;
}


function calculateDeterminant(point, linePoint1, linePoint2) {
  // Calculate vectors from linePoint1 to linePoint2 and from linePoint1 to the given point
  const vectorLine = { x: linePoint2.x - linePoint1.x, y: linePoint2.y - linePoint1.y };
  const vectorPoint = { x: point.x - linePoint1.x, y: point.y - linePoint1.y };

  // Calculate the determinant
  const determinant = vectorLine.x * vectorPoint.y - vectorLine.y * vectorPoint.x;

  return determinant;
  
  if (determinant > 0) {
    return "above";
  } else if (determinant < 0) {
    return "below";
  } else {
    return "on the line";
  }
}


// https://stackoverflow.com/questions/1560492/how-to-tell-whether-a-point-is-to-the-right-or-left-side-of-a-line
function isLeft(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
}
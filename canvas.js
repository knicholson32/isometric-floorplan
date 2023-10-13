
// (createjs.Graphics.Polygon = function (x, y, points) {
//   this.x = x;
//   this.y = y;
//   this.points = points;
// }).prototype.exec = function (ctx) {
//   var start = this.points[0];
//   ctx.moveTo(start.x, start.y);
//   this.points.slice(1).forEach(function (point) {
//     ctx.lineTo(point.x, point.y);
//   });
//   ctx.lineTo(start.x, start.y);
// }

// createjs.Graphics.prototype.drawPolygon = function (x, y, args) {
//   var points = [];
//   if (Array.isArray(args)) {
//     args.forEach(function (point) {
//       point = Array.isArray(point) ? { x: point[0], y: point[1] } : point;
//       points.push(point);
//     });
//   } else {
//     args = Array.prototype.slice.call(arguments).slice(2);
//     var x = null;
//     args.forEach(function (val) {
//       if (x == null) {
//         x = val;
//       } else {
//         points.push({ x: x, y: val });
//         x = null;
//       }
//     });
//   }
//   return this.append(new createjs.Graphics.Polygon(x, y, points));
// }

var stage;


let canvas;
let canvasSize;
let center;
let size;
const mousePos = { x: 0.932, y: 0.483125 }; //{x: 0.5, y: 0.5};
const mousePosOffset = { x: 0, y: 0 }; //{x: 0.5, y: 0.5};

let floorPlan;

rotation = 0;
function frame(fast=true) {
  // const t0 = performance.now();
  const baseRotation = ((mousePos.x - 0.5) * -2) * 180;
  const isometricRotation = (mousePos.y) * 45;
  floorPlan.translate(baseRotation, isometricRotation);
  floorPlan.draw(fast);
  stage.update();
  // const t1 = performance.now();
  // console.log(`Call to frame took ${t1 - t0} milliseconds.`);
  // console.log(stage);
}

var primaryMouseButtonDown = false;
function setPrimaryButtonState(e) {
  var flags = e.buttons !== undefined ? e.buttons : e.which;
  primaryMouseButtonDown = (flags & 1) === 1;

  if (primaryMouseButtonDown === false) {
    frame(false);
  }
}
document.addEventListener("mousedown", setPrimaryButtonState);
document.addEventListener("mousemove", setPrimaryButtonState);
document.addEventListener("mouseup", setPrimaryButtonState);

function setDPI(canvas, dpi) {
  // Set up CSS size.
  canvas.style.width = canvas.style.width || canvas.width + 'px';
  canvas.style.height = canvas.style.height || canvas.height + 'px';

  // Get size information.
  var scaleFactor = dpi / 96;
  var width = parseFloat(canvas.style.width);
  var height = parseFloat(canvas.style.height);

  // Backup the canvas contents.
  var oldScale = canvas.width / width;
  var backupScale = scaleFactor / oldScale;
  var backup = canvas.cloneNode(false);
  backup.getContext('2d').drawImage(canvas, 0, 0);

  // Resize the canvas.
  var ctx = canvas.getContext('2d');
  canvas.width = Math.ceil(width * scaleFactor);
  canvas.height = Math.ceil(height * scaleFactor);

  // Redraw the canvas image and scale future draws.
  ctx.setTransform(backupScale, 0, 0, backupScale, 0, 0);
  ctx.drawImage(backup, 0, 0);
  ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
}

document.addEventListener('keydown', (event) => {
  var name = event.key;
  var code = event.code;
  // Alert the key name and key code on keydown
  // alert(`Key pressed ${name} \r\n Key code value: ${code}`);
  frame();
}, false);

function init() {


  canvas = document.getElementById('canvas');
  setDPI(canvas, 192);

  canvasSize = { x: canvas.width, y: canvas.height };
  center = { x: canvasSize.x / 2, y: canvasSize.y / 2 };
  size = { x: canvasSize.x - 100, y: canvasSize.y - 100 };

  stage = new createjs.Stage("canvas");

  stage.on("stagemousemove", function (evt) { // pressmove
    if (primaryMouseButtonDown) {
      mousePos.x = evt.stageX / canvasSize.x;
      mousePos.y = evt.stageY / canvasSize.y;
      frame();
    }
  });

  stage.on("stagemousedown", () => {
    runExport();
    // frame();
  });


  floorPlan = new FloorPlan();
  const src = document.getElementById('floor').children;
  let numPts = 0;
  for (const c of src) {
    if (c.tagName === 'polyline') {
      let points = [];
      const polyPoints = c.getAttribute('points').split(' ');
      for (const p of polyPoints) {
        const pSplit = p.replace('\t', '').replace('\n', '').split(',');
        if (pSplit.length !== 2) continue;
        points.push({
          x: parseFloat(pSplit[0]),
          y: parseFloat(pSplit[1])
        });
      }
      floorPlan.addPolygon(points);
      numPts += points.length;
    } if (c.tagName === 'polygon') {
      let points = [];
      const polyPoints = c.getAttribute('points').split(' ');
      let lastPoint = undefined;
      for (const p of polyPoints) {
        const pSplit = p.replace('\t', '').replace('\n', '').split(',');
        if (pSplit.length !== 2) continue;
        const point = {
          x: parseFloat(pSplit[0]),
          y: parseFloat(pSplit[1])
        };
        points.push(point);

        lastPoint = point;
      }
      // Polygons don't repeat the first point again, so we will add it here instead
      points.push({
        x: points[0].x,
        y: points[0].y
      });
      floorPlan.addPolygon(points);
      numPts += points.length;
    } else if (c.tagName === 'line') {
      floorPlan.addDoor({
        x: parseFloat(c.getAttribute('x1')),
        y: parseFloat(c.getAttribute('y1'))
      }, {
        x: parseFloat(c.getAttribute('x2')),
        y: parseFloat(c.getAttribute('y2'))
      });
    } else if (c.tagName === 'rect') {
      console.log(c);
    }
  }
  floorPlan.center(size, center);

  console.log(numPts + ' points');

  // setInterval(frame, 10);

  frame();

  // runExport();
}

function runExport() {
  exporter = new SVGExporter(stage, false, false, false);
  var t = new Date().getTime();
  exporter.run();
  statusEl.innerHTML = "Export took: " + (new Date().getTime() - t) + "ms ";
  setTimeout(addDownload, 1); // for some reason, it takes a tick for the browser to init the SVG
  document.body.appendChild(exporter.svg);
}

function addDownload() {
  var serializer = new XMLSerializer();
  var svgStr = serializer.serializeToString(exporter.svg);
  var link = document.createElement("a");
  link.innerText = "SAVE SVG TO FILE";
  link.download = "export.svg";
  link.href = "data:image/svg+xml,\n" + encodeURIComponent(svgStr);
  statusEl.appendChild(link);
}
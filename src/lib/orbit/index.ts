
// import events from 'events'

type OrbitCallback = (fastRender: boolean, rotation: number, tilt: number, height: number) => void;

export default class Orbit {
  orbitCallback: OrbitCallback;

  hasRendered: boolean = true;

  constructor(target: SVGSVGElement, orbitCallback: OrbitCallback) {
    // super();

    this.orbitCallback = orbitCallback;

    target.onmousemove = (event: MouseEvent) => {

      const box = target.getBoundingClientRect();
      const normalizedX = event.offsetX / box.width;  // 0-1
      const normalizedY = event.offsetY / box.height; // 0-1

      if (event.buttons === 1) {
        // Click and drag
        this.hasRendered = false;
        // Convert the mouse movement to relative movement (0-1) based on the target element
        this.orbitCallback(true, normalizedX * -360 + 135, normalizedY * 45, 1 - normalizedY)
      } else {
        // Just moving around
        if (this.hasRendered === false) {
          this.hasRendered = true;
          this.orbitCallback(false, normalizedX * -360 + 135, normalizedY * 45, 1 - normalizedY)
        }
      }
    };

    document.onmouseup = (event: MouseEvent) => {
      if (this.hasRendered === false) {
        this.hasRendered = true;
        const box = target.getBoundingClientRect();
        const normalizedX = event.offsetX / box.width;  // 0-1
        const normalizedY = event.offsetY / box.height; // 0-1
        this.orbitCallback(false, normalizedX * -360 + 135, normalizedY * 45, 1 - normalizedY)
      }
    }

    this.orbitCallback(true, (0.625) * -360 + 135, (0.75) * 45, 1 - (0.75));
    this.orbitCallback(false, (0.625) * -360 + 135, (0.75) * 45, 1 - (0.75));
  }
}
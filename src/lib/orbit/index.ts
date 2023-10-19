type OrbitCallback = (fastRender: boolean, rotation: number, tilt: number, height: number, scale: number) => void;

type Angles = { rotation: number, tilt: number, scale: number };

type OrbitData = {
  angles: Angles,
  version: string
}

const ORBIT_DATA_VERSION = 'v1';
export default class Orbit {
  orbitCallback: OrbitCallback;

  currentAngles: Angles = { rotation: -45, tilt: 45, scale: 0.5};

  wheelTimeoutID: ReturnType<typeof setTimeout> | undefined = undefined;

  constructor(target: SVGSVGElement, orbitCallback: OrbitCallback) {
    this.orbitCallback = orbitCallback;

    // Reading the value, which was store as "theValue"
    const orbitDataRaw = localStorage ? localStorage.getItem('orbit') : null;
    if (orbitDataRaw !== null) {
      try {
        const orbitData = JSON.parse(orbitDataRaw) as OrbitData;
        if (orbitData.version === ORBIT_DATA_VERSION) {
          this.currentAngles = orbitData.angles;
        } else {
          localStorage.removeItem('orbit');
        }
      } catch(e) {
        localStorage.removeItem('orbit');
      }
    }

    window.addEventListener("wheel", event => {
      if (this.wheelTimeoutID !== undefined) {
        clearTimeout(this.wheelTimeoutID);
        this.wheelTimeoutID = undefined;
      }
      const delta = Math.sign(event.deltaY);
      this.move(0, 0, delta, true);
      this.wheelTimeoutID = setTimeout(() => this.move(0, 0, 0, false), 500);
    });

    target.onmousemove = (event: MouseEvent) => {
      if (event.buttons === 1) this.move(event.movementX, event.movementY, 0, true);
    };

    document.onmouseup = (event: MouseEvent) => this.move(event.movementX, event.movementY, 0, false);
    this.move(0, 0, 0, false);
  }

  saveOrbitData() {
    if (localStorage) {
      const orbitData = {
        version: ORBIT_DATA_VERSION,
        angles: this.currentAngles
      } satisfies OrbitData;
      localStorage.setItem('orbit', JSON.stringify(orbitData));
    }
  }

  move(movementX: number, movementY: number, scroll: number, fastRender: boolean) {
    this.currentAngles.rotation -= movementX * 0.4;
    this.currentAngles.tilt += movementY * 0.2;

    if (this.currentAngles.tilt < 0) this.currentAngles.tilt = 0;
    else if (this.currentAngles.tilt > 90) this.currentAngles.tilt = 90;
    if (this.currentAngles.rotation < 0) this.currentAngles.rotation += 360;
    else if (this.currentAngles.rotation > 360) this.currentAngles.rotation -= 360;

    this.currentAngles.scale *= (1 - scroll * 0.01);
    // this.currentAngles.scale += scroll * 0.005;
    if (this.currentAngles.scale < 0.2) this.currentAngles.scale = 0.2;
    else if (this.currentAngles.scale > 3) this.currentAngles.scale = 3;

    const heightNormalized = Math.cos(this.currentAngles.tilt * Math.PI / 180);
    this.orbitCallback(fastRender, this.currentAngles.rotation, this.currentAngles.tilt, heightNormalized, this.currentAngles.scale);
    this.saveOrbitData();
  }
}
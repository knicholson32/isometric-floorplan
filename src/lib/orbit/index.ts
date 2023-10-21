import type { Point } from '$lib/types';
import type { Svg } from '@svgdotjs/svg.js';

type OrbitCallback = (
	fastRender: boolean,
	rotation: number,
	tilt: number,
	height: number,
	scale: number
) => void;

type Angles = { rotation: number; tilt: number; scale: number };

type OrbitData = {
	angles: Angles;
	version: string;
};

// TODO: Read out angles to canvas in the bottom corner

const ORBIT_DATA_VERSION = 'v1';
export default class Orbit {
	orbitCallback: OrbitCallback;

	currentAngles: Angles = { rotation: -45, tilt: 45, scale: 0.5 };
	lastAngles: Angles = { rotation: -45, tilt: 45, scale: 0.5 };

	wheelTimeoutID: ReturnType<typeof setTimeout> | undefined = undefined;

	svgSize: Point;
	svg: Svg;

	text;
	// logo;

	constructor(svg: Svg, orbitCallback: OrbitCallback) {
		this.orbitCallback = orbitCallback;

		this.svg = svg;
		const target = this.svg.node;

		this.svgSize = {
			x: new Number(svg.width()).valueOf(),
			y: new Number(svg.height()).valueOf()
		};

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
			} catch (e) {
				localStorage.removeItem('orbit');
			}
		}

		window.addEventListener('wheel', (event) => {
			if (this.wheelTimeoutID !== undefined) {
				clearTimeout(this.wheelTimeoutID);
				this.wheelTimeoutID = undefined;
			}
			const delta = event.deltaY / 2;
			this.move(0, 0, delta, true);
			this.wheelTimeoutID = setTimeout(() => this.move(0, 0, 0, false), 500);
		});

		target.onmousemove = (event: MouseEvent) => {
			if (event.buttons === 1) this.move(event.movementX, event.movementY, 0, true);
		};

		document.onmouseup = (event: MouseEvent) =>
			this.move(event.movementX, event.movementY, 0, false);

		this.text = this.svg.plain('');

		this.text.addClass('textTest');
		this.text.addClass('noselect');
		this.text.translate(5, this.svgSize.y - 8);
		this.text.font({
			family: 'Menlo',
			size: 10
		});
		this.text.opacity(0.3);
		this.move(0, 0, 0, false);
	}

	drawAngles() {
		this.text.text(
			`${this.currentAngles.rotation.toFixed(1)}° ${this.currentAngles.tilt.toFixed(
				1
			)} x${this.currentAngles.scale.toFixed(2)}`
		);
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

		this.currentAngles.scale *= 1 - scroll * 0.01;
		// this.currentAngles.scale += scroll * 0.005;
		if (this.currentAngles.scale < 0.2) this.currentAngles.scale = 0.2;
		else if (this.currentAngles.scale > 3) this.currentAngles.scale = 3;

		const heightNormalized = Math.cos((this.currentAngles.tilt * Math.PI) / 180);
		this.orbitCallback(
			fastRender,
			this.currentAngles.rotation,
			this.currentAngles.tilt,
			heightNormalized,
			this.currentAngles.scale
		);
		if (!fastRender) {
			this.saveOrbitData();
		}
		this.drawAngles();
	}
}

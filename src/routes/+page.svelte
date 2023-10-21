<script lang="ts">
	// import './style/style.css'
	import * as tools from '$lib/tools';
	import srcFloor from '../floors/floor-outlined.svg?raw';
	import orbit from '$lib/orbit';
	import type * as Types from '$lib/types';
	import * as parser from '$lib/parser';
	import { Layer } from '$lib/layers';
	import { SVG } from '@svgdotjs/svg.js';
	import { Entity, Surface, ShapeVariables } from '$lib/shapes';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	let contents: HTMLDivElement;

	const svg = SVG().size(1000, 800);
	const svgSize: Types.Point = {
		x: new Number(svg.width()).valueOf(),
		y: new Number(svg.height()).valueOf()
	};
	const stage = svg;

	onMount(() => {
		svg.addTo(contents);

		parser.parse(stage, svgSize, srcFloor);

		const entities: Entity[] = Layer.getAllEntities();
		const surfaces = entities.filter((e) => e instanceof Surface) as Surface[];

		function frame(
			fastRender: boolean,
			rotation: number,
			tilt: number,
			height: number,
			scale: number
		) {
			ShapeVariables.setScale(scale);
			for (const entity of entities) entity.reset();
			tools.transform(entities, rotation, tilt, scale);
			for (const entity of entities) entity.draw(fastRender, height);
			if (!fastRender) {
				const surfacesSorted = tools.sortSurfaces(surfaces, false);
				for (const surface of surfacesSorted) surface.draw(fastRender, height);
			}
		}

		new orbit(svg, frame);
	});
</script>

<h1 class="text-3xl font-bold underline">Hello world!</h1>

<div bind:this={contents} class="border-[1px] border-white w-[1000px] h-[800px]" />

<p class="text-white">
	Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
</p>
<p class="text-white"><a href="{base}/config">config</a></p>

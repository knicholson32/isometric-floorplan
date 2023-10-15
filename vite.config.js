import SVGHotReload from './src/plugins/svgHotReload';

/** @type {import('vite').UserConfig} */
export default {
  base: '/isometric-floorplan/',
  build: {
    sourcemap: true
  },
  plugins: [
    SVGHotReload()
  ]
}
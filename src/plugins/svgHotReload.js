

export default function SVGHotReload() {
  return {
    name: 'svg-hmr',
    enforce: 'post',
    // HMR
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.svg')) {
        console.log('reloading svg file: ', file);
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }
    },
  }
}
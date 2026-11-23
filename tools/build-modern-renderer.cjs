/* Produce a self-contained classic-script compatibility bundle for modern Three.
 * Never fetch a CDN at game runtime. This bundle is only used in r187 canary.
 */
const path=require('node:path');
const esbuild=require('esbuild');
esbuild.buildSync({
 entryPoints:[path.resolve(__dirname,'modern-three-entry.mjs')],
 bundle:true,platform:'browser',format:'iife',minify:true,target:['es2020'],
 outfile:path.resolve(__dirname,'../vendor/three.r187.compat.js'),
 legalComments:'none',logLevel:'info'
});
console.log('Built Three.js r187 browser compatibility canary.');

/* REDLINE renderer compatibility canary: Three.js r187, an ES-module build
 * presented to the legacy runtime as window.THREE.
 * The verified r128 baseline remains available separately until screenshots
 * and actual WebGL gameplay pass. See docs/RENDERER_R187_MIGRATION.md.
 */
import * as modern from 'three-modern';
const THREE = {...modern};
const noColor = modern.NoColorSpace;
THREE.sRGBEncoding = modern.SRGBColorSpace;
THREE.LinearEncoding = modern.NoColorSpace;
THREE.GammaEncoding = modern.SRGBColorSpace;
THREE.WebGLMultisampleRenderTarget = class extends modern.WebGLRenderTarget {
  constructor(w, h, opts={}) { super(w,h,{...opts,samples:4}); this.samples=4; }
};
if (modern.ShaderChunk && modern.ShaderChunk.colorspace_fragment) {
  modern.ShaderChunk.encodings_fragment = modern.ShaderChunk.colorspace_fragment;
}
function compatDescriptor(proto,name,newName) {
  const current=Object.getOwnPropertyDescriptor(proto,name);
  if(!current){
    Object.defineProperty(proto,name,{configurable:true,
      get(){return this[newName]},
      set(v){this[newName]=v===THREE.LinearEncoding?noColor:v}});
  }
}
compatDescriptor(modern.Texture.prototype,'encoding','colorSpace');
compatDescriptor(modern.WebGLRenderer.prototype,'outputEncoding','outputColorSpace');
window.THREE=THREE;
window.REDLINE_RENDERER_COMPAT=Object.freeze({revision:modern.REVISION,bridge:'r187-global-legacy-compat',multiSample:4});

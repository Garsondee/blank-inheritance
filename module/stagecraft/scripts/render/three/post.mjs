/**
 * Post-processing: bloom for the lanterns, then a vignette and a little grain, then the output transform. Skipped
 * altogether on the low tier. The composer owns two render targets, which are the largest thing in video memory.
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const film = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.022 }, uVig: { value: 0.42 }, uRes: { value: new THREE.Vector2(2560, 1440) } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAmount; uniform float uVig; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = smoothstep(0.95, 0.35, length(d * vec2(1.05, 1.0)));
      c.rgb *= mix(1.0 - uVig, 1.0, v);
      c.rgb += (hash(vUv * uRes) - 0.5) * uAmount;
      gl_FragColor = c;
    }`
};

export class Post {
  constructor(renderer, scene, camera, { width, height, samples }) {
    this.target = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, this.target);
    this.composer.setPixelRatio(1);
    this.composer.setSize(width, height);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.32, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    this.grain = new ShaderPass(film);
    this.grain.uniforms.uRes.value.set(width, height);
    this.composer.addPass(this.grain);
    this.composer.addPass(new OutputPass());
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width, height);
    this.grain.uniforms.uRes.value.set(width, height);
  }

  /** Calm mode: no grain shimmer and a steadier bloom. */
  setCalm(calm) {
    this.grain.uniforms.uAmount.value = calm ? 0 : 0.022;
  }

  render(t) {
    this.grain.uniforms.uTime.value = (Math.floor(t * 24) % 97) * 0.37;
    this.composer.render();
  }

  dispose() {
    this.composer.dispose?.();
    this.target.dispose();
    for (const pass of this.composer.passes) pass.dispose?.();
  }
}

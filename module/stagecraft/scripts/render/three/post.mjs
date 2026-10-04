/**
 * Post-processing: bloom for the lanterns, then a vignette, a little grain and the output transform in one pass. Skipped
 * altogether on the low tier. The composer owns two render targets, which are the largest thing in video memory.
 *
 * Made cheaper 2026-10-04 (chalk.md §11.4; measured in the real Foundry, 3840 x 1906, 7.2 ms of graphics card a frame): the grain
 * was a full-screen pass of its own (1.3 ms) and so was the output transform; they are one pass now. The bloom (2.1 ms) is
 * worked out at half the size in each direction: it is a soft glow round the lanterns, which looks the same from a quarter
 * of the pixels.
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

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
      // the output transform (what three's OutputPass did in a pass of its own, a full-screen read and write): linear to sRGB
      vec3 lo = c.rgb * 12.92;
      vec3 hi = 1.055 * pow(max(c.rgb, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
      c.rgb = mix(lo, hi, step(vec3(0.0031308), c.rgb));
      gl_FragColor = c;
    }`
};

const BLOOM_SCALE = 2;               // the bloom is worked out at this fraction of the size, each way
// how strong the glow round bright things is (Ingram, 2026-10-04: loved, but too strong: it was 0.32 strength, 0.55 radius, threshold 0.82)
export const BLOOM = Object.freeze({ strength: 0.17, radius: 0.45, threshold: 0.9 });

export class Post {
  constructor(renderer, scene, camera, { width, height, samples }) {
    this.target = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, this.target);
    this.composer.setPixelRatio(1);
    this.composer.setSize(width, height);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(Math.ceil(width / BLOOM_SCALE), Math.ceil(height / BLOOM_SCALE)), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    const bloomSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w, h) => bloomSize(Math.ceil(w / BLOOM_SCALE), Math.ceil(h / BLOOM_SCALE));      // the composer sets the pass to the full size
    this.composer.addPass(this.bloom);
    this.grain = new ShaderPass(film);
    this.grain.uniforms.uRes.value.set(width, height);
    this.composer.addPass(this.grain);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.bloom.resolution.set(Math.ceil(width / BLOOM_SCALE), Math.ceil(height / BLOOM_SCALE));
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

import * as THREE from "three";
import { findFxHost } from "./FxOverlay.host";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export type FxOverlayUniforms = {
  intensity: number;
  speed: number;
  particles: number;
};

/**
 * Transparent fullscreen layer inside the R3F shell (PiP moves that shell).
 * Shader paints overlay only — never samples / replaces the scene.
 */
export class FxOverlayPass {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private raf = 0;
  private running = false;
  private startMs = 0;
  private host: HTMLElement | null = null;
  private uniforms: FxOverlayUniforms = {
    intensity: 1,
    speed: 1,
    particles: 1,
  };

  constructor(fragmentShader: string) {
    const canvas = document.createElement("canvas");
    canvas.dataset.fxPass = "1";
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "pointer-events-none absolute inset-0 z-[5] h-full w-full";
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = true;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        iResolution: { value: new THREE.Vector3(1, 1, 1) },
        iTime: { value: 0 },
        uIntensity: { value: 1 },
        uSpeed: { value: 1 },
        uParticles: { value: 1 },
      },
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  /**
   * Mount under the R3F shell found from `screenRoot` and keep drawing.
   * Safe to call repeatedly (updates uniforms / host).
   */
  apply(screenRoot: HTMLElement, uniforms: FxOverlayUniforms) {
    const host = findFxHost(screenRoot);
    if (!host) return;

    this.uniforms = uniforms;
    if (this.host !== host || this.canvas.parentElement !== host) {
      this.canvas.remove();
      // Shell must be a positioning context (R3F outer usually is).
      const pos = getComputedStyle(host).position;
      if (pos === "static") host.style.position = "relative";
      host.appendChild(this.canvas);
      this.host = host;
    }

    if (!this.running) {
      this.running = true;
      this.startMs = performance.now();
      const tick = () => {
        if (!this.running) return;
        try {
          this.paint();
        } catch {
          /* keep loop */
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
  }

  clear() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.canvas.remove();
    this.host = null;
  }

  dispose() {
    this.clear();
    this.material.dispose();
    this.renderer.dispose();
  }

  private paint() {
    const host = this.host;
    if (!host) return;
    const w = host.clientWidth || host.offsetWidth;
    const h = host.clientHeight || host.offsetHeight;
    if (w < 2 || h < 2) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    const bw = this.renderer.domElement.width;
    const bh = this.renderer.domElement.height;
    this.material.uniforms.iResolution!.value.set(bw, bh, 1);
    this.material.uniforms.iTime!.value =
      (performance.now() - this.startMs) * 0.001;
    this.material.uniforms.uIntensity!.value = this.uniforms.intensity;
    this.material.uniforms.uSpeed!.value = this.uniforms.speed;
    this.material.uniforms.uParticles!.value = this.uniforms.particles;

    this.renderer.render(this.scene, this.camera);
  }
}

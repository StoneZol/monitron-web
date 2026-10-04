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
 *
 * Canvas + WebGL are created in the *host document* so Document PiP (other
 * window) does not orphan / kill the context.
 */
export class FxOverlayPass {
  private fragmentShader: string;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private material: THREE.ShaderMaterial | null = null;
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
    this.fragmentShader = fragmentShader;
  }

  /**
   * Mount under the R3F shell found from `screenRoot` and keep drawing.
   * Rebuilds GL when the host document changes (enter / leave Document PiP).
   */
  apply(screenRoot: HTMLElement, uniforms: FxOverlayUniforms) {
    const host = findFxHost(screenRoot);
    if (!host) return;

    this.uniforms = uniforms;

    const gl = this.renderer?.getContext() as WebGLRenderingContext | null;
    const needRebuild =
      !this.canvas ||
      !this.renderer ||
      !this.canvas.isConnected ||
      this.host !== host ||
      this.canvas.ownerDocument !== host.ownerDocument ||
      Boolean(gl?.isContextLost?.());

    if (needRebuild) {
      this.stopLoop();
      this.teardownGl();
      this.setupGl(host.ownerDocument);
      const view = host.ownerDocument.defaultView;
      const pos = (view ?? window).getComputedStyle(host).position;
      if (pos === "static") host.style.position = "relative";
      host.appendChild(this.canvas!);
      this.host = host;
    } else if (this.canvas.parentElement !== host) {
      host.appendChild(this.canvas);
      this.host = host;
    }

    if (!this.running) {
      this.startMs = performance.now();
      this.startLoop();
    }
  }

  clear() {
    this.stopLoop();
    this.teardownGl();
    this.host = null;
  }

  private startLoop() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      try {
        this.paint();
      } catch {
        /* keep loop — context may briefly blip on PiP move */
      }
      const v = this.host?.ownerDocument.defaultView ?? window;
      this.raf = v.requestAnimationFrame(tick);
    };
    const view = this.host?.ownerDocument.defaultView ?? window;
    this.raf = view.requestAnimationFrame(tick);
  }

  private stopLoop() {
    this.running = false;
    if (!this.raf) return;
    const v = this.host?.ownerDocument.defaultView ?? window;
    v.cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.clear();
  }

  private setupGl(doc: Document) {
    const canvas = doc.createElement("canvas");
    canvas.dataset.fxPass = "1";
    canvas.setAttribute("aria-hidden", "true");
    canvas.className =
      "pointer-events-none absolute inset-0 z-[5] h-full w-full";
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: this.fragmentShader,
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

  private teardownGl() {
    this.canvas?.remove();
    this.material?.dispose();
    this.renderer?.dispose();
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.material = null;
  }

  private paint() {
    const host = this.host;
    const renderer = this.renderer;
    const material = this.material;
    const scene = this.scene;
    const camera = this.camera;
    if (!host || !renderer || !material || !scene || !camera) return;

    const w = host.clientWidth || host.offsetWidth;
    const h = host.clientHeight || host.offsetHeight;
    if (w < 2 || h < 2) return;

    const dpr = Math.min(
      host.ownerDocument.defaultView?.devicePixelRatio ||
        window.devicePixelRatio ||
        1,
      1.5,
    );
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    if (this.canvas) {
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
    }

    const bw = renderer.domElement.width;
    const bh = renderer.domElement.height;
    material.uniforms.iResolution!.value.set(bw, bh, 1);
    material.uniforms.iTime!.value =
      (performance.now() - this.startMs) * 0.001;
    material.uniforms.uIntensity!.value = this.uniforms.intensity;
    material.uniforms.uSpeed!.value = this.uniforms.speed;
    material.uniforms.uParticles!.value = this.uniforms.particles;

    renderer.render(scene, camera);
  }
}

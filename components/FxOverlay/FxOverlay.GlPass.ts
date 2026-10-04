import * as THREE from "three";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export type FxGlPassUniforms = {
  intensity: number;
  speed: number;
  particles: number;
};

/**
 * Fullscreen WebGL pass that samples a scene canvas each frame.
 * Requires the source WebGL canvas to use preserveDrawingBuffer: true.
 */
export class FxGlPass {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private texture: THREE.CanvasTexture | null = null;
  private source: HTMLCanvasElement | null = null;
  private raf = 0;
  private running = false;
  private startMs = 0;
  private uniforms: FxGlPassUniforms = {
    intensity: 1,
    speed: 1,
    particles: 1,
  };

  constructor(fragmentShader: string) {
    const canvas = document.createElement("canvas");
    canvas.dataset.fxPass = "1";
    canvas.className = "pointer-events-none absolute inset-0 z-5 h-full w-full";
    canvas.setAttribute("aria-hidden", "true");
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.autoClear = true;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        iChannel0: { value: null },
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

  setUniforms(next: FxGlPassUniforms) {
    this.uniforms = next;
  }

  setFragmentShader(source: string) {
    this.material.fragmentShader = source;
    this.material.needsUpdate = true;
  }

  mount(parent: HTMLElement) {
    if (this.canvas.parentElement !== parent) {
      parent.appendChild(this.canvas);
    }
  }

  unmount() {
    this.stop();
    this.canvas.remove();
  }

  start(findSource: () => HTMLCanvasElement | null) {
    if (this.running) return;
    this.running = true;
    this.startMs = performance.now();

    const tick = () => {
      if (!this.running) return;
      const src = findSource();
      this.paint(src);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  dispose() {
    this.unmount();
    this.texture?.dispose();
    this.texture = null;
    this.material.dispose();
    this.renderer.dispose();
  }

  private paint(source: HTMLCanvasElement | null) {
    if (!source || source.width < 2 || source.height < 2) {
      this.canvas.style.visibility = "hidden";
      return;
    }
    this.canvas.style.visibility = "visible";

    const w = source.clientWidth || source.width;
    const h = source.clientHeight || source.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";

    if (this.source !== source || !this.texture) {
      this.texture?.dispose();
      this.texture = new THREE.CanvasTexture(source);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;
      this.texture.generateMipmaps = false;
      this.texture.flipY = true;
      this.material.uniforms.iChannel0!.value = this.texture;
      this.source = source;
    } else {
      this.texture.needsUpdate = true;
    }

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

/** Largest non-pass canvas under root (scene). */
export function findSceneCanvas(root: HTMLElement): HTMLCanvasElement | null {
  let best: HTMLCanvasElement | null = null;
  let bestArea = 0;
  for (const c of root.querySelectorAll<HTMLCanvasElement>("canvas")) {
    if (c.dataset.fxPass != null) continue;
    const area = (c.clientWidth || c.width) * (c.clientHeight || c.height);
    if (area > bestArea) {
      best = c;
      bestArea = area;
    }
  }
  return best;
}

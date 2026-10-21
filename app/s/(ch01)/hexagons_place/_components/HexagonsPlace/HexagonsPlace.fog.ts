import * as THREE from "three";

export const FOG_NEUTRAL = 0x4b4b4b;

/**
 * Pure height fog from the hex grid plane.
 * Hex peaks above the fog layer stay clear — mountains through mist.
 *
 * Live uniforms (Three Fog uploads these every frame):
 *   fogNear → density 0..1
 *   fogFar  → fog ceiling in world Y (already scaled with field zoom)
 */
export function injectGroundFogShader() {
  THREE.ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vWorldPosition;
#endif
`;

  THREE.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
`;

  THREE.ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vWorldPosition;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif
`;

  // No camera-depth fog — only world-Y vs fog ceiling
  THREE.ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
	float fogDensity = clamp( fogNear, 0.0, 1.0 );
	float fogCeil = max( fogFar, 0.05 );
	// 1 at ground, 0 at/above fog ceiling — tops poke through
	float heightFactor = 1.0 - smoothstep( 0.0, fogCeil, vWorldPosition.y );
	float fogFactor = fogDensity * heightFactor;
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, clamp( fogFactor, 0.0, 1.0 ) );
#endif
`;
}

injectGroundFogShader();

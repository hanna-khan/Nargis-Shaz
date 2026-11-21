"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const vertex = /* glsl */ `
uniform float uTime; uniform vec2 uPointer;
varying vec3 vNormal; varying float vHeight; varying vec2 vUv;
float h(vec2 q){
  float d = length(q - uPointer);
  return .20*sin(q.x*1.9+q.y*1.2+uTime*.42) + .13*sin(q.x*3.4-q.y*2.1-uTime*.33)
       + .035*sin(q.y*5.0+q.x*1.6+uTime*.55) + .12*sin(d*3.6-uTime*.7)*exp(-d*1.1);
}
void main(){
  vec2 q = position.xy; float e = .012; float z = h(q);
  vNormal = normalize(vec3(-(h(q+vec2(e,0.))-z)/e, -(h(q+vec2(0.,e))-z)/e, 1.0));
  vHeight = z; vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, z*.6, 1.0);
}`;

const fragment = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime;
varying vec3 vNormal; varying float vHeight; varying vec2 vUv;
float rnd(vec2 s){ return fract(sin(dot(s, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec3 n = normalize(vNormal); vec3 L = normalize(vec3(-.45,.55,.7)); vec3 V = vec3(0.,0.,1.);
  float diff = clamp(dot(n,L)*.5+.5, 0., 1.);
  float spec = pow(max(dot(reflect(-L,n),V),0.), 9.);
  float sheen = pow(1.-abs(dot(n,V)), 2.2)*.35;
  vec3 col = mix(uA, uB, smoothstep(.15,.85,diff));
  col = mix(col, uC, spec*.38 + sheen*.35);
  col *= .88 + .2*smoothstep(-.4,.5,vHeight);
  col *= 1. - .28*length(vUv-.5);
  col += (rnd(gl_FragCoord.xy + uTime) - .5)*.026;
  gl_FragColor = vec4(col, 1.);
}`;

export type SilkPalette = [string, string, string];

function Cloth({ palette }: { palette: SilkPalette }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport, pointer } = useThree();
  const target = useRef(new THREE.Vector2());
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() },
    uA: { value: new THREE.Color(palette[0]) }, uB: { value: new THREE.Color(palette[1]) }, uC: { value: new THREE.Color(palette[2]) },
  }), [palette]);
  useFrame((state, dt) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value += Math.min(dt, 0.05);
    target.current.set((pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2);
    mat.current.uniforms.uPointer.value.lerp(target.current, 0.04);
  });
  return (
    <mesh scale={[viewport.width * 1.08, viewport.height * 1.08, 1]}>
      <planeGeometry args={[1, 1, 110, 110]} />
      <shaderMaterial ref={mat} vertexShader={vertex.replace("vec2 q = position.xy;", "vec2 q = position.xy * vec2(3.2, 2.0);")} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}

/** The one 3D moment: a slow, pointer-responsive silk surface. Decorative only (aria-hidden). */
export default function SilkSurface({ palette }: { palette: SilkPalette }) {
  return (
    <Canvas
      aria-hidden
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "low-power", alpha: false }}
      camera={{ position: [0, 0, 2], fov: 50 }}
      frameloop="always"
      onCreated={({ gl }) => gl.setClearColor(palette[1])}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <Cloth palette={palette} />
    </Canvas>
  );
}

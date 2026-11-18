import {
  BufferGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Scene,
  Color,
  Vector2,
} from "./vendor/three.js";

// 色片有扭轉的曲面與脊線，選色使用同一張可見網格進行射線測試。
export function pleatedSector(start, end, folds) {
  const positions = [],
    indices = [];
  const radial = 12,
    angular = folds * 8;
  for (let j = 0; j <= angular; j++) {
    const t = j / angular,
      angle = start + (end - start) * t;
    const ridge = 0.5 - 0.5 * Math.cos(t * folds * 2 * Math.PI);
    for (let i = 0; i <= radial; i++) {
      const u = i / radial;
      const a = angle + 0.28 * Math.sin(u * 1.45) - 0.1 * u * u;
      const r =
        1.05 +
        1.09 * u +
        0.09 * Math.sin(3 * angle + 0.4) * u * u +
        0.1 * ridge * u;
      const z =
        0.31 * Math.sin(u * Math.PI) +
        0.27 * ridge * (0.45 + u) +
        0.23 * Math.sin(2 * angle + 0.5) * u;
      positions.push(r * Math.cos(a), r * Math.sin(a), z);
      if (j < angular && i < radial) {
        const n = j * (radial + 1) + i;
        indices.push(
          n,
          n + 1,
          n + radial + 2,
          n,
          n + radial + 2,
          n + radial + 1,
        );
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// 滿版背景與色輪共用同一個 WebGLRenderer。背景的細線沿流動曲面展開。
export function fabric() {
  const scene = new Scene();
  const tint = new Color("#9869A1").convertLinearToSRGB(),
    target = tint.clone();
  const uniforms = {
    time: { value: 0 },
    aspect: { value: 1 },
    scroll: { value: 0 },
    pulse: { value: 0 },
    tint: { value: tint },
    pointer: { value: new Vector2() },
  };
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms,
    vertexShader:
      "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `
    varying vec2 vUv;
    uniform float time,aspect,scroll,pulse;
    uniform vec3 tint;
    uniform vec2 pointer;
    void main(){
      vec2 uv=vUv;
      vec2 p=vec2((uv.x-.5)*aspect,uv.y-.5);
      float t=time*.23;
      p+=pointer*.027;
      p.y+=scroll*.13;
      vec3 deep=vec3(.065,.059,.095);
      vec3 col=mix(deep,vec3(.134,.107,.175),uv.y*.6+uv.x*.18);
      for(int i=0;i<3;i++){
        float f=float(i);
        float flow=p.y+.21*sin(p.x*2.85+t+f*.65)+.115*sin(p.x*5.1-t*.63+f*.77);
        float center=-.24+f*.25+.09*cos(p.x*2.1+t*.82+f);
        float d=flow-center;
        float edge=exp(-abs(d)*14.);
        float cloth=exp(-abs(d+.09)*6.8)*smoothstep(.13,-.12,d);
        float thread=.5+.5*cos(d*310.+sin(p.x*4.+t)*2.);
        vec3 hue=mix(tint,vec3(.41,.45,.64),.17+f*.19);
        col+=hue*(edge*.11+cloth*(.075+.042*thread));
      }
      float dist=length(vec2((uv.x-.71)*aspect,uv.y-.49));
      col+=tint*.115*exp(-dist*2.2);
      col+=tint*.065*pulse*exp(-abs(dist-(1.-pulse)*1.3)*22.);
      col*=.84+.16*smoothstep(0.,.65,uv.x);
      gl_FragColor=vec4(col,1.);
    }`.replace("smoothstep(.13,-.12,d)", "(1.-smoothstep(-.12,.13,d))"),
  });
  const plane = new Mesh(new PlaneGeometry(2, 2), material);
  plane.frustumCulled = false;
  scene.add(plane);
  return {
    scene,
    setColor(hex) {
      target.set(hex).convertLinearToSRGB();
    },
    frame(time, aspect, scroll, pulse, x, y, still) {
      tint.lerp(target, still ? 1 : 0.09);
      uniforms.time.value = time;
      uniforms.aspect.value = aspect;
      uniforms.scroll.value = scroll;
      uniforms.pulse.value = pulse;
      uniforms.pointer.value.set(x, y);
    },
    dispose() {
      material.dispose();
      plane.geometry.dispose();
    },
  };
}

// 色相、明暗與摺面從同一組可重現的幾何參數生成。
import {
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Scene,
} from "./vendor/three.js";

// 每個色相是一道徑向摺痕。迎光平面保留來源色，背光面描述紙的深度。
export function foldedSector(hex, span) {
  const ink = new Color(hex);
  const stock = new Color("#C5C6CE");
  const vertices = [],
    colors = [];
  const steps = 16;
  function point(t, u) {
    const crease = u < 0.62 ? u / 0.62 : (1 - u) / 0.38;
    const radius = 0.68 + 1.52 * t + 0.17 * t * t * crease;
    const angle = 0.86 * t - 0.19 * Math.sin(Math.PI * t) + span * (u - 0.5);
    const height =
      0.52 * Math.sin(Math.PI * t) + (0.075 + 0.32 * t) * crease - 0.12 * t * t;
    return [radius * Math.cos(angle), radius * Math.sin(angle), height];
  }
  function quad(a, b, c, d, tint) {
    for (const v of [a, b, d, b, c, d]) {
      vertices.push(...v);
      colors.push(tint.r, tint.g, tint.b);
    }
  }
  for (let i = 0; i < steps; i++) {
    const t = i / steps,
      next = (i + 1) / steps;
    for (const [left, right, brightness] of [
      [0, 0.62, 1],
      [0.62, 0.67, 1.12],
      [0.67, 1, 0.55],
    ]) {
      const tint = ink.clone().multiplyScalar(brightness * (0.78 + 0.22 * t));
      if (left === 0.62) tint.lerp(stock, 0.12);
      quad(
        point(t, left),
        point(next, left),
        point(next, right),
        point(t, right),
        tint,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

// 以取樣紙面為背景，唯有裝置附近投下柔邊陰影。
export function fabric() {
  const scene = new Scene();
  const uniforms = {
    base: { value: new Color() },
    center: { value: [0.67, 0.49] },
    extent: { value: [0.3, 0.3] },
    time: { value: 0 },
  };
  const material = new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms,
    vertexShader:
      "varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `varying vec2 uv0;uniform vec3 base;uniform vec2 center,extent;uniform float time;
 void main(){vec2 p=(uv0-center)/extent; p.x+=p.y*.19;
 float soft=exp(-dot(p,p)*2.5); float contact=exp(-dot(p,p)*9.);
 float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(.1273,17.143)))*4375.35)-.5;
 vec3 col=base*(1.-.22*soft-.105*contact);
 // 版畫般的等距線在色環下方顯出波前，遠離圖版後逐漸淡去。
 vec2 centerOfOrbit = center + extent*vec2(-.09,.32);
 vec2 q=(uv0-centerOfOrbit)/extent;
 float r=length(q*vec2(1.,.84));
 float wave=r*34.+.65*sin(atan(q.y,q.x)*3.+time*.24);
 float line=(.5+.5*cos(wave*6.28318));
 float veil=smoothstep(.35,1.20,r)*(1.-smoothstep(1.24,1.65,r));
 float light=dot(base,vec3(.2126,.7152,.0722));
 col+=mix(.12,-.12,smoothstep(.15,.7,light))*pow(line,5.)*veil;
 col+=.009*(uv0.y-.4)+grain*.013;
 gl_FragColor=vec4(clamp(col,0.,.996),1.);}`,
  });
  const g = new PlaneGeometry(2, 2),
    plane = new Mesh(g, material);
  plane.frustumCulled = false;
  scene.add(plane);
  return {
    scene,
    setColor(background) {
      uniforms.base.value.set(background || "#ECECEE").convertLinearToSRGB();
    },
    frame(t, view, w, h) {
      uniforms.time.value = t;
      uniforms.center.value = [
        (view.x + view.w * 0.54) / w,
        (view.y + view.h * 0.38) / h,
      ];
      uniforms.extent.value = [(view.w * 0.43) / w, (view.h * 0.28) / h];
    },
    dispose() {
      g.dispose();
      material.dispose();
    },
  };
}

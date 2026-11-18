// 紙張沿圓心排開。每張有厚度、捲起的外緣與未上墨的紙邊。
import {
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Scene,
} from "./vendor/three.js";

export function paperLeaf(hex, width) {
  const ink = new Color(hex),
    stock = new Color("#DBDCE3"),
    edge = new Color("#ABAAB2");
  const points = [],
    colors = [],
    indices = [];
  function vertex(u, t, side) {
    const r = -0.22 + 2.7 * t;
    const bend = 0.045 * Math.sin(t * 2.65) + 0.02 * u * t;
    points.push(
      r,
      bend + u * width * (0.85 + 0.15 * t),
      0.035 +
        0.11 * t * t +
        0.014 * u * t +
        0.013 * Math.sin(t * Math.PI) +
        (side === 2 ? 0.002 : side ? -0.011 : 0),
    );
  }
  function quad(a, b, c, d, color) {
    const offset = points.length / 3;
    for (const v of [a, b, c, d]) {
      vertex(...v);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(
      offset,
      offset + 1,
      offset + 2,
      offset,
      offset + 2,
      offset + 3,
    );
  }
  // 紙片邊緣呈圓角，色紙外端保留一段標籤區。
  const sections = [
    0, 0.1, 0.25, 0.45, 0.62, 0.735, 0.825, 0.88, 0.968, 0.981, 1,
  ];
  function bound(t) {
    return t === 1 ? 0.86 : t === 0 ? 0.72 : 1;
  }
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i],
      b = sections[i + 1],
      wa = bound(a),
      wb = bound(b);
    const face =
      a >= 0.88
        ? stock
        : a >= 0.825
          ? ink.clone().lerp(stock, 0.36)
          : a >= 0.735
            ? ink.clone().lerp(stock, 0.15)
            : ink;
    quad([-wa, a, 0], [-wb, b, 0], [wb, b, 0], [wa, a, 0], face);
    quad([wa, a, 1], [wb, b, 1], [-wb, b, 1], [-wa, a, 1], edge);
    quad([-wa, a, 1], [-wb, b, 1], [-wb, b, 0], [-wa, a, 0], edge);
    quad([wa, a, 0], [wb, b, 0], [wb, b, 1], [wa, a, 1], edge);
  }
  quad([-0.86, 1, 0], [-0.86, 1, 1], [0.86, 1, 1], [0.86, 1, 0], stock);
  // 將末兩位色碼印在每個標籤露出的紙角。
  const glyphs = [
    "75557",
    "26227",
    "71747",
    "71717",
    "55711",
    "74717",
    "74757",
    "71111",
    "75757",
    "75717",
    "25755",
    "65656",
    "34443",
    "65556",
    "74647",
    "74644",
  ];
  const print = new Color("#3B3844");
  [...hex.slice(-2)].forEach((char, letter) => {
    const glyph = glyphs[parseInt(char, 16)];
    [...glyph].forEach((mask, row) => {
      for (let col = 0; col < 3; col++) {
        if (!(Number(mask) & (4 >> col))) continue;
        const u = 0.46 + (letter * 4 + col) * 0.047,
          t = 0.955 - row * 0.0065;
        quad(
          [u, t, 2],
          [u, t - 0.0065, 2],
          [u + 0.047, t - 0.0065, 2],
          [u + 0.047, t, 2],
          print,
        );
      }
    });
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(points, 3));
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
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
 col+=.010*(uv0.y-.4)+grain*.014+.004*sin(uv0.x*5.+time*.12);
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

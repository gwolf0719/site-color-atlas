import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  Group,
  Shape,
  ExtrudeGeometry,
  MeshBasicMaterial,
  Mesh,
  Raycaster,
  Vector2,
  RingGeometry,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from "./vendor/three.js";

const TAU = 2 * Math.PI;
function band(inner, outer, start, end, depth) {
  const shape = new Shape();
  shape.absarc(0, 0, outer, start, end, false);
  shape.absarc(0, 0, inner, end, start, true);
  shape.closePath();
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 30,
  });
}
export function createWheel(host, onChoose, onHover, onLoss) {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0, 0);
  host.append(renderer.domElement);
  const scene = new Scene(),
    camera = new OrthographicCamera(-3, 3, 3, -3, 0.1, 25);
  camera.position.z = 10;
  camera.updateProjectionMatrix();
  const rig = new Group(),
    wedges = new Group(),
    guides = new Group();
  scene.add(rig);
  rig.add(wedges, guides);
  const makeMaterial = (color) =>
    new MeshBasicMaterial({ color, side: DoubleSide });
  const guideMaterial = makeMaterial("#626075");
  for (const [r, width] of [
    [1.01, 0.009],
    [2.38, 0.012],
    [2.67, 0.006],
  ]) {
    const ring = new Mesh(new RingGeometry(r, r + width, 180), guideMaterial);
    ring.position.z = -0.14;
    guides.add(ring);
  }
  const marks = [];
  for (let i = 0; i < 72; i++) {
    const angle = (TAU * i) / 72,
      r = i % 6 === 0 ? 2.55 : 2.46;
    marks.push(r * Math.cos(angle), r * Math.sin(angle), -0.12);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(marks, 3));
  guides.add(
    new Points(
      geo,
      new PointsMaterial({
        color: "#A8A0BB",
        size: 0.029,
        sizeAttenuation: true,
      }),
    ),
  );
  const ray = new Raycaster(),
    cursor = new Vector2(),
    motion = matchMedia("(prefers-reduced-motion: reduce)");
  let active = null,
    options = [],
    intro = 0,
    pointerX = 0,
    pointerY = 0,
    visible = true,
    frame = 0;
  let running = false,
    last = 0,
    elapsed = 0;
  function clearWedges() {
    for (const mesh of [...wedges.children]) {
      wedges.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.forEach((m) => m.dispose());
    }
  }
  const ratioBand = new Group();
  rig.add(ratioBand);
  function update(values, picks) {
    for (const segment of [...ratioBand.children]) {
      ratioBand.remove(segment);
      segment.geometry.dispose();
      segment.material.dispose();
    }
    let startAngle = Math.PI / 2;
    for (const pick of picks) {
      const arc = (TAU * pick.percent) / 100;
      const segment = new Mesh(
        new RingGeometry(
          values.length ? 0.92 : 1.16,
          values.length ? 1.015 : 2.23,
          Math.max(4, Math.ceil((100 * arc) / TAU)),
          1,
          startAngle - arc,
          arc,
        ),
        makeMaterial(pick.hex),
      );
      segment.position.z = 0.16;
      ratioBand.add(segment);
      startAngle -= arc;
    }
    clearWedges();
    options = values;
    active = null;
    intro = motion.matches ? 1 : 0;
    for (const [i, item] of values.entries()) {
      const angle = TAU / values.length;
      const start = Math.PI / 2 - angle * (i + 1) + 0.009,
        end = Math.PI / 2 - angle * i - 0.009;
      const face = makeMaterial(item.hex),
        edge = makeMaterial(item.hex);
      edge.color.multiplyScalar(0.62);
      const mesh = new Mesh(band(1.16, 2.23, start, end, 0.15), [face, edge]);
      mesh.userData = { index: i, theta: (start + end) / 2, hover: 0 };
      wedges.add(mesh);
    }
    schedule();
  }
  function draw(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.06, (now - (last || now)) / 1000);
    last = now;
    elapsed += dt;
    intro = motion.matches ? 1 : Math.min(1, intro + 2.35 * dt);
    const smooth = 1 - (1 - intro) ** 3;
    rig.rotation.x = motion.matches
      ? 0
      : -0.19 + 0.04 * Math.sin(elapsed * 0.55) + pointerY * 0.055;
    rig.rotation.y = motion.matches
      ? 0
      : 0.12 * Math.sin(elapsed * 0.46) + pointerX * 0.075;
    wedges.rotation.z = motion.matches ? 0 : (1 - smooth) * 0.38;
    guides.rotation.z = motion.matches ? 0 : elapsed * 0.06;
    wedges.scale.setScalar(0.91 + 0.09 * smooth);
    for (const mesh of wedges.children) {
      const m = mesh.userData;
      const goal = m.index === active ? 1 : 0;
      m.hover = motion.matches
        ? goal
        : m.hover + (goal - m.hover) * Math.min(1, dt * 12);
      const offset = 0.095 * m.hover + 0.18 * (1 - smooth);
      mesh.position.set(
        Math.cos(m.theta) * offset,
        Math.sin(m.theta) * offset,
        0.12 * m.hover,
      );
    }
    renderer.render(scene, camera);
    if (!motion.matches && running) schedule();
  }
  function schedule() {
    if (!frame && visible && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function hit(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    cursor.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    ray.setFromCamera(cursor, camera);
    return (
      ray.intersectObjects(wedges.children, false)[0]?.object.userData.index ??
      null
    );
  }
  renderer.domElement.onpointermove = (e) => {
    active = hit(e);
    pointerX = cursor.x;
    pointerY = cursor.y;
    renderer.domElement.style.cursor = active === null ? "default" : "pointer";
    onHover(options[active] || null);
    schedule();
  };
  renderer.domElement.onpointerleave = () => {
    active = null;
    pointerX = pointerY = 0;
    onHover(null);
    schedule();
  };
  renderer.domElement.onclick = (e) => {
    const i = hit(e);
    if (i !== null && options[i]) onChoose(options[i].hex);
  };
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const half = 2.84,
      aspect = width / height;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    schedule();
  }
  const size = new ResizeObserver(resize);
  size.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      last = 0;
      schedule();
    }
  });
  observer.observe(host);
  const resume = () => {
    last = 0;
    schedule();
  };
  motion.addEventListener("change", resume);
  document.addEventListener("visibilitychange", resume);
  renderer.domElement.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      running = false;
      visible = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      size.disconnect();
      motion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
      clearWedges();
      renderer.dispose();
      renderer.domElement.remove();
      onLoss();
    },
    { once: true },
  );
  running = true;
  resize();
  return { update };
}

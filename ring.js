import { fabric, foldedSector } from "./chromatic-scene.js";
import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  Group,
  MeshBasicMaterial,
  Mesh,
  Raycaster,
  Vector2,
  RingGeometry,
  DoubleSide,
} from "./vendor/three.js";

const TAU = 2 * Math.PI;
export function createWheel(host, onChoose, onHover, onLoss, onRemove) {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0, 0);
  host.append(renderer.domElement);
  const orbit = document.getElementById("orbit"),
    stage = host.parentElement;
  const backdrop = fabric();
  renderer.autoClear = false;
  let canvasWidth = 1,
    canvasHeight = 1,
    view = { x: 0, y: 0, w: 1, h: 1 };
  let scrollProgress = 0;
  const scroll = () => {
    const rect = stage.getBoundingClientRect();
    scrollProgress = Math.min(1, Math.max(0, -rect.top / rect.height));
    schedule();
  };
  const scene = new Scene(),
    camera = new OrthographicCamera(-3, 3, 3, -3, 0.1, 25);
  camera.position.z = 10;
  camera.updateProjectionMatrix();
  const rig = new Group(),
    wedges = new Group();
  scene.add(rig);
  rig.add(wedges);
  const makeMaterial = (color) =>
    new MeshBasicMaterial({ color, side: DoubleSide });
  let spin = 0.28,
    velocity = 0,
    gesture = null,
    timer = 0,
    lastKey = "";
  function stopGesture() {
    clearTimeout(timer);
    gesture = null;
    onHover(null, false);
  }
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
      mesh.material.dispose();
    }
  }
  const ratioBand = new Group();
  rig.add(ratioBand);
  function update(values, picks, background) {
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
          values.length ? 0.43 : 0.65,
          values.length ? 0.52 : 2.23,
          Math.max(4, Math.ceil((100 * arc) / TAU)),
          1,
          startAngle - arc,
          arc,
        ),
        makeMaterial(pick.hex),
      );
      segment.position.z = 0.59;
      segment.userData.selected = pick.hex;
      ratioBand.add(segment);
      startAngle -= arc;
    }
    backdrop.setColor(background);
    const geometryKey = values.map((v) => v.hex).join("");
    if (geometryKey === lastKey) {
      schedule();
      return;
    }
    lastKey = geometryKey;
    clearWedges();
    options = values;
    active = null;
    intro = motion.matches ? 1 : 0;
    for (const [i, item] of values.entries()) {
      const span = TAU / values.length;
      const theta = -Math.PI / 2 + i * span;
      const material = new MeshBasicMaterial({
        vertexColors: true,
        side: DoubleSide,
        toneMapped: false,
      });
      const mesh = new Mesh(foldedSector(item.hex, span * 0.998), material);
      mesh.userData = { index: i, theta, hover: 0 };
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
    intro = motion.matches ? 1 : Math.min(1, intro + 0.91 * dt);

    if (!gesture && !motion.matches) {
      spin += velocity * dt;
      velocity *= Math.exp(-5 * dt);
    }
    rig.rotation.x =
      -0.46 +
      (motion.matches
        ? 0
        : 0.075 * Math.sin(elapsed * 0.47) +
          pointerY * 0.14 +
          scrollProgress * 0.17);
    rig.rotation.y =
      -0.19 +
      (motion.matches ? 0 : 0.05 * Math.sin(elapsed * 0.41) + pointerX * 0.16);
    wedges.rotation.z = spin + 0.1;
    for (const mesh of wedges.children) {
      const m = mesh.userData,
        ready = motion.matches
          ? 1
          : Math.max(
              0,
              Math.min(
                1,
                intro * 1.25 - (m.index / Math.max(1, options.length)) * 0.22,
              ),
            );
      const spring = 1 - (1 - ready) ** 3;
      m.hover +=
        ((m.index === active ? 1 : 0) - m.hover) *
        (motion.matches ? 1 : Math.min(1, dt * 13));
      const angle = m.theta - (1 - spring) * 1.9;
      const wave =
        motion.matches || gesture
          ? 0
          : 0.045 * Math.sin(m.theta * 2 - elapsed * 1.65);
      mesh.rotation.set(wave + 0.14 * (1 - spring), -wave, angle);
      const d = 0.23 * m.hover + 0.28 * (1 - spring);
      mesh.position.set(
        d * Math.cos(angle),
        d * Math.sin(angle),
        wave + 0.25 * m.hover + 0.6 * (1 - spring),
      );
      mesh.scale.setScalar(0.28 + 0.72 * spring);
    }
    backdrop.frame(
      motion.matches ? 0 : elapsed,
      view,
      canvasWidth,
      canvasHeight,
    );
    renderer.setViewport(0, 0, canvasWidth, canvasHeight);
    renderer.clear();
    renderer.render(backdrop.scene, camera);
    renderer.clearDepth();
    renderer.setViewport(view.x, view.y, view.w, view.h);
    if (!orbit.parentElement.hasAttribute("data-study"))
      renderer.render(scene, camera);
    if (!motion.matches && running && !orbit.parentElement.hasAttribute("data-study")) schedule();
  }
  function schedule() {
    if (!frame && visible && !document.hidden)
      frame = requestAnimationFrame(draw);
  }
  function hit(event) {
    const rect = orbit.getBoundingClientRect();
    cursor.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    ray.setFromCamera(cursor, camera);
    return ray.intersectObjects(
      [...wedges.children, ...ratioBand.children],
      false,
    )[0]?.object.userData;
  }
  orbit.onpointerdown = (e) => {
    if (e.button !== 0 || gesture) return;
    const target = hit(e),
      index = target?.index ?? null;
    gesture = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      spin,
      selected: target?.selected,
      index,
      drag: false,
      borrow: false,
      last: e.clientX,
      time: e.timeStamp,
    };
    velocity = 0;
    orbit.setPointerCapture(e.pointerId);
    if (index !== null)
      timer = setTimeout(() => {
        if (gesture && !gesture.drag) {
          gesture.borrow = true;
          active = index;
          onHover(options[index], true);
          schedule();
        }
      }, 340);
  };
  orbit.onpointermove = (e) => {
    if (gesture && e.pointerId === gesture.id) {
      const dx = e.clientX - gesture.x,
        dy = e.clientY - gesture.y;
      if (!gesture.drag && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        stopGesture();
        return;
      }
      if (!gesture.borrow && Math.abs(dx) > 7) {
        gesture.drag = true;
        clearTimeout(timer);
      }
      if (gesture.drag) {
        spin = gesture.spin + (dx / Math.max(1, view.w)) * TAU * 0.85;
        velocity = Math.max(
          -3,
          Math.min(
            3,
            ((((e.clientX - gesture.last) /
              Math.max(10, e.timeStamp - gesture.time)) *
              1000) /
              view.w) *
              TAU *
              0.85,
          ),
        );
        gesture.last = e.clientX;
        gesture.time = e.timeStamp;
        active = null;
        onHover(null, false);
      }
    } else {
      const target = hit(e);
      active = target?.index ?? null;
      pointerX = cursor.x;
      pointerY = cursor.y;
      orbit.style.cursor = target ? "pointer" : "grab";
      onHover(
        target?.selected ? { hex: target.selected } : options[active] || null,
        e.pointerType !== "touch" && e.buttons === 0,
      );
    }
    schedule();
  };
  orbit.onpointerup = (e) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const { index, selected, drag, borrow } = gesture;
    stopGesture();
    active = null;
    if (!drag && !borrow && selected) onRemove(selected);
    else if (!drag && !borrow && index !== null && options[index])
      onChoose(options[index].hex, { x: e.clientX, y: e.clientY });
    schedule();
  };
  orbit.onpointercancel = orbit.onlostpointercapture = () => {
    if (gesture) {
      stopGesture();
      active = null;
      schedule();
    }
  };
  orbit.onpointerleave = () => {
    if (!gesture) {
      active = null;
      pointerX = pointerY = 0;
      onHover(null, false);
      schedule();
    }
  };
  orbit.oncontextmenu = (e) => e.preventDefault();
  window.addEventListener("blur", stopGesture);
  function resize() {
    const whole = host.getBoundingClientRect(),
      square = orbit.getBoundingClientRect();
    if (!whole.width || !square.width) return;
    canvasWidth = whole.width;
    canvasHeight = whole.height;
    renderer.setSize(canvasWidth, canvasHeight, false);
    view = {
      x: square.left - whole.left,
      y: whole.bottom - square.bottom,
      w: square.width,
      h: square.height,
    };
    const half = 2.6,
      aspect = view.w / view.h;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
    schedule();
  }
  const size = new ResizeObserver(resize);
  size.observe(host);
  size.observe(orbit);
  window.addEventListener("scroll", scroll, { passive: true });
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
  const plateChanges = new MutationObserver(resume);
  plateChanges.observe(orbit.parentElement, {
    attributes: true,
    attributeFilter: ["data-study"],
  });
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
      plateChanges.disconnect();
      motion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("scroll", scroll);
      orbit.onclick = null;
      orbit.onpointermove = null;
      orbit.onpointerleave = null;
      stopGesture();
      window.removeEventListener("blur", stopGesture);
      orbit.onpointerdown =
        orbit.onpointerup =
        orbit.onpointercancel =
        orbit.onlostpointercapture =
        orbit.oncontextmenu =
          null;
      clearWedges();
      backdrop.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      onLoss();
    },
    { once: true },
  );
  running = true;
  resize();
  return {
    update,
    reset() {
      stopGesture();
      active = null;
      spin = 0.28;
      velocity = pointerX = pointerY = 0;
      intro = motion.matches ? 1 : 0;
      schedule();
    },
    setBackdrop(hex) {
      backdrop.setColor(hex);
      schedule();
    },
  };
}

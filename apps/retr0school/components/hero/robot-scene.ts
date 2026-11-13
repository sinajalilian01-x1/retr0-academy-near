import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  DodecahedronGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  Path,
  PointLight,
  Scene,
  Shape,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";

/**
 * Procedural low-poly CRT robot head (the Retr0 Academy mascot). No model files: a chamfered,
 * flat-shaded extruded body, a pixel-face CanvasTexture, and magenta/cyan rim lights.
 * Returns a dispose() function.
 */
export function mountRobot(canvas: HTMLCanvasElement, opts: { onReady: () => void; onClick: () => void }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.1, 9);

  // Deterministic jitter keyed by vertex position, so shared corners move together and faces stay closed.
  function lowPoly(geo: BufferGeometry, amount: number) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.getAttribute("position") as BufferAttribute;
    const seen = new Map<string, [number, number, number]>();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
      let d = seen.get(key);
      if (!d) {
        const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
        const r = (n: number) => ((Math.sin(h * n) * 10000) % 1) * amount;
        d = [r(1.1), r(2.3), r(3.7)];
        seen.set(key, d);
      }
      pos.setXYZ(i, x + d[0], y + d[1], z + d[2]);
    }
    g.computeVertexNormals();
    return g;
  }

  function chamferRect(w: number, h: number, c: number) {
    const s = new Shape();
    s.moveTo(-w / 2 + c, -h / 2);
    s.lineTo(w / 2 - c, -h / 2);
    s.lineTo(w / 2, -h / 2 + c);
    s.lineTo(w / 2, h / 2 - c);
    s.lineTo(w / 2 - c, h / 2);
    s.lineTo(-w / 2 + c, h / 2);
    s.lineTo(-w / 2, h / 2 - c);
    s.lineTo(-w / 2, -h / 2 + c);
    return s;
  }

  const shell = new MeshStandardMaterial({ color: 0x55507a, roughness: 0.55, metalness: 0.15, flatShading: true });
  const dark = new MeshStandardMaterial({ color: 0x2d2a45, roughness: 0.6, metalness: 0.1, flatShading: true });

  const head = new Group();
  scene.add(head);

  // Body
  const bodyGeo = new ExtrudeGeometry(chamferRect(3.6, 3.0, 0.55), { depth: 1.6, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.28, bevelSegments: 1, curveSegments: 1 });
  bodyGeo.translate(0, 0, -0.8);
  head.add(new Mesh(lowPoly(bodyGeo, 0.05), shell));

  // Bezel ring around the screen
  const ring = chamferRect(2.9, 2.35, 0.35);
  const hole = chamferRect(2.45, 1.95, 0.25);
  const hp = hole.getPoints();
  if (hp.length > 1 && hp[0].equals(hp[hp.length - 1])) hp.pop();
  ring.holes.push(new Path(hp.reverse()));
  const bezelGeo = new ExtrudeGeometry(ring, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 });
  bezelGeo.translate(0, 0, 1.02);
  head.add(new Mesh(lowPoly(bezelGeo, 0.02), dark));

  // Pixel face
  const W = 32, H = 26;
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = W;
  faceCanvas.height = H;
  const ctx = faceCanvas.getContext("2d")!;
  const tex = new CanvasTexture(faceCanvas);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.colorSpace = SRGBColorSpace;
  let lastFace = "";
  function drawFace(ex: number, ey: number, blink: boolean) {
    const key = `${ex},${ey},${blink}`;
    if (key === lastFace) return;
    lastFace = key;
    ctx.fillStyle = "#07120c";
    ctx.fillRect(0, 0, W, H);
    // scanlines
    ctx.fillStyle = "#0b1d13";
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = "#3dff6e";
    const eyeY = 7 + ey;
    if (blink) {
      ctx.fillRect(8 + ex, eyeY + 2, 5, 1);
      ctx.fillRect(19 + ex, eyeY + 2, 5, 1);
    } else {
      ctx.fillRect(8 + ex, eyeY, 5, 5);
      ctx.fillRect(19 + ex, eyeY, 5, 5);
      ctx.fillStyle = "#a8ffbf";
      ctx.fillRect(9 + ex, eyeY + 1, 1, 1);
      ctx.fillRect(20 + ex, eyeY + 1, 1, 1);
      ctx.fillStyle = "#3dff6e";
    }
    const mx = Math.round(ex / 2);
    ctx.fillRect(8 + mx, 16, 2, 2);
    ctx.fillRect(22 + mx, 16, 2, 2);
    ctx.fillRect(9 + mx, 18, 14, 2);
    tex.needsUpdate = true;
  }
  drawFace(0, 0, false);
  const screen = new Mesh(new PlaneGeometry(2.5, 2.0), new MeshBasicMaterial({ map: tex }));
  screen.position.z = 1.18;
  head.add(screen);

  // Antenna knobs
  const knobGeo = lowPoly(new IcosahedronGeometry(0.32, 0), 0.02);
  for (const x of [-0.95, 0.95]) {
    const k = new Mesh(knobGeo, shell);
    k.position.set(x, 1.98, 0);
    k.scale.set(1.15, 0.8, 1.15);
    head.add(k);
  }
  // Side ear panels with bolts
  const earGeo = new ExtrudeGeometry(chamferRect(1.3, 0.55, 0.12), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1 });
  earGeo.rotateZ(Math.PI / 2);
  earGeo.translate(0, 0, -0.45);
  const boltGeo = new DodecahedronGeometry(0.17, 0);
  for (const side of [-1, 1]) {
    const ear = new Mesh(lowPoly(earGeo.clone(), 0.02), dark);
    ear.position.set(side * 2.05, -0.05, 0.1);
    head.add(ear);
    for (const y of [0.28, -0.32]) {
      const b = new Mesh(boltGeo, dark);
      b.position.set(side * 2.38, y - 0.05, 0.25);
      head.add(b);
    }
  }

  // Lights: dim key, magenta rim (left), cyan rim (right), green screen spill
  scene.add(new AmbientLight(0x3a2f6a, 1.1));
  const key = new DirectionalLight(0xffffff, 0.9);
  key.position.set(1, 3, 6);
  scene.add(key);
  const magenta = new DirectionalLight(0xff3fd4, 3.2);
  magenta.position.set(-6, 1, 1.5);
  scene.add(magenta);
  const cyan = new DirectionalLight(0x3fd8ff, 3.0);
  cyan.position.set(6, 1, 1.5);
  scene.add(cyan);
  const spill = new PointLight(0x3dff6e, 0.8, 3);
  spill.position.set(0, 0, 1.6);
  head.add(spill);

  // Interaction
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  let lastMove = 0;
  function onPointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    target.y = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
    target.x = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
    lastMove = performance.now();
  }
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerdown", onPointer, { passive: true });
  canvas.addEventListener("click", opts.onClick);

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) loop();
  });
  io.observe(canvas);

  let raf = 0;
  let ready = false;
  let nextBlink = performance.now() + 2500;
  let blinkUntil = 0;
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(loop);
    const t = performance.now();
    const idle = t - lastMove > 3000;
    const tx = idle ? Math.sin(t / 1700) * 0.12 : target.x;
    const ty = idle ? Math.sin(t / 2300) * 0.35 : target.y;
    cur.x += (tx - cur.x) * 0.07;
    cur.y += (ty - cur.y) * 0.07;
    head.rotation.y = cur.y * 0.6;
    head.rotation.x = cur.x * 0.35;
    head.position.y = Math.sin(t / 900) * 0.06;
    if (t > nextBlink) {
      blinkUntil = t + 130;
      nextBlink = t + 2500 + Math.random() * 3500;
    }
    drawFace(Math.round(cur.y * 2), Math.round(cur.x * 2), t < blinkUntil);
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      opts.onReady();
    }
  }
  const onVis = () => loop();
  document.addEventListener("visibilitychange", onVis);
  loop();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("pointerdown", onPointer);
    canvas.removeEventListener("click", opts.onClick);
    document.removeEventListener("visibilitychange", onVis);
    scene.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
    });
    tex.dispose();
    renderer.dispose();
  };
}

import { useEffect, useRef } from "react";

export default function ScrollScene() {
  const canvasRef = useRef(null);
  const fluidRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fluidCanvas = fluidRef.current;
    if (!canvas || !fluidCanvas) return;

    /* ═══════════════════════════════════════════
       FLUID BACKGROUND (2D Canvas)
    ═══════════════════════════════════════════ */
    const fCtx = fluidCanvas.getContext("2d");
    let fW, fH;
    function resizeFluid() {
      fW = fluidCanvas.width = window.innerWidth;
      fH = fluidCanvas.height = window.innerHeight;
    }
    resizeFluid();

    const blobs = [];
    const blobCount = 6;
    const palette = [
      [88, 101, 242],
      [120, 80, 220],
      [60, 140, 255],
      [140, 60, 200],
      [50, 80, 180],
      [100, 50, 160],
    ];
    for (let i = 0; i < blobCount; i++) {
      blobs.push({
        x: Math.random() * fW,
        y: Math.random() * fH,
        r: 200 + Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: palette[i % palette.length],
        phase: Math.random() * Math.PI * 2,
      });
    }

    let scrollProgress = 0;

    function drawFluid(time) {
      fCtx.fillStyle = "#050507";
      fCtx.fillRect(0, 0, fW, fH);

      blobs.forEach((b, i) => {
        const t = time * 0.001;
        b.x += b.vx + Math.sin(t * 0.3 + b.phase) * 0.5;
        b.y += b.vy + Math.cos(t * 0.2 + b.phase) * 0.5;
        if (b.x < -b.r) b.x = fW + b.r;
        if (b.x > fW + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = fH + b.r;
        if (b.y > fH + b.r) b.y = -b.r;

        const pulseR = b.r + Math.sin(t * 0.5 + i) * 40;
        const opacity = 0.12 + scrollProgress * 0.08 + Math.sin(t * 0.4 + b.phase) * 0.03;
        const [cr, cg, cb] = b.color;
        const grad = fCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pulseR);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${opacity})`);
        grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${opacity * 0.4})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        fCtx.fillStyle = grad;
        fCtx.fillRect(0, 0, fW, fH);
      });
    }

    /* ═══════════════════════════════════════════
       THREE.JS SCENE
    ═══════════════════════════════════════════ */
    const THREE = window.THREE;
    if (!THREE) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    function getCamZ() {
      return window.innerWidth < 600 ? 14 : window.innerWidth < 900 ? 11 : 9;
    }
    camera.position.set(0, 0, getCamZ());

    scene.add(new THREE.AmbientLight(0x222244, 0.4));

    const front = new THREE.DirectionalLight(0xffffff, 1.4);
    front.position.set(2, 3, 5);
    scene.add(front);

    const rim = new THREE.DirectionalLight(0x5865f2, 1.0);
    rim.position.set(-4, -2, -3);
    scene.add(rim);

    const top = new THREE.PointLight(0x7788ff, 0.8, 20);
    top.position.set(0, 5, 3);
    scene.add(top);

    const bottom = new THREE.PointLight(0x5865f2, 0.4, 15);
    bottom.position.set(0, -4, 2);
    scene.add(bottom);

    const leftKick = new THREE.PointLight(0xaabbff, 0.7, 18);
    leftKick.position.set(-6, 2, 1);
    scene.add(leftKick);

    const rightKick = new THREE.PointLight(0xffeedd, 0.5, 18);
    rightKick.position.set(6, -1, 2);
    scene.add(rightKick);

    const backLight = new THREE.PointLight(0x6677ff, 0.6, 20);
    backLight.position.set(0, 0, -6);
    scene.add(backLight);

    const group = new THREE.Group();

    // ── V material (dissolves on scroll) ──
    const matV = new THREE.MeshPhysicalMaterial({
      color: 0xdddeff,
      metalness: 0.95,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.0,
      reflectivity: 1.0,
      transparent: true,
      opacity: 1.0,
    });
    const edgeMatV = new THREE.LineBasicMaterial({ color: 0x5865f2, transparent: true, opacity: 0.35 });
    const wireMatV = new THREE.MeshBasicMaterial({ color: 0x5865f2, wireframe: true, transparent: true, opacity: 0.0 });

    // ── M & P material (stays solid always) ──
    const matMP = new THREE.MeshPhysicalMaterial({
      color: 0xdddeff,
      metalness: 0.95,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.0,
      reflectivity: 1.0,
      transparent: true,
      opacity: 1.0,
    });
    const edgeMatMP = new THREE.LineBasicMaterial({ color: 0x5865f2, transparent: true, opacity: 0.25 });

    function makeLetterMesh(shape, depth, material, eMat, wMat) {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.04,
        bevelSegments: 3,
      });
      geo.center();
      const mesh = new THREE.Mesh(geo, material);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), eMat));
      if (wMat) mesh.add(new THREE.Mesh(geo, wMat));
      return mesh;
    }

    // ── Letter M ──
    const mShape = new THREE.Shape();
    mShape.moveTo(0, 0);
    mShape.lineTo(0, 2.4);
    mShape.lineTo(0.35, 2.4);
    mShape.lineTo(0.8, 1.2);
    mShape.lineTo(1.25, 2.4);
    mShape.lineTo(1.6, 2.4);
    mShape.lineTo(1.6, 0);
    mShape.lineTo(1.25, 0);
    mShape.lineTo(1.25, 1.7);
    mShape.lineTo(0.8, 0.6);
    mShape.lineTo(0.35, 1.7);
    mShape.lineTo(0.35, 0);
    mShape.lineTo(0, 0);

    const mMesh = makeLetterMesh(mShape, 0.5, matMP, edgeMatMP, null);
    mMesh.position.x = -2.6;
    group.add(mMesh);

    // ── Letter V (center, dissolves) ──
    const vShape = new THREE.Shape();
    vShape.moveTo(0, 2.8);
    vShape.lineTo(0.45, 2.8);
    vShape.lineTo(1.0, 0.5);
    vShape.lineTo(1.55, 2.8);
    vShape.lineTo(2.0, 2.8);
    vShape.lineTo(1.2, 0);
    vShape.lineTo(0.8, 0);
    vShape.lineTo(0, 2.8);

    const vMesh = makeLetterMesh(vShape, 0.6, matV, edgeMatV, wireMatV);
    vMesh.position.x = 0;
    group.add(vMesh);

    // ── Letter P ──
    const pShape = new THREE.Shape();
    pShape.moveTo(0, 0);
    pShape.lineTo(0, 2.4);
    pShape.lineTo(0.9, 2.4);
    pShape.quadraticCurveTo(1.5, 2.4, 1.5, 1.85);
    pShape.quadraticCurveTo(1.5, 1.2, 0.9, 1.2);
    pShape.lineTo(0.35, 1.2);
    pShape.lineTo(0.35, 0);
    pShape.lineTo(0, 0);
    const pHole = new THREE.Path();
    pHole.moveTo(0.35, 1.5);
    pHole.lineTo(0.8, 1.5);
    pHole.quadraticCurveTo(1.12, 1.5, 1.12, 1.85);
    pHole.quadraticCurveTo(1.12, 2.1, 0.8, 2.1);
    pHole.lineTo(0.35, 2.1);
    pHole.lineTo(0.35, 1.5);
    pShape.holes.push(pHole);

    const pMesh = makeLetterMesh(pShape, 0.5, matMP, edgeMatMP, null);
    pMesh.position.x = 2.6;
    group.add(pMesh);

    /* ── Glassmorphic panels ──
    const glassConfigs = [
      { w: 3.2, h: 1.8, pos: [0, -0.2, -1.5], rot: [0, 0.15, 0], color: 0x8899ff, op: 0.15 },
      { w: 2.4, h: 1.2, pos: [1.8, 0.8, -2.5], rot: [0, -0.3, 0.05], color: 0xaabbff, op: 0.1 },
      { w: 1.6, h: 2.0, pos: [-2.0, 0.5, -2.0], rot: [-0.1, 0.4, 0], color: 0x9977ff, op: 0.12 },
    ];
    const glassPanels = glassConfigs.map((cfg) => {
      const geo = new THREE.PlaneGeometry(cfg.w, cfg.h, 1, 1);
      const mat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        metalness: 0.0,
        roughness: 0.1,
        transmission: 0.85,
        thickness: 0.3,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: cfg.op,
        envMapIntensity: 1.5,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.rotation.set(...cfg.rot);
      mesh.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.25 })
        )
      );
      mesh.userData.baseY = cfg.pos[1];
      mesh.userData.baseRotY = cfg.rot[1];
      group.add(mesh);
      return mesh;
    });*/

    // ── Particles layer 1 ──
    const pCount = 500;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 18;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    group.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x5865f2, size: 0.03, transparent: true, opacity: 0.5 })));

    // ── Particles layer 2 ──
    const p2Count = 350;
    const p2Geo = new THREE.BufferGeometry();
    const p2Pos = new Float32Array(p2Count * 3);
    for (let i = 0; i < p2Count; i++) {
      p2Pos[i * 3] = (Math.random() - 0.5) * 22;
      p2Pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      p2Pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    p2Geo.setAttribute("position", new THREE.BufferAttribute(p2Pos, 3));
    group.add(new THREE.Points(p2Geo, new THREE.PointsMaterial({ color: 0x8899ff, size: 0.015, transparent: true, opacity: 0.25 })));

    // ── Diamonds ──
    function createDiamondGeo() {
      const geo = new THREE.BufferGeometry();
      const v = new Float32Array([
        0, 1.6, 0,
        0.5, 0.4, 0.5, 0.5, 0.4, -0.5, -0.5, 0.4, -0.5, -0.5, 0.4, 0.5,
        0.7, 0, 0.7, 0.7, 0, -0.7, -0.7, 0, -0.7, -0.7, 0, 0.7,
        0, -2.2, 0,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(v, 3));
      geo.setIndex([0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,5,6, 1,6,2, 2,6,7, 2,7,3, 3,7,8, 3,8,4, 4,8,5, 4,5,1, 9,6,5, 9,7,6, 9,8,7, 9,5,8]);
      geo.computeVertexNormals();
      return geo;
    }
    const dGeo = createDiamondGeo();
    const dMat = new THREE.MeshPhysicalMaterial({
      color: 0x7788ff,
      metalness: 0.3,
      roughness: 0.05,
      transmission: 0.5,
      thickness: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.7,
      envMapIntensity: 2.0,
    });
    const diamonds = [];
    for (let i = 0; i < 12; i++) {
      const s = 0.1 + Math.random() * 0.25;
      const d = new THREE.Mesh(dGeo, dMat);
      d.scale.set(s, s * 1.3, s);
      const angle = (i / 12) * Math.PI * 2;
      const r = 5 + Math.random() * 4;
      d.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 4, Math.sin(angle) * r);
      d.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      d.userData = { speed: 0.2 + Math.random() * 0.5, offset: Math.random() * Math.PI * 2 };
      group.add(d);
      diamonds.push(d);
    }

    scene.add(group);

    // ─── INTERACTION STATE ───
    let smoothScroll = 0;
    let targetScroll = 0;
    let mx = 0, my = 0;

    function onScroll() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll = total > 0 ? window.scrollY / total : 0;
      scrollProgress = targetScroll;
    }

    function onMouse(e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function onDeviceOrientation(e) {
      if (e.gamma !== null) mx = (e.gamma / 45) * 0.5;
      if (e.beta !== null) my = ((e.beta - 45) / 45) * 0.3;
    }

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      camera.position.z = getCamZ();
      renderer.setSize(window.innerWidth, window.innerHeight);
      resizeFluid();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    window.addEventListener("resize", onResize);
    if ("ontouchstart" in window && window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
    }

    // ─── ANIMATION LOOP ───
    const clock = new THREE.Clock();
    let animId;

    function animate(time) {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      drawFluid(time || 0);
      smoothScroll += (targetScroll - smoothScroll) * 0.05;

      // Scroll-driven rotation
      group.rotation.y = smoothScroll * Math.PI * 2 + t * 0.12;
      group.rotation.x = Math.sin(smoothScroll * Math.PI) * 0.25 + Math.sin(t * 0.3) * 0.08;
      group.rotation.z = Math.sin(t * 0.2) * 0.04;

      // Mouse parallax
      camera.position.x += (mx * 0.6 - camera.position.x) * 0.03;
      camera.position.y += (-my * 0.4 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Breathing
      const sc = 1 + Math.sin(t * 0.6) * 0.015;
      group.scale.set(sc, sc, sc);

      // Rim color shift
      rim.color.setHSL(0.63 + smoothScroll * 0.12, 0.7, 0.5);

      // ── ARMOR DISSOLVE — only V ──
      const ap = Math.min(1, smoothScroll * 3);
      matV.opacity = 1.0 - ap * 0.85;
      matV.metalness = 0.95 - ap * 0.7;
      matV.roughness = 0.04 + ap * 0.6;
      matV.clearcoat = 1.0 - ap * 0.9;
      wireMatV.opacity = ap * 0.6;
      edgeMatV.opacity = 0.35 + ap * 0.55;
      const cVal = 0.87 - ap * 0.5;
      matV.color.setRGB(cVal, cVal, 1.0 - ap * 0.05);
      matV.emissive = matV.emissive || new THREE.Color();
      matV.emissive.setRGB(ap * 0.15, ap * 0.1, ap * 0.4);
      matV.emissiveIntensity = ap * 1.5;

      // M & P stay solid — subtle glow pulse
      const mpGlow = Math.sin(t * 0.8) * 0.03;
      matMP.emissive = matMP.emissive || new THREE.Color();
      matMP.emissive.setRGB(0.02 + mpGlow, 0.01 + mpGlow, 0.06 + mpGlow * 2);
      matMP.emissiveIntensity = 0.5;

      /* Glass panels float gently
      glassPanels.forEach((p, i) => {
        p.position.y = p.userData.baseY + Math.sin(t * (0.3 + i * 0.1) + i * 2) * 0.15;
        p.rotation.y = p.userData.baseRotY + Math.sin(t * (0.2 + i * 0.05) + i) * 0.05;
      });
      // Glass gets more visible on scroll
      glassPanels[0].material.opacity = 0.15 + smoothScroll * 0.15;*/

      // Diamonds float
      diamonds.forEach((d) => {
        d.rotation.y += 0.005 * d.userData.speed;
        d.rotation.x += 0.003 * d.userData.speed;
        d.position.y += Math.sin(t * d.userData.speed + d.userData.offset) * 0.002;
      });

      // Particle drift
      const pp = pGeo.attributes.position.array;
      for (let i = 0; i < pCount; i++) {
        pp[i * 3 + 1] += Math.sin(t * 0.5 + i * 0.3) * 0.0008;
      }
      pGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }
    animate(0);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("deviceorientation", onDeviceOrientation);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ background: "#050507", minHeight: "600vh", position: "relative" }}>
      <canvas
        ref={fluidRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}
      />
      <div style={{ position: "relative", zIndex: 2, pointerEvents: "none" }}>
        <div style={{ height: "100vh" }} />
        <div style={{ height: "100vh" }} />
        <div style={{ height: "100vh" }} />
        <div style={{ height: "100vh" }} />
        <div style={{ height: "100vh" }} />
        <div style={{ height: "100vh" }} />
      </div>
    </div>
  );
}

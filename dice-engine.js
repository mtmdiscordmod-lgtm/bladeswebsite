/* ════════════════════════════════════════
   DICE ENGINE — Three.js + Cannon-ES
   Side-view platformer-style dice tray
   Dice fall from top, bounce off walls, spin & tumble
   ════════════════════════════════════════ */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ── Constants ────────────────────────────
const MAX_DICE = 10;
const DIE_SIZE = 1.0;
const HALF = DIE_SIZE / 2;
const SETTLE_SPEED = 0.12;
const SETTLE_ANG = 0.12;
const SETTLE_FRAMES = 30;    // Must be still for 30 frames (~0.5s) before settling
const CHANNEL_DEPTH = 2.5;   // Front-to-back channel (Z = ±1.25)

// Face normals for a standard d6 (opposite faces sum to 7)
const FACE_NORMALS = [
  { face: 2, normal: new CANNON.Vec3( 1,  0,  0) },
  { face: 5, normal: new CANNON.Vec3(-1,  0,  0) },
  { face: 1, normal: new CANNON.Vec3( 0,  1,  0) },
  { face: 6, normal: new CANNON.Vec3( 0, -1,  0) },
  { face: 3, normal: new CANNON.Vec3( 0,  0,  1) },
  { face: 4, normal: new CANNON.Vec3( 0,  0, -1) },
];

// Pip positions on a 3x3 grid (0-8, row-major)
const PIP_PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const DEFAULT_SKIN = {
  diceColor: '#e8e0d0',
  pipColor: '#222222',
  material: 'matte',
};

// ── Dice Engine Module ───────────────────
const DiceEngine = (function () {
  let scene, camera, renderer, world;
  let dice = [];
  let selectedDice = [];
  let animFrame = null;
  let container, diceArea;
  let ambientLight, dirLight;
  let lightingIntensity = 1.0;
  let groundMesh; // Three.js shadow receiver
  let bumperMaterial;
  const propellerSpeed = 1.5; // rad/s

  // ── Obstacle system ──
  let obstacles = []; // { type, body, mesh, origin, direction, phase, dragging }
  let dragObstacle = null;
  let isDraggingObstacle = false;
  let obstDragOffset = new THREE.Vector3();
  let obstLastDragPos = new THREE.Vector3();
  let obstDragVelocity = new THREE.Vector3();
  let longPressTimer = null;
  let longPressScreenPos = null;
  const LONG_PRESS_MS = 2000;
  const FLING_REMOVE_SPEED = 10;

  // World bounds (computed from container)
  let boundsMinX = -5, boundsMaxX = 5;
  let boundsMinY = -10, boundsMaxY = 10;
  let floorY = -10;

  let settings = {
    friction: 0.4,
    restitution: 0.45,
    density: 1.0,
    linearDamping: 0.15,
    angularDamping: 0.1,
  };

  let skin = Object.assign({}, DEFAULT_SKIN);

  // Mouse/ray state — viewPlane is Z=0 (the front-facing plane)
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let viewPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let dragTarget = new THREE.Vector3();
  let isDragging = false;
  let dragDie = null;
  let dragOffset = new THREE.Vector3();
  let lastDragPos = new THREE.Vector3();
  let dragVelocity = new THREE.Vector3();

  let isSelecting = false;
  let selStart = { x: 0, y: 0 };
  let selBox = null;

  let groundMaterial, diceMaterial, contactMaterial;
  let groundBody;

  function init() {
    diceArea = document.getElementById('dice-area');
    container = document.getElementById('dice-container');
    if (!container || !diceArea) return;

    const rect = diceArea.getBoundingClientRect();
    const aspect = rect.width / rect.height;

    // ── Scene ──
    scene = new THREE.Scene();

    // ── Camera: SIDE VIEW — looking along -Z at the XY plane ──
    // Dice fall down (Y axis), bounce left/right (X axis)
    camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
    camera.position.set(0, 0, 22);
    camera.lookAt(0, 0, 0);

    // ── Renderer ──
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.cursor = 'default';

    // ── Lighting — from front-top for side view ──
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // ── Back wall shadow receiver (vertical plane at Z = -CHANNEL_DEPTH/2) ──
    const backGeom = new THREE.PlaneGeometry(60, 60);
    const backMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const backMesh = new THREE.Mesh(backGeom, backMat);
    backMesh.position.z = -CHANNEL_DEPTH / 2;
    backMesh.receiveShadow = true;
    scene.add(backMesh);

    // ── Floor shadow receiver ──
    const floorGeom = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    groundMesh = new THREE.Mesh(floorGeom, floorMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // ── Cannon-ES World ──
    world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -25, 0),
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 10;
    world.allowSleep = true;

    groundMaterial = new CANNON.Material('ground');
    diceMaterial = new CANNON.Material('dice');
    contactMaterial = new CANNON.ContactMaterial(groundMaterial, diceMaterial, {
      friction: settings.friction,
      restitution: settings.restitution,
    });
    world.addContactMaterial(contactMaterial);

    const diceDiceMat = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
      friction: 0.2,
      restitution: 0.35,
    });
    world.addContactMaterial(diceDiceMat);

    bumperMaterial = new CANNON.Material('bumper');
    const diceBumperMat = new CANNON.ContactMaterial(diceMaterial, bumperMaterial, {
      friction: 0.02,
      restitution: 1.2,
    });
    world.addContactMaterial(diceBumperMat);

    // Floor body (will be repositioned by buildWalls)
    groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    buildWalls();
    setupDefaultObstacles();
    setupMouseInteraction();
    setupSelectionBox();
    setupRadialMenu();

    document.querySelectorAll('.dice-count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const count = parseInt(btn.dataset.dice);
        if (count > 0) setDice(count);
        // Highlight active button
        document.querySelectorAll('.dice-count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    window.addEventListener('resize', onResize);

    startLoop();
  }

  function getContainerRect() {
    return diceArea.getBoundingClientRect();
  }

  // ── Compute world bounds from container edges ──
  function computeBounds() {
    const rect = getContainerRect();
    const tl = screenToWorld(0, 0);
    const tr = screenToWorld(rect.width, 0);
    const bl = screenToWorld(0, rect.height);
    const br = screenToWorld(rect.width, rect.height);

    boundsMinX = Math.min(tl.x, bl.x);
    boundsMaxX = Math.max(tr.x, br.x);
    boundsMaxY = Math.max(tl.y, tr.y);
    boundsMinY = Math.min(bl.y, br.y);
    floorY = boundsMinY + 0.5; // Slight offset from edge
  }

  // ── Build walls matching dice tray edges ──
  function buildWalls() {
    // Remove old walls
    const toRemove = [];
    world.bodies.forEach(b => {
      if (b.userData && b.userData.isWall) toRemove.push(b);
    });
    toRemove.forEach(b => world.removeBody(b));

    computeBounds();

    // Position floor
    groundBody.position.y = floorY;
    if (groundMesh) groundMesh.position.y = floorY;

    const halfHeight = (boundsMaxY - boundsMinY) / 2 + 4;
    const centerY = (boundsMaxY + boundsMinY) / 2;
    const halfWidth = (boundsMaxX - boundsMinX) / 2 + 4;
    const wallThick = 3;
    const channelHalf = CHANNEL_DEPTH / 2;

    const wallDefs = [
      // Left wall
      { pos: [boundsMinX - wallThick / 2, centerY, 0],
        size: [wallThick / 2, halfHeight, channelHalf + 2] },
      // Right wall
      { pos: [boundsMaxX + wallThick / 2, centerY, 0],
        size: [wallThick / 2, halfHeight, channelHalf + 2] },
      // Top wall (ceiling — dice bounce off once inside)
      { pos: [0, boundsMaxY + wallThick / 2, 0],
        size: [halfWidth, wallThick / 2, channelHalf + 2] },
      // Back wall (behind dice, Z negative)
      { pos: [0, centerY, -channelHalf - wallThick / 2],
        size: [halfWidth, halfHeight, wallThick / 2] },
      // Front wall (in front of dice, Z positive)
      { pos: [0, centerY, channelHalf + wallThick / 2],
        size: [halfWidth, halfHeight, wallThick / 2] },
    ];

    wallDefs.forEach(def => {
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(def.size[0], def.size[1], def.size[2])),
        material: groundMaterial,
      });
      body.position.set(def.pos[0], def.pos[1], def.pos[2]);
      body.userData = { isWall: true };
      world.addBody(body);
    });
  }

  // ── Obstacle System ──────────────────────
  // Types: peg, spinner, goblin, pig, puncher

  function createEmojiTexture(emoji, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.font = size * 0.75 + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);
    return new THREE.CanvasTexture(canvas);
  }

  function createObstacle(type, x, y) {
    const channelHalf = CHANNEL_DEPTH / 2;
    const rotQuat = new CANNON.Quaternion();
    rotQuat.setFromEuler(Math.PI / 2, 0, 0);
    let body, mesh;
    const obs = { type, body: null, mesh: null, origin: { x, y }, direction: 1, phase: Math.random() * Math.PI * 2, dragging: false };

    if (type === 'peg') {
      const r = 0.55;
      const shape = new CANNON.Cylinder(r, r, CHANNEL_DEPTH + 1, 12);
      body = new CANNON.Body({ type: CANNON.Body.STATIC, material: bumperMaterial });
      body.addShape(shape, new CANNON.Vec3(0, 0, 0), rotQuat);
      body.position.set(x, y, 0);
      const geom = new THREE.CylinderGeometry(r, r, channelHalf * 1.6, 20);
      geom.rotateX(Math.PI / 2);
      mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({
        color: 0x997755, emissive: 0x664422, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.5,
      }));
      mesh.castShadow = true; mesh.receiveShadow = true;

    } else if (type === 'spinner') {
      const armHL = 1.5, armHT = 0.12;
      body = new CANNON.Body({ type: CANNON.Body.KINEMATIC, material: bumperMaterial });
      body.addShape(new CANNON.Box(new CANNON.Vec3(armHL, armHT, channelHalf)));
      body.addShape(new CANNON.Box(new CANNON.Vec3(armHT, armHL, channelHalf)));
      body.position.set(x, y, 0);
      const armMat = new THREE.MeshStandardMaterial({ color: 0xcc8844, emissive: 0x885522, emissiveIntensity: 0.3, metalness: 0.6, roughness: 0.3 });
      mesh = new THREE.Group();
      const a1 = new THREE.Mesh(new THREE.BoxGeometry(armHL * 2, armHT * 2, channelHalf * 1.6), armMat); a1.castShadow = true;
      const a2 = new THREE.Mesh(new THREE.BoxGeometry(armHT * 2, armHL * 2, channelHalf * 1.6), armMat); a2.castShadow = true;
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: 0xddaa55, metalness: 0.8, roughness: 0.2 }));
      hub.castShadow = true;
      mesh.add(a1, a2, hub);

    } else if (type === 'goblin') {
      const r = 0.6;
      body = new CANNON.Body({ type: CANNON.Body.KINEMATIC, material: bumperMaterial });
      body.addShape(new CANNON.Sphere(r));
      body.position.set(x, y, 0);
      const tex = createEmojiTexture('\u{1F47A}', 128); // 👺
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.4, r * 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
      obs.direction = Math.random() > 0.5 ? 1 : -1;

    } else if (type === 'pig') {
      const r = 0.7;
      const shape = new CANNON.Cylinder(r, r, CHANNEL_DEPTH + 1, 12);
      body = new CANNON.Body({ type: CANNON.Body.STATIC, material: bumperMaterial });
      body.addShape(shape, new CANNON.Vec3(0, 0, 0), rotQuat);
      body.position.set(x, y, 0);
      const tex = createEmojiTexture('\u{1F437}', 128); // 🐷
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.4, r * 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
      mesh.castShadow = true;

    } else if (type === 'puncher') {
      const r = 0.5;
      body = new CANNON.Body({ type: CANNON.Body.KINEMATIC, material: bumperMaterial });
      body.addShape(new CANNON.Sphere(r));
      body.position.set(x, y, 0);
      const tex = createEmojiTexture('\u{1F44A}', 128); // 👊
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.4, r * 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
      obs.direction = Math.random() > 0.5 ? 1 : -1;
    }

    obs.body = body;
    obs.mesh = mesh;
    mesh.position.set(x, y, 0);
    world.addBody(body);
    scene.add(mesh);
    obstacles.push(obs);
    return obs;
  }

  function removeObstacle(obs) {
    world.removeBody(obs.body);
    scene.remove(obs.mesh);
    if (obs.mesh.type === 'Group') {
      obs.mesh.children.forEach(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    } else {
      if (obs.mesh.geometry) obs.mesh.geometry.dispose();
      if (obs.mesh.material) { if (obs.mesh.material.map) obs.mesh.material.map.dispose(); obs.mesh.material.dispose(); }
    }
    const idx = obstacles.indexOf(obs);
    if (idx >= 0) obstacles.splice(idx, 1);
  }

  function setupDefaultObstacles() {
    const width = boundsMaxX - boundsMinX;
    const height = boundsMaxY - floorY;
    const cx = (boundsMinX + boundsMaxX) / 2;
    // Row 1: 2 pegs
    createObstacle('peg', cx - width * 0.22, floorY + height * 0.68);
    createObstacle('peg', cx + width * 0.22, floorY + height * 0.68);
    // Row 2: spinner center + 2 pegs
    createObstacle('peg', cx - width * 0.32, floorY + height * 0.46);
    createObstacle('spinner', cx, floorY + height * 0.55);
    createObstacle('peg', cx + width * 0.32, floorY + height * 0.46);
    // Row 3: 2 pegs
    createObstacle('peg', cx - width * 0.18, floorY + height * 0.24);
    createObstacle('peg', cx + width * 0.18, floorY + height * 0.24);
  }

  function raycastObstacles() {
    const meshes = [];
    const map = new Map();
    obstacles.forEach(obs => {
      if (obs.mesh.type === 'Group') {
        obs.mesh.children.forEach(c => { meshes.push(c); map.set(c, obs); });
      } else {
        meshes.push(obs.mesh); map.set(obs.mesh, obs);
      }
    });
    const hits = raycaster.intersectObjects(meshes);
    return hits.length > 0 ? (map.get(hits[0].object) || null) : null;
  }

  function updateObstacleBehaviors(dt) {
    const t = Date.now() / 1000;
    obstacles.forEach(obs => {
      if (obs.dragging) return;

      if (obs.type === 'spinner') {
        obs.phase += propellerSpeed * dt;
        obs.body.quaternion.setFromEuler(0, 0, obs.phase);
        if (obs.mesh.type === 'Group') obs.mesh.rotation.z = obs.phase;
      } else if (obs.type === 'goblin') {
        const amplitude = 2.5;
        const speed = 1.2;
        const offset = Math.sin(t * speed + obs.phase) * amplitude;
        obs.body.position.x = obs.origin.x + offset;
        obs.mesh.position.x = obs.body.position.x;
        // Flip direction visually
        obs.mesh.scale.x = Math.cos(t * speed + obs.phase) > 0 ? 1 : -1;
      } else if (obs.type === 'puncher') {
        const speed = 2.5;
        const cycle = ((t * speed + obs.phase) % 1 + 1) % 1;
        let ext = 0;
        if (cycle < 0.12) ext = cycle / 0.12;
        else if (cycle < 0.22) ext = 1;
        else if (cycle < 0.34) ext = 1 - (cycle - 0.22) / 0.12;
        const punchDist = 1.8;
        obs.body.position.x = obs.origin.x + ext * obs.direction * punchDist;
        obs.mesh.position.x = obs.body.position.x;
        obs.mesh.scale.x = obs.direction;
      }
    });
  }

  // ── Long press & radial menu ──
  function startLongPress(screenX, screenY) {
    cancelLongPress();
    longPressScreenPos = { x: screenX, y: screenY };
    const ring = document.getElementById('long-press-ring');
    if (ring) {
      const rect = getContainerRect();
      ring.style.left = (screenX - rect.left) + 'px';
      ring.style.top = (screenY - rect.top) + 'px';
      ring.classList.remove('active');
      void ring.offsetWidth; // reflow
      ring.classList.add('active');
    }
    longPressTimer = setTimeout(() => {
      showRadialMenu(screenX, screenY);
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    const ring = document.getElementById('long-press-ring');
    if (ring) ring.classList.remove('active');
  }

  function showRadialMenu(screenX, screenY) {
    cancelLongPress();
    const menu = document.getElementById('radial-menu');
    if (!menu) return;
    const rect = getContainerRect();
    const lx = screenX - rect.left;
    const ly = screenY - rect.top;
    menu.style.left = lx + 'px';
    menu.style.top = ly + 'px';
    // Position items in a circle
    const items = menu.querySelectorAll('.radial-item');
    const radius = 55;
    items.forEach((item, i) => {
      const angle = (-Math.PI / 2) + (i / items.length) * Math.PI * 2;
      item.style.left = (Math.cos(angle) * radius) + 'px';
      item.style.top = (Math.sin(angle) * radius) + 'px';
    });
    menu.classList.add('open');
    // Store world position for placing obstacle
    const wp = screenToWorld(lx, ly);
    menu.dataset.wx = wp.x;
    menu.dataset.wy = wp.y;
  }

  function hideRadialMenu() {
    const menu = document.getElementById('radial-menu');
    if (menu) menu.classList.remove('open');
  }

  function setupRadialMenu() {
    const menu = document.getElementById('radial-menu');
    if (!menu) return;
    menu.querySelectorAll('.radial-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.obstacle;
        const wx = parseFloat(menu.dataset.wx) || 0;
        const wy = parseFloat(menu.dataset.wy) || 0;
        createObstacle(type, wx, wy);
        hideRadialMenu();
      });
    });
    // Close on outside click
    document.addEventListener('pointerdown', (e) => {
      if (!menu.contains(e.target) && menu.classList.contains('open')) {
        hideRadialMenu();
      }
    });
  }

  // ── Screen-to-world: intersects Z=0 plane (the view plane) ──
  function screenToWorld(sx, sy) {
    const rect = getContainerRect();
    const ndc = new THREE.Vector2(
      (sx / rect.width) * 2 - 1,
      -(sy / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(viewPlane, target);
    return target || new THREE.Vector3();
  }

  // ── Create die face texture with pips ──
  function createFaceTexture(faceValue) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = skin.diceColor;
    ctx.fillRect(0, 0, size, size);

    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);

    const cornerR = size * 0.08;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, cornerR);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const pips = PIP_PATTERNS[faceValue] || [];
    const pipRadius = size * 0.075;
    const margin = size * 0.22;
    const spacing = (size - 2 * margin) / 2;

    pips.forEach(pos => {
      const col = pos % 3;
      const row = Math.floor(pos / 3);
      const cx = margin + col * spacing;
      const cy = margin + row * spacing;
      ctx.beginPath();
      ctx.arc(cx, cy, pipRadius, 0, Math.PI * 2);
      ctx.fillStyle = skin.pipColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - 1, pipRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function buildDieMaterials() {
    const faceOrder = [2, 5, 1, 6, 3, 4];
    const materialProps = getMaterialProps();
    return faceOrder.map(faceVal => {
      const tex = createFaceTexture(faceVal);
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
      });
    });
  }

  function getMaterialProps() {
    switch (skin.material) {
      case 'glossy': return { roughness: 0.15, metalness: 0.05 };
      case 'metallic': return { roughness: 0.3, metalness: 0.7 };
      default: return { roughness: 0.7, metalness: 0.0 };
    }
  }

  // ── Add a die — drops from top with lots of spin ──
  function addDie() {
    if (dice.length >= MAX_DICE) return;

    // Random X position within tray (inner 70%)
    const padX = (boundsMaxX - boundsMinX) * 0.15;
    const spawnX = (boundsMinX + padX) + Math.random() * (boundsMaxX - boundsMinX - 2 * padX);
    // Spawn just below the ceiling so dice appear inside the tray and fall
    const spawnY = boundsMaxY - 1;
    // Random Z within channel
    const spawnZ = (Math.random() - 0.5) * (CHANNEL_DEPTH * 0.6);

    const geometry = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
    const materials = buildDieMaterials();
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(spawnX, spawnY, spawnZ);
    scene.add(mesh);

    const body = new CANNON.Body({
      mass: settings.density,
      shape: new CANNON.Box(new CANNON.Vec3(HALF, HALF, HALF)),
      material: diceMaterial,
      linearDamping: settings.linearDamping,
      angularDamping: settings.angularDamping,
    });
    body.position.set(spawnX, spawnY, spawnZ);

    // Random rotation
    body.quaternion.setFromEuler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    // LOTS of spin for the tumble effect
    body.angularVelocity.set(
      (Math.random() - 0.5) * 25,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 25
    );

    // Random sideways + downward velocity
    body.velocity.set(
      (Math.random() - 0.5) * 6,
      -4,
      (Math.random() - 0.5) * 2
    );

    world.addBody(body);

    const resultEl = document.createElement('div');
    resultEl.className = 'die-result';
    container.appendChild(resultEl);

    const die = {
      mesh, body, resultEl,
      settled: false,
      settleFrames: 0,
      selected: false,
      lastResult: null,
    };
    dice.push(die);

    if (typeof gsap !== 'undefined') {
      mesh.scale.set(0.01, 0.01, 0.01);
      gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(1.7)' });
    }
  }

  function removeLastDie() {
    if (dice.length === 0) return;
    const die = dice[dice.length - 1];

    const selIdx = selectedDice.indexOf(die);
    if (selIdx >= 0) selectedDice.splice(selIdx, 1);

    if (typeof gsap !== 'undefined') {
      gsap.to(die.mesh.scale, {
        x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: 'power2.in',
        onComplete: function () {
          scene.remove(die.mesh);
          world.removeBody(die.body);
          die.resultEl.remove();
          disposeDie(die);
        }
      });
    } else {
      scene.remove(die.mesh);
      world.removeBody(die.body);
      die.resultEl.remove();
      disposeDie(die);
    }
    dice.pop();
  }

  function disposeDie(die) {
    die.mesh.geometry.dispose();
    if (Array.isArray(die.mesh.material)) {
      die.mesh.material.forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  }

  // ── Mouse Interaction — grab & throw dice + obstacles, long press ──
  function setupMouseInteraction() {
    const canvas = renderer.domElement;

    canvas.addEventListener('pointerdown', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      hideRadialMenu();
      updateMouse(e);

      // Priority 1: dice
      const dieHit = raycastDice();
      if (dieHit) {
        e.preventDefault(); e.stopPropagation();
        isDragging = true; dragDie = dieHit;
        dragDie.body.wakeUp(); dragDie.settled = false; dragDie.settleFrames = 0;
        raycaster.ray.intersectPlane(viewPlane, dragTarget);
        dragOffset.copy(dragTarget).sub(new THREE.Vector3(dragDie.body.position.x, dragDie.body.position.y, 0));
        lastDragPos.copy(dragTarget); dragVelocity.set(0, 0, 0);
        if (dragDie.resultEl) dragDie.resultEl.style.opacity = '0';
        hideHighestRoll();
        canvas.style.cursor = 'grabbing'; canvas.setPointerCapture(e.pointerId);
        return;
      }

      // Priority 2: obstacles
      const obsHit = raycastObstacles();
      if (obsHit) {
        e.preventDefault(); e.stopPropagation();
        isDraggingObstacle = true; dragObstacle = obsHit; obsHit.dragging = true;
        raycaster.ray.intersectPlane(viewPlane, dragTarget);
        obstDragOffset.copy(dragTarget).sub(new THREE.Vector3(obsHit.body.position.x, obsHit.body.position.y, 0));
        obstLastDragPos.copy(dragTarget); obstDragVelocity.set(0, 0, 0);
        // Ensure kinematic so it can be moved
        obsHit.body.type = CANNON.Body.KINEMATIC;
        canvas.style.cursor = 'grabbing'; canvas.setPointerCapture(e.pointerId);
        return;
      }

      // Priority 3: long press on empty space
      startLongPress(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointermove', function (e) {
      // Obstacle drag
      if (isDraggingObstacle && dragObstacle) {
        updateMouse(e);
        raycaster.ray.intersectPlane(viewPlane, dragTarget);
        const newPos = dragTarget.clone().sub(obstDragOffset);
        obstDragVelocity.copy(newPos).sub(obstLastDragPos).multiplyScalar(60);
        obstLastDragPos.copy(newPos);
        dragObstacle.body.position.x = newPos.x;
        dragObstacle.body.position.y = newPos.y;
        dragObstacle.body.position.z = 0;
        dragObstacle.mesh.position.set(newPos.x, newPos.y, 0);
        dragObstacle.origin.x = newPos.x;
        dragObstacle.origin.y = newPos.y;
        return;
      }

      // Die drag
      if (isDragging && dragDie) {
        updateMouse(e);
        raycaster.ray.intersectPlane(viewPlane, dragTarget);
        const newPos = dragTarget.clone().sub(dragOffset);
        dragVelocity.copy(newPos).sub(lastDragPos).multiplyScalar(60);
        lastDragPos.copy(newPos);
        dragDie.body.position.x = newPos.x;
        dragDie.body.position.y = newPos.y;
        dragDie.body.position.z = 0;
        dragDie.body.velocity.set(0, 0, 0);
        dragDie.body.angularVelocity.set(0, 0, 0);
        return;
      }

      // Hover cursor + cancel long press if moved too far
      updateMouse(e);
      if (longPressTimer && longPressScreenPos) {
        const dx = e.clientX - longPressScreenPos.x;
        const dy = e.clientY - longPressScreenPos.y;
        if (dx * dx + dy * dy > 225) cancelLongPress(); // 15px threshold
      }
      const hit = raycastDice() || raycastObstacles();
      canvas.style.cursor = hit ? 'grab' : 'default';
    });

    canvas.addEventListener('pointerup', function (e) {
      cancelLongPress();

      // Obstacle release
      if (isDraggingObstacle && dragObstacle) {
        const speed = obstDragVelocity.length();
        if (speed > FLING_REMOVE_SPEED) {
          // Fling off screen → remove
          const obs = dragObstacle;
          if (typeof gsap !== 'undefined') {
            const dir = obstDragVelocity.clone().normalize();
            gsap.to(obs.mesh.position, {
              x: obs.mesh.position.x + dir.x * 30,
              y: obs.mesh.position.y + dir.y * 30,
              duration: 0.4, ease: 'power2.in',
              onComplete: () => removeObstacle(obs)
            });
            gsap.to(obs.mesh.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.4 });
            // Detach body immediately so it doesn't interact
            world.removeBody(obs.body);
          } else {
            removeObstacle(obs);
          }
        } else {
          // Place it where it was dropped
          dragObstacle.dragging = false;
          // Restore static type for static obstacles
          if (dragObstacle.type === 'peg' || dragObstacle.type === 'pig') {
            dragObstacle.body.type = CANNON.Body.STATIC;
            dragObstacle.body.updateMassProperties();
          }
        }
        isDraggingObstacle = false; dragObstacle = null;
        canvas.style.cursor = 'default';
        canvas.releasePointerCapture(e.pointerId);
        return;
      }

      // Die release
      if (isDragging && dragDie) {
        const throwScale = 0.8;
        dragDie.body.velocity.set(dragVelocity.x * throwScale, dragVelocity.y * throwScale, (Math.random() - 0.5) * 2);
        const speed = dragVelocity.length();
        if (speed > 1) {
          dragDie.body.angularVelocity.set(
            (Math.random() - 0.5) * speed * 3, (Math.random() - 0.5) * speed * 2, (Math.random() - 0.5) * speed * 3);
        }
        dragDie.settled = false; dragDie.settleFrames = 0;
        if (dragDie.selected && selectedDice.length > 1) fanOutThrow(dragDie, dragVelocity);
        isDragging = false; dragDie = null;
        canvas.style.cursor = 'default'; canvas.releasePointerCapture(e.pointerId);
      }
    });
  }

  function updateMouse(e) {
    const rect = getContainerRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
  }

  function raycastDice() {
    const meshes = dice.map(d => d.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      return dice.find(d => d.mesh === hits[0].object);
    }
    return null;
  }

  // ── Fan-out throw for selected group (XY plane) ──
  function fanOutThrow(originDie, baseVel) {
    const speed = baseVel.length();
    if (speed < 0.5) return;

    const baseAngle = Math.atan2(baseVel.y, baseVel.x);
    const spreadAngle = Math.PI / 6;
    const count = selectedDice.length;

    selectedDice.forEach(function (die, idx) {
      if (die === originDie) return;
      const angleOffset = (idx / (count - 1) - 0.5) * spreadAngle;
      const throwAngle = baseAngle + angleOffset;
      const throwSpeed = speed * (0.85 + Math.random() * 0.15);

      die.body.wakeUp();
      die.body.velocity.set(
        Math.cos(throwAngle) * throwSpeed,
        Math.sin(throwAngle) * throwSpeed,
        (Math.random() - 0.5) * 2
      );
      die.body.angularVelocity.set(
        (Math.random() - 0.5) * throwSpeed * 3,
        (Math.random() - 0.5) * throwSpeed * 2,
        (Math.random() - 0.5) * throwSpeed * 3
      );
      die.settled = false;
      die.settleFrames = 0;
      if (die.resultEl) die.resultEl.style.opacity = '0';
    });
  }

  // ── Selection box ──
  function setupSelectionBox() {
    selBox = document.getElementById('selection-box');
    const canvas = renderer.domElement;

    canvas.addEventListener('pointerdown', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      isSelecting = true;
      const rect = getContainerRect();
      selStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      selBox.style.left = selStart.x + 'px';
      selBox.style.top = selStart.y + 'px';
      selBox.style.width = '0';
      selBox.style.height = '0';
      selBox.style.display = 'block';
      e.preventDefault();
    });

    document.addEventListener('pointermove', function (e) {
      if (!isSelecting) return;
      const rect = getContainerRect();
      const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
      const x = Math.min(lx, selStart.x), y = Math.min(ly, selStart.y);
      selBox.style.left = x + 'px';
      selBox.style.top = y + 'px';
      selBox.style.width = Math.abs(lx - selStart.x) + 'px';
      selBox.style.height = Math.abs(ly - selStart.y) + 'px';
    });

    document.addEventListener('pointerup', function (e) {
      if (!isSelecting) return;
      isSelecting = false;
      selBox.style.display = 'none';

      const rect = getContainerRect();
      const lx = e.clientX - rect.left, ly = e.clientY - rect.top;
      const selRect = {
        left: Math.min(lx, selStart.x), top: Math.min(ly, selStart.y),
        right: Math.max(lx, selStart.x), bottom: Math.max(ly, selStart.y),
      };
      clearSelection();
      dice.forEach(function (die) {
        const sp = worldToScreen(die.mesh.position);
        if (sp.x >= selRect.left && sp.x <= selRect.right &&
            sp.y >= selRect.top && sp.y <= selRect.bottom) {
          die.selected = true;
          selectedDice.push(die);
        }
      });
      selectedDice.forEach(function (die) {
        if (typeof gsap !== 'undefined') {
          gsap.fromTo(die.mesh.scale,
            { x: 1.15, y: 1.15, z: 1.15 },
            { x: 1, y: 1, z: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
        }
      });
    });

    canvas.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey) return;
      updateMouse(e);
      if (!raycastDice()) clearSelection();
    });
  }

  function clearSelection() {
    selectedDice.forEach(d => { d.selected = false; });
    selectedDice = [];
  }

  function worldToScreen(position) {
    const vec = position.clone().project(camera);
    const rect = getContainerRect();
    return {
      x: (vec.x * 0.5 + 0.5) * rect.width,
      y: (-vec.y * 0.5 + 0.5) * rect.height,
    };
  }

  // ── Face detection ──
  function getTopFace(body) {
    // "Top" is still +Y even in side view — the face pointing up
    let topFace = 1;
    let maxDot = -Infinity;
    for (const { face, normal } of FACE_NORMALS) {
      const worldNormal = body.quaternion.vmult(normal);
      if (worldNormal.y > maxDot) {
        maxDot = worldNormal.y;
        topFace = face;
      }
    }
    return topFace;
  }

  // ── Settle detection ──
  function checkSettle(die) {
    if (die.settled || (isDragging && dragDie === die)) return;

    const vel = die.body.velocity;
    const ang = die.body.angularVelocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    const angSpeed = Math.sqrt(ang.x * ang.x + ang.y * ang.y + ang.z * ang.z);

    // Die must be near the floor and barely moving
    if (speed < SETTLE_SPEED && angSpeed < SETTLE_ANG &&
        die.body.position.y < floorY + HALF + 0.3) {
      die.settleFrames++;
      if (die.settleFrames > SETTLE_FRAMES) {
        settleDie(die);
      }
    } else {
      die.settleFrames = 0;
    }
  }

  function settleDie(die) {
    die.settled = true;
    die.body.velocity.set(0, 0, 0);
    die.body.angularVelocity.set(0, 0, 0);

    const result = getTopFace(die.body);
    die.lastResult = result;

    if (die.resultEl) {
      die.resultEl.textContent = result;
      const sp = worldToScreen(die.mesh.position);
      die.resultEl.style.left = sp.x + 'px';
      die.resultEl.style.top = (sp.y - 28) + 'px'; // Above the die in side view

      if (typeof gsap !== 'undefined') {
        gsap.fromTo(die.resultEl,
          { opacity: 0, y: 5, scale: 0.8 },
          { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.7)' });
        gsap.fromTo(die.mesh.scale,
          { x: 1, y: 1, z: 1 },
          { x: 1.08, y: 1.08, z: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
      } else {
        die.resultEl.style.opacity = '1';
      }
    }

    updateHighestRoll();
  }

  // ── Highest roll display ──
  function hideHighestRoll() {
    const el = document.getElementById('dice-highest');
    if (el) el.style.display = 'none';
  }

  function updateHighestRoll() {
    const wrapperEl = document.getElementById('dice-highest');
    const valueEl = document.getElementById('dice-highest-value');
    const critEl = document.getElementById('dice-crit-text');
    if (!wrapperEl || !valueEl || !critEl) return;

    if (dice.length === 0 || !dice.every(d => d.settled)) {
      wrapperEl.style.display = 'none';
      return;
    }

    const results = dice.map(d => d.lastResult);
    const highest = Math.max(...results);
    const sixCount = results.filter(r => r === 6).length;

    wrapperEl.style.display = 'block';

    // Scale font size based on value
    const sizes = [0, 1.8, 2.2, 2.6, 3.2, 3.8, 4.5];
    valueEl.textContent = highest;
    valueEl.style.fontSize = sizes[highest] + 'rem';

    // Glow intensity scales with value
    const g = highest / 6;
    valueEl.style.textShadow =
      '0 0 ' + (10 + highest * 5) + 'px rgba(255,' + Math.round(200 * g) + ',50,0.8), ' +
      '0 0 ' + (20 + highest * 8) + 'px rgba(255,' + Math.round(150 * g) + ',0,0.5)';

    // CRIT!
    if (sixCount >= 2) {
      critEl.classList.add('visible');
    } else {
      critEl.classList.remove('visible');
    }

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(wrapperEl, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' });
    }
  }

  // ── Main loop ──
  function startLoop() {
    const fixedTimeStep = 1 / 60;

    function loop() {
      updateObstacleBehaviors(fixedTimeStep);
      world.step(fixedTimeStep);

      for (let i = 0; i < dice.length; i++) {
        const die = dice[i];

        // Hard position clamp — prevent tunneling through walls
        const p = die.body.position;
        const v = die.body.velocity;
        if (p.x < boundsMinX + HALF) {
          p.x = boundsMinX + HALF;
          if (v.x < 0) v.x = -v.x * 0.5;
        }
        if (p.x > boundsMaxX - HALF) {
          p.x = boundsMaxX - HALF;
          if (v.x > 0) v.x = -v.x * 0.5;
        }
        if (p.y > boundsMaxY - HALF) {
          p.y = boundsMaxY - HALF;
          if (v.y > 0) v.y = -v.y * 0.5;
        }

        // Velocity clamp to prevent extreme tunneling
        const maxSpeed = 35;
        const spd = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (spd > maxSpeed) {
          const sc = maxSpeed / spd;
          v.x *= sc; v.y *= sc; v.z *= sc;
        }

        // Sync mesh to physics body
        die.mesh.position.copy(die.body.position);
        die.mesh.quaternion.copy(die.body.quaternion);

        // Selection glow
        if (die.selected) {
          die.mesh.material.forEach(m => {
            m.emissive = new THREE.Color(0x3388ff);
            m.emissiveIntensity = 0.15;
          });
        } else {
          die.mesh.material.forEach(m => { m.emissiveIntensity = 0; });
        }

        // Update result label position
        if (die.settled && die.resultEl && die.resultEl.style.opacity !== '0') {
          const sp = worldToScreen(die.mesh.position);
          die.resultEl.style.left = sp.x + 'px';
          die.resultEl.style.top = (sp.y - 28) + 'px';
        }

        // Safety: reset dice that fell out of bounds (any direction)
        const pos = die.body.position;
        if (pos.y < floorY - 5 || pos.x < boundsMinX - 5 || pos.x > boundsMaxX + 5 || pos.y > boundsMaxY + 10) {
          pos.set(0, boundsMaxY + 3, 0);
          die.body.velocity.set((Math.random() - 0.5) * 4, -3, 0);
          die.body.angularVelocity.set(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 15
          );
          die.settled = false;
          die.settleFrames = 0;
          if (die.resultEl) die.resultEl.style.opacity = '0';
        }

        checkSettle(die);
      }

      renderer.render(scene, camera);
      animFrame = requestAnimationFrame(loop);
    }
    animFrame = requestAnimationFrame(loop);
  }

  // ── Resize ──
  function onResize() {
    const rect = getContainerRect();
    if (rect.width === 0 || rect.height === 0) return;
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
    buildWalls();
  }

  // ── Remove all dice and spawn N new ones ──
  function removeAllDice() {
    dice.forEach(die => {
      scene.remove(die.mesh);
      world.removeBody(die.body);
      die.resultEl.remove();
      disposeDie(die);
    });
    dice = [];
    selectedDice = [];
  }

  function setDice(count) {
    removeAllDice();
    hideHighestRoll();
    const n = Math.min(count, MAX_DICE);
    for (let i = 0; i < n; i++) {
      setTimeout(() => addDie(), i * 100);
    }
  }

  // ── Settings API ──
  function applySettings(newSettings) {
    Object.assign(settings, newSettings);
    if (contactMaterial) {
      contactMaterial.friction = settings.friction;
      contactMaterial.restitution = settings.restitution;
    }
    dice.forEach(function (die) {
      die.body.linearDamping = settings.linearDamping;
      die.body.angularDamping = settings.angularDamping;
      die.body.mass = settings.density;
      die.body.updateMassProperties();
    });
  }

  function applySkin(newSkin) {
    Object.assign(skin, newSkin);
    dice.forEach(function (die) {
      const newMaterials = buildDieMaterials();
      if (Array.isArray(die.mesh.material)) {
        die.mesh.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
      die.mesh.material = newMaterials;
    });
  }

  function getSkin() { return Object.assign({}, skin); }
  function getSettings() { return Object.assign({}, settings); }

  function setLighting(intensity) {
    lightingIntensity = intensity;
    if (ambientLight) ambientLight.intensity = 0.7 * intensity;
    if (dirLight) dirLight.intensity = 1.0 * intensity;
  }

  function getLighting() { return lightingIntensity; }

  function setZoom(level) {
    // level: 0.5 = zoomed in, 1.0 = default, 2.0 = zoomed out
    if (!camera) return;
    camera.position.z = 22 * level;
    camera.updateProjectionMatrix();
    buildWalls();
  }

  function getZoom() {
    return camera ? camera.position.z / 22 : 1;
  }

  return {
    init, addDie, removeLastDie, setDice,
    applySettings, getSettings,
    applySkin, getSkin,
    setLighting, getLighting,
    setZoom, getZoom,
  };
})();

window.DiceEngine = DiceEngine;

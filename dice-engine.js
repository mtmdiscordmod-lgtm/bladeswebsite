/* ════════════════════════════════════════
   DICE ENGINE — Three.js + Cannon-ES
   Real 3D physics dice in a dedicated dice tray
   ════════════════════════════════════════ */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ── Constants ────────────────────────────
const MAX_DICE = 10;
const DIE_SIZE = 1.0;        // world units (Cannon-ES half-extent = 0.5)
const HALF = DIE_SIZE / 2;
const SETTLE_SPEED = 0.15;
const SETTLE_ANG = 0.15;
const SETTLE_FRAMES = 15;
const GROUND_Y = 0;

// Face normals for a standard d6 (in local body space)
// Mapping: which face number is in the +direction
// With standard die: opposite faces sum to 7
const FACE_NORMALS = [
  { face: 2, normal: new CANNON.Vec3( 1,  0,  0) },  // +X
  { face: 5, normal: new CANNON.Vec3(-1,  0,  0) },  // -X
  { face: 1, normal: new CANNON.Vec3( 0,  1,  0) },  // +Y (top at rest)
  { face: 6, normal: new CANNON.Vec3( 0, -1,  0) },  // -Y
  { face: 3, normal: new CANNON.Vec3( 0,  0,  1) },  // +Z
  { face: 4, normal: new CANNON.Vec3( 0,  0, -1) },  // -Z
];

// Pip positions on a 3x3 grid (0-8, row-major, for each face value)
const PIP_PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// ── Default Skin ─────────────────────────
const DEFAULT_SKIN = {
  diceColor: '#e8e0d0',
  pipColor: '#222222',
  material: 'matte',  // 'matte', 'glossy', 'metallic'
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

  // Physics settings (mapped from sliders)
  let settings = {
    friction: 0.4,
    restitution: 0.3,
    density: 1.0,
    linearDamping: 0.3,
    angularDamping: 0.3,
  };

  // Skin settings
  let skin = Object.assign({}, DEFAULT_SKIN);

  // Mouse interaction state
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let dragTarget = new THREE.Vector3();
  let isDragging = false;
  let dragDie = null;
  let dragOffset = new THREE.Vector3();
  let lastDragPos = new THREE.Vector3();
  let dragVelocity = new THREE.Vector3();

  // Selection box state
  let isSelecting = false;
  let selStart = { x: 0, y: 0 };
  let selBox = null;

  // Ground physics material
  let groundMaterial, diceMaterial, contactMaterial;

  function init() {
    diceArea = document.getElementById('dice-area');
    container = document.getElementById('dice-container');
    if (!container || !diceArea) return;

    const rect = diceArea.getBoundingClientRect();

    // ── Three.js Setup ──
    scene = new THREE.Scene();

    // Camera: angled top-down view into the dice tray
    const aspect = rect.width / rect.height;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 14, 4);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Canvas fills the dice area and is interactive
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.cursor = 'default';

    // ── Lighting ──
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(3, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    scene.add(dirLight);

    // ── Ground plane for shadows (subtle on dark background) ──
    const groundGeom = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = GROUND_Y;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // ── Cannon-ES World ──
    world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -30, 0),
    });
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = 10;
    world.allowSleep = true;

    // Materials
    groundMaterial = new CANNON.Material('ground');
    diceMaterial = new CANNON.Material('dice');
    contactMaterial = new CANNON.ContactMaterial(groundMaterial, diceMaterial, {
      friction: settings.friction,
      restitution: settings.restitution,
    });
    world.addContactMaterial(contactMaterial);

    const diceContactMaterial = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
      friction: 0.3,
      restitution: 0.2,
    });
    world.addContactMaterial(diceContactMaterial);

    // Ground body
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Build invisible walls
    buildWalls();

    // ── Mouse interaction ──
    setupMouseInteraction();
    setupSelectionBox();

    // ── Toolbar ──
    document.getElementById('btn-add-die').addEventListener('click', addDie);
    document.getElementById('btn-remove-die').addEventListener('click', removeLastDie);

    // ── Resize ──
    window.addEventListener('resize', onResize);

    // ── Start loop ──
    startLoop();
  }

  // ── Get container dimensions ──
  function getContainerRect() {
    return diceArea.getBoundingClientRect();
  }

  // ── Walls (invisible boundaries matching dice tray edges) ──
  function buildWalls() {
    // Remove old wall bodies
    world.bodies.forEach(b => {
      if (b.userData && b.userData.isWall) world.removeBody(b);
    });

    const rect = getContainerRect();

    // Convert dice area edges to world coordinates
    const corners = [
      screenToWorld(0, 0),              // top-left
      screenToWorld(rect.width, 0),     // top-right
      screenToWorld(rect.width, rect.height), // bottom-right
      screenToWorld(0, rect.height),    // bottom-left
    ];

    const minX = Math.min(corners[0].x, corners[3].x);
    const maxX = Math.max(corners[1].x, corners[2].x);
    const minZ = Math.min(corners[0].z, corners[1].z);
    const maxZ = Math.max(corners[2].z, corners[3].z);
    const wallHeight = 6;
    const wallThick = 1;

    const wallDefs = [
      // left
      { pos: [minX - wallThick / 2, wallHeight / 2, 0], size: [wallThick / 2, wallHeight / 2, (maxZ - minZ) / 2 + wallThick] },
      // right
      { pos: [maxX + wallThick / 2, wallHeight / 2, 0], size: [wallThick / 2, wallHeight / 2, (maxZ - minZ) / 2 + wallThick] },
      // top (far)
      { pos: [0, wallHeight / 2, minZ - wallThick / 2], size: [(maxX - minX) / 2 + wallThick, wallHeight / 2, wallThick / 2] },
      // bottom (near)
      { pos: [0, wallHeight / 2, maxZ + wallThick / 2], size: [(maxX - minX) / 2 + wallThick, wallHeight / 2, wallThick / 2] },
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

  // ── Screen-to-world coordinate conversion (relative to dice area) ──
  function screenToWorld(sx, sy) {
    const rect = getContainerRect();
    const ndc = new THREE.Vector2(
      (sx / rect.width) * 2 - 1,
      -(sy / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, target);
    return target || new THREE.Vector3();
  }

  // ── Create die face texture with pips ──
  function createFaceTexture(faceValue) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = skin.diceColor;
    ctx.fillRect(0, 0, size, size);

    // Subtle gradient for depth
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);

    // Rounded corners for die face
    const cornerR = size * 0.08;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, cornerR);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Pips
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

      // Pip inset highlight
      ctx.beginPath();
      ctx.arc(cx, cy - 1, pipRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // ── Build die materials based on skin ──
  function buildDieMaterials() {
    // Standard die face order for BoxGeometry:
    // +X(right), -X(left), +Y(top), -Y(bottom), +Z(front), -Z(back)
    // We map: +X=2, -X=5, +Y=1, -Y=6, +Z=3, -Z=4
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
      default: return { roughness: 0.7, metalness: 0.0 };  // matte
    }
  }

  // ── Add a die (spawns from top of dice tray, falls with spin) ──
  function addDie() {
    if (dice.length >= MAX_DICE) return;

    const rect = getContainerRect();

    // Spawn at random X across top of tray
    const spawnScreenX = rect.width * (0.2 + Math.random() * 0.6);
    const topWorld = screenToWorld(spawnScreenX, rect.height * 0.3);

    // Three.js mesh
    const geometry = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
    const materials = buildDieMaterials();
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Start above visible area
    mesh.position.set(topWorld.x, 6, topWorld.z);
    scene.add(mesh);

    // Cannon-ES body
    const body = new CANNON.Body({
      mass: settings.density,
      shape: new CANNON.Box(new CANNON.Vec3(HALF, HALF, HALF)),
      material: diceMaterial,
      linearDamping: settings.linearDamping,
      angularDamping: settings.angularDamping,
    });
    body.position.set(topWorld.x, 6, topWorld.z);
    // Random initial rotation
    body.quaternion.setFromEuler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    // Spin as it falls
    body.angularVelocity.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 12
    );
    // Slight horizontal push for variety
    body.velocity.set(
      (Math.random() - 0.5) * 3,
      -2,
      (Math.random() - 0.5) * 2
    );
    world.addBody(body);

    // Result label (DOM overlay inside dice container)
    const resultEl = document.createElement('div');
    resultEl.className = 'die-result';
    container.appendChild(resultEl);

    const die = {
      mesh,
      body,
      resultEl,
      settled: false,
      settleFrames: 0,
      selected: false,
      lastResult: null,
    };

    dice.push(die);

    // GSAP spawn animation
    if (typeof gsap !== 'undefined') {
      mesh.scale.set(0.01, 0.01, 0.01);
      gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(1.7)' });
    }
  }

  // ── Remove last die ──
  function removeLastDie() {
    if (dice.length === 0) return;
    const die = dice[dice.length - 1];

    // Deselect if needed
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

  // ── Mouse Interaction (grab & throw) ──
  function setupMouseInteraction() {
    const canvas = renderer.domElement;

    // Direct canvas event handling — no need to filter sheet elements
    canvas.addEventListener('pointerdown', function (e) {
      if (e.ctrlKey || e.metaKey) return; // let selection box handle

      updateMouse(e);
      const hit = raycastDice();

      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragDie = hit;

        // Wake the body
        dragDie.body.wakeUp();
        dragDie.settled = false;
        dragDie.settleFrames = 0;

        // Calculate drag offset
        raycaster.ray.intersectPlane(dragPlane, dragTarget);
        dragOffset.copy(dragTarget).sub(new THREE.Vector3(
          dragDie.body.position.x, 0, dragDie.body.position.z
        ));
        lastDragPos.copy(dragTarget);
        dragVelocity.set(0, 0, 0);

        // Hide result
        if (dragDie.resultEl) {
          dragDie.resultEl.style.opacity = '0';
        }

        canvas.style.cursor = 'grabbing';
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!isDragging || !dragDie) {
        // Hover cursor change
        updateMouse(e);
        const hit = raycastDice();
        canvas.style.cursor = hit ? 'grab' : 'default';
        return;
      }

      updateMouse(e);
      raycaster.ray.intersectPlane(dragPlane, dragTarget);

      // Track velocity for throw
      const newPos = dragTarget.clone().sub(dragOffset);
      dragVelocity.copy(newPos).sub(lastDragPos).multiplyScalar(60);
      lastDragPos.copy(newPos);

      // Move the body to follow mouse
      dragDie.body.position.x = newPos.x;
      dragDie.body.position.z = newPos.z;
      dragDie.body.position.y = GROUND_Y + HALF + 0.5; // Lift slightly
      dragDie.body.velocity.set(0, 0, 0);
      dragDie.body.angularVelocity.set(0, 0, 0);
    });

    canvas.addEventListener('pointerup', function (e) {
      if (!isDragging || !dragDie) return;

      // Release: apply throw velocity
      const throwScale = 0.8;
      dragDie.body.velocity.set(
        dragVelocity.x * throwScale,
        -2,
        dragVelocity.z * throwScale
      );

      // Angular velocity from throw direction
      const speed = dragVelocity.length();
      if (speed > 1) {
        dragDie.body.angularVelocity.set(
          (Math.random() - 0.5) * speed * 2,
          (Math.random() - 0.5) * speed * 1,
          (Math.random() - 0.5) * speed * 2
        );
      }

      dragDie.settled = false;
      dragDie.settleFrames = 0;

      // Fan-out throw if this die is selected and part of group
      if (dragDie.selected && selectedDice.length > 1) {
        fanOutThrow(dragDie, dragVelocity);
      }

      isDragging = false;
      dragDie = null;
      canvas.style.cursor = 'default';
      canvas.releasePointerCapture(e.pointerId);
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

  // ── Fan-out throw for selected group ──
  function fanOutThrow(originDie, baseVel) {
    const speed = baseVel.length();
    if (speed < 0.5) return;

    const baseAngle = Math.atan2(baseVel.z, baseVel.x);
    const spreadAngle = Math.PI / 6;
    const count = selectedDice.length;

    selectedDice.forEach(function (die, idx) {
      if (die === originDie) return;

      const angleOffset = (idx / (count - 1) - 0.5) * spreadAngle;
      const throwAngle = baseAngle + angleOffset;
      const throwSpeed = speed * (0.5 + Math.random() * 0.3);

      die.body.wakeUp();
      die.body.velocity.set(
        Math.cos(throwAngle) * throwSpeed,
        -2,
        Math.sin(throwAngle) * throwSpeed
      );
      die.body.angularVelocity.set(
        (Math.random() - 0.5) * throwSpeed * 2,
        (Math.random() - 0.5) * throwSpeed,
        (Math.random() - 0.5) * throwSpeed * 2
      );

      die.settled = false;
      die.settleFrames = 0;

      if (die.resultEl) {
        die.resultEl.style.opacity = '0';
      }
    });
  }

  // ── Selection box (Ctrl+Click+Drag) ──
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
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const x = Math.min(localX, selStart.x);
      const y = Math.min(localY, selStart.y);
      const w = Math.abs(localX - selStart.x);
      const h = Math.abs(localY - selStart.y);
      selBox.style.left = x + 'px';
      selBox.style.top = y + 'px';
      selBox.style.width = w + 'px';
      selBox.style.height = h + 'px';
    });

    document.addEventListener('pointerup', function (e) {
      if (!isSelecting) return;
      isSelecting = false;
      selBox.style.display = 'none';

      const rect = getContainerRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const selRect = {
        left: Math.min(localX, selStart.x),
        top: Math.min(localY, selStart.y),
        right: Math.max(localX, selStart.x),
        bottom: Math.max(localY, selStart.y),
      };

      clearSelection();

      dice.forEach(function (die) {
        const screenPos = worldToScreen(die.mesh.position);
        if (screenPos.x >= selRect.left && screenPos.x <= selRect.right &&
            screenPos.y >= selRect.top && screenPos.y <= selRect.bottom) {
          die.selected = true;
          selectedDice.push(die);
        }
      });

      // Visual feedback on selected dice
      selectedDice.forEach(function (die) {
        if (typeof gsap !== 'undefined') {
          gsap.fromTo(die.mesh.scale,
            { x: 1.15, y: 1.15, z: 1.15 },
            { x: 1, y: 1, z: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' }
          );
        }
      });
    });

    // Click on empty space in dice area to deselect
    canvas.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey) return;

      updateMouse(e);
      const hit = raycastDice();
      if (!hit) {
        clearSelection();
      }
    });
  }

  function clearSelection() {
    selectedDice.forEach(function (die) {
      die.selected = false;
    });
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

  // ── Settle & Face Detection ──
  function getTopFace(body) {
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

  function checkSettle(die) {
    if (die.settled || isDragging && dragDie === die) return;

    const vel = die.body.velocity;
    const ang = die.body.angularVelocity;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    const angSpeed = Math.sqrt(ang.x * ang.x + ang.y * ang.y + ang.z * ang.z);

    if (speed < SETTLE_SPEED && angSpeed < SETTLE_ANG && die.body.position.y < GROUND_Y + HALF + 0.1) {
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

    // Show result label
    if (die.resultEl) {
      die.resultEl.textContent = result;
      const screenPos = worldToScreen(die.mesh.position);
      die.resultEl.style.left = screenPos.x + 'px';
      die.resultEl.style.top = (screenPos.y + 32) + 'px';

      if (typeof gsap !== 'undefined') {
        gsap.fromTo(die.resultEl,
          { opacity: 0, y: 5, scale: 0.8 },
          { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
        );
        // Settle pulse
        gsap.fromTo(die.mesh.scale,
          { x: 1, y: 1, z: 1 },
          { x: 1.08, y: 1.08, z: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }
        );
      } else {
        die.resultEl.style.opacity = '1';
      }
    }
  }

  // ── Main Loop ──
  function startLoop() {
    const fixedTimeStep = 1 / 60;

    function loop() {
      world.step(fixedTimeStep);

      for (let i = 0; i < dice.length; i++) {
        const die = dice[i];

        // Sync Three.js mesh to Cannon-ES body
        die.mesh.position.copy(die.body.position);
        die.mesh.quaternion.copy(die.body.quaternion);

        // Selection glow
        if (die.selected) {
          die.mesh.material.forEach(m => { m.emissive = new THREE.Color(0x3388ff); m.emissiveIntensity = 0.15; });
        } else {
          die.mesh.material.forEach(m => { m.emissiveIntensity = 0; });
        }

        // Update result label position
        if (die.settled && die.resultEl && die.resultEl.style.opacity !== '0') {
          const screenPos = worldToScreen(die.mesh.position);
          die.resultEl.style.left = screenPos.x + 'px';
          die.resultEl.style.top = (screenPos.y + 32) + 'px';
        }

        // Check settle
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

  // ── Apply physics settings from sliders ──
  function applySettings(newSettings) {
    Object.assign(settings, newSettings);

    // Update contact material
    if (contactMaterial) {
      contactMaterial.friction = settings.friction;
      contactMaterial.restitution = settings.restitution;
    }

    // Update existing dice
    dice.forEach(function (die) {
      die.body.linearDamping = settings.linearDamping;
      die.body.angularDamping = settings.angularDamping;
      die.body.mass = settings.density;
      die.body.updateMassProperties();
    });
  }

  // ── Apply skin settings ──
  function applySkin(newSkin) {
    Object.assign(skin, newSkin);

    // Rebuild textures for all existing dice
    dice.forEach(function (die) {
      const newMaterials = buildDieMaterials();
      // Dispose old materials
      if (Array.isArray(die.mesh.material)) {
        die.mesh.material.forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
      die.mesh.material = newMaterials;
    });
  }

  function getSkin() {
    return Object.assign({}, skin);
  }

  function getSettings() {
    return Object.assign({}, settings);
  }

  // ── Lighting control ──
  function setLighting(intensity) {
    lightingIntensity = intensity;
    if (ambientLight) ambientLight.intensity = 0.8 * intensity;
    if (dirLight) dirLight.intensity = 1.0 * intensity;
  }

  function getLighting() {
    return lightingIntensity;
  }

  return {
    init: init,
    addDie: addDie,
    removeLastDie: removeLastDie,
    applySettings: applySettings,
    getSettings: getSettings,
    applySkin: applySkin,
    getSkin: getSkin,
    setLighting: setLighting,
    getLighting: getLighting,
  };
})();

// Expose to global scope for app.js compatibility
window.DiceEngine = DiceEngine;

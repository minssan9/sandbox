// 3D 실시간 전투 화면: 2D 아이콘을 빌보드 스프라이트로 띄운 2.5D 렌더링
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MAP } from '../sim/combat.js';
import { FACTIONS } from '../data/factions.js';
import { iconCanvas } from './icons.js';

const SPRITE_SIZE = { small: 1.8, medium: 2.3, large: 2.8 };
const textures = new Map();

function iconTexture(factionId, type, team) {
  const key = `${factionId}:${type}:${team}`;
  if (!textures.has(key)) {
    const tex = new THREE.CanvasTexture(iconCanvas(factionId, type, team));
    tex.colorSpace = THREE.SRGBColorSpace;
    textures.set(key, tex);
  }
  return textures.get(key);
}

export function createBattleView(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9eef3');
  scene.fog = new THREE.Fog('#e9eef3', 140, 260);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const CAM_DIR = new THREE.Vector3(0, 0.8, 0.6).normalize();
  camera.position.copy(CAM_DIR).multiplyScalar(60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.minDistance = 15;
  controls.maxDistance = 160;
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight('#ffffff', '#b8c4d0', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 1.4);
  sun.position.set(20, 40, 15);
  sun.castShadow = true;
  sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
  sun.shadow.mapSize.set(2048, 1024);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP.halfX * 2 + 6, MAP.halfZ * 2 + 6),
    new THREE.MeshStandardMaterial({ color: '#f7f7f9', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(MAP.halfX * 2, 40, '#d4d9e0', '#e3e7ec');
  grid.scale.z = (MAP.halfZ * 2) / (MAP.halfX * 2);
  grid.position.y = 0.01;
  scene.add(grid);

  const views = new Map();
  const effects = [];
  const shadowGeo = new THREE.CircleGeometry(1, 24);
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.15 });

  function makeBar(width) {
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#1d1d1f', depthTest: false }));
    bg.center.set(0, 0.5);
    bg.scale.set(width, 0.14, 1);
    const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#34c759', depthTest: false }));
    fill.center.set(0, 0.5);
    fill.scale.set(width, 0.1, 1);
    const shield = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#5ac8fa', depthTest: false }));
    shield.center.set(0, 0.5);
    shield.scale.set(width, 0.1, 1);
    bg.renderOrder = fill.renderOrder = shield.renderOrder = 10;
    return { bg, fill, shield, width };
  }

  function createView(e) {
    const group = new THREE.Group();
    let height;
    if (e.kind === 'structure') {
      const color = FACTIONS[e.factionId].color;
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(e.radius, e.radius * 1.1, 1.6, e.factionId === 'ascendant' ? 4 : e.factionId === 'swarm' ? 10 : 6),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 }),
      );
      base.position.y = 0.8;
      base.castShadow = true;
      group.add(base);
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(e.factionId, 'hq', e.team) }));
      icon.scale.set(3, 3, 1);
      icon.position.y = 3.4;
      group.add(icon);
      height = 5.3;
    } else {
      const s = SPRITE_SIZE[e.size];
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(e.factionId, e.type, e.team) }));
      icon.scale.set(s, s, 1);
      icon.position.y = s / 2 + 0.1;
      group.add(icon);
      const sh = new THREE.Mesh(shadowGeo, shadowMat);
      sh.rotation.x = -Math.PI / 2;
      sh.scale.setScalar(e.radius * 1.1);
      sh.position.y = 0.02;
      group.add(sh);
      height = s + 0.35;
    }
    const bar = makeBar(e.kind === 'structure' ? 4 : 1.2);
    for (const b of [bar.bg, bar.fill, bar.shield]) { b.position.set(-bar.width / 2, height, 0); group.add(b); }
    bar.shield.position.y = height + 0.13;
    scene.add(group);
    return { group, bar, hasShield: e.maxShield > 0 };
  }

  function addShot(from, to, team) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, 0.9, from.z), new THREE.Vector3(to.x, 0.9, to.z),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: team === 0 ? '#0071e3' : '#ff3b30', transparent: true }));
    scene.add(line);
    effects.push({ obj: line, life: 0.12, max: 0.12 });
  }

  function addBurst(x, z) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 24),
      new THREE.MeshBasicMaterial({ color: '#ff9500', transparent: true, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.05, z);
    scene.add(ring);
    effects.push({ obj: ring, life: 0.5, max: 0.5, grow: true });
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // 맵 전체 폭(양쪽 본진)이 화면에 들어오도록 카메라 거리 맞춤
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (MAP.halfX + 4) / (halfTan * camera.aspect);
    const fitH = (MAP.halfZ + 6) / halfTan;
    const d = Math.min(150, Math.max(fitW, fitH));
    camera.position.copy(controls.target).addScaledVector(CAM_DIR, d);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const lastPos = new Map();

  return {
    render(world, dt) {
      const alive = new Set();
      for (const e of world.entities) {
        alive.add(e.id);
        let v = views.get(e.id);
        if (!v) { v = createView(e); views.set(e.id, v); }
        v.group.position.set(e.x, 0, e.z);
        v.bar.fill.scale.x = v.bar.width * Math.max(0, e.hp / e.maxHp);
        v.bar.fill.material.color.set(e.hp / e.maxHp > 0.5 ? '#34c759' : e.hp / e.maxHp > 0.25 ? '#ffcc00' : '#ff3b30');
        v.bar.shield.visible = v.hasShield;
        if (v.hasShield) v.bar.shield.scale.x = v.bar.width * Math.max(0, e.shield / e.maxShield);
        lastPos.set(e.id, { x: e.x, z: e.z, team: e.team });
      }
      for (const ev of world.events) {
        if (ev.type === 'shot' && ev.ranged) {
          const a = lastPos.get(ev.from), b = lastPos.get(ev.to);
          if (a && b) addShot(a, b, a.team);
        } else if (ev.type === 'death') {
          const p = lastPos.get(ev.id);
          if (p) addBurst(p.x, p.z);
        }
      }
      for (const [id, v] of views) {
        if (!alive.has(id)) { scene.remove(v.group); views.delete(id); lastPos.delete(id); }
      }
      for (let i = effects.length - 1; i >= 0; i--) {
        const fx = effects[i];
        fx.life -= dt;
        fx.obj.material.opacity = Math.max(0, fx.life / fx.max);
        if (fx.grow) fx.obj.scale.setScalar(1 + (1 - fx.life / fx.max) * 3);
        if (fx.life <= 0) { scene.remove(fx.obj); fx.obj.geometry.dispose(); fx.obj.material.dispose(); effects.splice(i, 1); }
      }
      controls.update();
      renderer.render(scene, camera);
    },
  };
}

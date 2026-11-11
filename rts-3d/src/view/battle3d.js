// 3D 실시간 전투 화면: 2D 아이콘을 빌보드 스프라이트로 띄운 2.5D 렌더링 + 유닛 직접 조작
//
// 조작
//   좌클릭 / 드래그      유닛 선택 (Shift: 추가 선택)
//   우클릭 땅 / 적       이동 / 집중 공격   (Shift+우클릭 땅: 공격 이동)
//   A → 좌클릭           공격 이동
//   S                    정지(그 자리 방어)
//   Ctrl+A               전체 선택
//   휠 / 가운데 드래그    확대·축소 / 회전,  방향키: 화면 이동
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MAP } from '../sim/combat.js';
import { FACTIONS } from '../data/factions.js';
import { iconCanvas } from './icons.js';

const SPRITE_SIZE = { small: 1.8, medium: 2.3, large: 2.8 };
const PICK_PX = 28;
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

/**
 * @param {HTMLElement} container
 * @param {{ playerTeam: number, onCommand: (cmd: object) => void, onSelect?: (ids: number[]) => void }} opts
 */
export function createBattleView(container, { playerTeam = 0, onCommand, onSelect } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  const dom = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9eef3');
  scene.fog = new THREE.Fog('#e9eef3', 140, 260);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  const CAM_DIR = new THREE.Vector3(0, 0.8, 0.6).normalize();
  const controls = new OrbitControls(camera, dom);
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: null };
  controls.listenToKeyEvents(window);
  controls.keyPanSpeed = 20;
  controls.maxPolarAngle = Math.PI * 0.42;
  controls.minDistance = 12;
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
  const selGeo = new THREE.RingGeometry(1, 1.15, 32);
  const selMat = new THREE.MeshBasicMaterial({ color: '#34c759', side: THREE.DoubleSide });

  // ---------- 엔티티 뷰 ----------
  function makeBar(width) {
    const mk = (color, h) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false }));
      s.center.set(0, 0.5);
      s.scale.set(width, h, 1);
      s.renderOrder = 10;
      return s;
    };
    return { bg: mk('#1d1d1f', 0.14), fill: mk('#34c759', 0.1), shield: mk('#5ac8fa', 0.1), width };
  }

  function createView(e) {
    const group = new THREE.Group();
    let height;
    if (e.kind === 'structure') {
      const color = FACTIONS[e.factionId].color;
      const sides = e.factionId === 'ascendant' ? 4 : e.factionId === 'swarm' ? 10 : 6;
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(e.radius, e.radius * 1.1, 1.6, sides),
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
    const sel = new THREE.Mesh(selGeo, selMat);
    sel.rotation.x = -Math.PI / 2;
    sel.position.y = 0.04;
    sel.scale.setScalar(e.radius + 0.35);
    sel.visible = false;
    group.add(sel);

    const bar = makeBar(e.kind === 'structure' ? 4 : 1.2);
    for (const b of [bar.bg, bar.fill, bar.shield]) { b.position.set(-bar.width / 2, height, 0); group.add(b); }
    bar.shield.position.y = height + 0.13;
    scene.add(group);
    return { group, bar, sel, hasShield: e.maxShield > 0 };
  }

  // ---------- 이펙트 ----------
  function addEffect(obj, life, grow = false) {
    scene.add(obj);
    effects.push({ obj, life, max: life, grow });
  }

  function addShot(from, to, team) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, 0.9, from.z), new THREE.Vector3(to.x, 0.9, to.z),
    ]);
    addEffect(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: team === 0 ? '#0071e3' : '#ff3b30', transparent: true })), 0.12);
  }

  function addRing(x, z, color, life = 0.5) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.05, z);
    addEffect(ring, life, true);
  }

  // ---------- 선택 & 명령 ----------
  let lastWorld = null;
  let selected = new Set();
  let attackMoveArmed = false;

  const box = document.createElement('div');
  box.className = 'selbox hidden';
  container.appendChild(box);

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function ndc(ev) {
    const r = dom.getBoundingClientRect();
    return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  }
  function groundPoint(ev) {
    raycaster.setFromCamera(ndc(ev), camera);
    const p = new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane, p) ? p : null;
  }
  function screenPos(e) {
    const r = dom.getBoundingClientRect();
    const v = new THREE.Vector3(e.x, 0.8, e.z).project(camera);
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }
  function pick(ev, filter) {
    if (!lastWorld) return null;
    let best = null, bestD = Infinity;
    for (const e of lastWorld.entities) {
      if (!filter(e)) continue;
      const s = screenPos(e);
      const d = Math.hypot(s.x - ev.clientX, s.y - ev.clientY);
      const limit = e.kind === 'structure' ? PICK_PX * 2.5 : PICK_PX;
      if (d < limit && d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  const isMine = (e) => e.team === playerTeam && e.kind === 'unit';
  const setSelection = (ids) => { selected = new Set(ids); onSelect?.([...selected]); };
  const selectedIds = () => [...selected];

  function issue(cmd) {
    const ids = selectedIds();
    if (!ids.length) return;
    onCommand({ ...cmd, ids });
  }

  let drag = null;
  dom.addEventListener('contextmenu', (ev) => ev.preventDefault());
  dom.addEventListener('pointerdown', (ev) => {
    if (ev.button === 0) {
      if (attackMoveArmed) {
        attackMoveArmed = false;
        container.classList.remove('armed');
        const p = groundPoint(ev);
        if (p) { issue({ mode: 'attack', x: p.x, z: p.z }); addRing(p.x, p.z, '#ff3b30'); }
        return;
      }
      drag = { x: ev.clientX, y: ev.clientY, shift: ev.shiftKey };
      dom.setPointerCapture(ev.pointerId);
    } else if (ev.button === 2) {
      const enemy = pick(ev, (e) => e.team !== playerTeam);
      if (enemy) {
        issue({ mode: 'target', targetId: enemy.id });
        addRing(enemy.x, enemy.z, '#ff3b30');
        return;
      }
      const p = groundPoint(ev);
      if (!p) return;
      const mode = ev.shiftKey ? 'attack' : 'move';
      issue({ mode, x: p.x, z: p.z });
      addRing(p.x, p.z, mode === 'attack' ? '#ff3b30' : '#34c759');
    }
  });
  dom.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const r = container.getBoundingClientRect();
    const x0 = Math.min(drag.x, ev.clientX), y0 = Math.min(drag.y, ev.clientY);
    const w = Math.abs(ev.clientX - drag.x), h = Math.abs(ev.clientY - drag.y);
    if (w + h < 6) return;
    box.classList.remove('hidden');
    Object.assign(box.style, { left: `${x0 - r.left}px`, top: `${y0 - r.top}px`, width: `${w}px`, height: `${h}px` });
  });
  dom.addEventListener('pointerup', (ev) => {
    if (!drag || ev.button !== 0) return;
    const d = drag;
    drag = null;
    box.classList.add('hidden');
    const base = d.shift ? selectedIds() : [];
    const w = Math.abs(ev.clientX - d.x), h = Math.abs(ev.clientY - d.y);
    if (w + h < 6) {
      const u = pick(ev, isMine);
      setSelection(u ? [...base, u.id] : base);
      return;
    }
    const x0 = Math.min(d.x, ev.clientX), x1 = Math.max(d.x, ev.clientX);
    const y0 = Math.min(d.y, ev.clientY), y1 = Math.max(d.y, ev.clientY);
    const inBox = lastWorld.entities.filter(isMine).filter((e) => {
      const s = screenPos(e);
      return s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1;
    });
    setSelection([...base, ...inBox.map((e) => e.id)]);
  });

  let active = true;
  window.addEventListener('keydown', (ev) => {
    if (!active) return;
    const k = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && k === 'a') {
      ev.preventDefault();
      api.selectAll();
    } else if (k === 'a' && selected.size) {
      attackMoveArmed = true;
      container.classList.add('armed');
    } else if (k === 's') {
      issue({ mode: 'hold' });
    } else if (k === 'escape') {
      attackMoveArmed = false;
      container.classList.remove('armed');
      setSelection([]);
    }
  });

  // ---------- 카메라 ----------
  function fitDistance() {
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (MAP.halfX + 4) / (halfTan * camera.aspect);
    const fitH = (MAP.halfZ + 6) / halfTan;
    return Math.min(150, Math.max(fitW, fitH));
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  camera.position.copy(CAM_DIR).multiplyScalar(fitDistance());

  const lastPos = new Map();

  const api = {
    setActive(v) { active = v; },
    /** 지정 지점으로 카메라 이동. zoom=true면 전투 시점(근접)으로 */
    focus(x, z, zoom = true) {
      const offset = camera.position.clone().sub(controls.target);
      const d = zoom ? 34 : fitDistance();
      controls.target.set(x, 0, z);
      camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(d));
    },
    overview() { api.focus(0, 0, false); },
    selectAll() {
      if (lastWorld) setSelection(lastWorld.entities.filter(isMine).map((e) => e.id));
    },
    selected: selectedIds,

    render(world, dt) {
      lastWorld = world;
      const alive = new Set();
      for (const e of world.entities) {
        alive.add(e.id);
        let v = views.get(e.id);
        if (!v) { v = createView(e); views.set(e.id, v); }
        v.group.position.set(e.x, 0, e.z);
        const k = Math.max(0, e.hp / e.maxHp);
        v.bar.fill.scale.x = v.bar.width * k;
        v.bar.fill.material.color.set(k > 0.5 ? '#34c759' : k > 0.25 ? '#ffcc00' : '#ff3b30');
        v.bar.shield.visible = v.hasShield;
        if (v.hasShield) v.bar.shield.scale.x = v.bar.width * Math.max(0, e.shield / e.maxShield);
        v.sel.visible = selected.has(e.id);
        lastPos.set(e.id, { x: e.x, z: e.z, team: e.team });
      }
      for (const ev of world.events) {
        if (ev.type === 'shot' && ev.ranged) {
          const a = lastPos.get(ev.from), b = lastPos.get(ev.to);
          if (a && b) addShot(a, b, a.team);
        } else if (ev.type === 'death') {
          const p = lastPos.get(ev.id);
          if (p) addRing(p.x, p.z, '#ff9500');
        }
      }
      for (const [id, v] of views) {
        if (!alive.has(id)) { scene.remove(v.group); views.delete(id); lastPos.delete(id); }
      }
      if ([...selected].some((id) => !alive.has(id))) {
        setSelection([...selected].filter((id) => alive.has(id)));
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
  return api;
}

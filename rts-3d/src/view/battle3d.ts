// 3D 전투 화면 (Three.js)
//
// 두 가지 시점
//  1) 1인칭 빙의(FPS): 아군 유닛 하나에 들어가 직접 조종
//     WASD 이동 · 마우스 조준 · 좌클릭(누르고 있기) 사격 · 1~9 유닛 전환 · V 전술 시점 · Esc 마우스 해제
//  2) 전술 시점: 위에서 내려다보며 지휘
//     좌클릭/드래그 선택 · 우클릭 이동/집중 공격 · Shift+우클릭·A 공격 이동 · S 정지 · Ctrl+A 전체 선택 · V 선택 유닛 빙의
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MAP } from '../sim/combat.ts';
import type { Command, Entity } from '../sim/combat.ts';
import type { ViewWorld as World } from '../session/session.ts';
import { FACTIONS } from '../data/factions.ts';
import type { FactionId, Size, Team } from '../types.ts';
import { iconCanvas } from './icons.ts';

const SPRITE_SIZE: Record<Size, number> = { small: 1.8, medium: 2.3, large: 2.8 };
const EYE_HEIGHT: Record<Size, number> = { small: 1.4, medium: 1.7, large: 2.1 };
const PICK_PX = 28;
const MOUSE_SENS = 0.0022;
const MAX_MOUSE_DELTA = 200;
const MAX_PITCH = 0.9;

const textures = new Map<string, THREE.CanvasTexture>();
function iconTexture(factionId: FactionId, type: string, team: Team): THREE.CanvasTexture {
  const key = `${factionId}:${type}:${team}`;
  let tex = textures.get(key);
  if (!tex) {
    tex = new THREE.CanvasTexture(iconCanvas(factionId, type, team));
    tex.colorSpace = THREE.SRGBColorSpace;
    textures.set(key, tex);
  }
  return tex;
}

interface Bar { bg: THREE.Sprite; fill: THREE.Sprite; shield: THREE.Sprite; width: number }
interface EntityView { group: THREE.Group; bar: Bar; sel: THREE.Mesh; hasShield: boolean; aimHeight: number; aimRadius: number }
interface Effect { obj: THREE.Mesh | THREE.Line; life: number; max: number; grow: boolean }

export type CommandWithIds = Command & { ids: number[] };

export interface FpsInput { dx: number; dz: number; firing: boolean; active: boolean }

export interface BattleViewOptions {
  playerTeam: Team;
  onCommand: (cmd: CommandWithIds) => void;
  onSelect?: (ids: number[]) => void;
  /** 빙의 대상이 바뀜 (null이면 전술 시점) */
  onPossess: (prevId: number | null, nextId: number | null) => void;
}

export interface BattleView {
  setActive(v: boolean): void;
  focus(x: number, z: number, zoom?: boolean): void;
  overview(): void;
  selectAll(): void;
  selected(): number[];
  possess(id: number): void;
  release(): void;
  possessedId(): number | null;
  /** 현재 조준 중인 적 (1인칭) */
  aimTarget(): Entity | null;
  fpsInput(): FpsInput;
  /** 사격 결과 피드백 */
  feedback(kind: 'hit' | 'cooldown' | 'out_of_range' | 'no_target'): void;
  render(world: World, dt: number): void;
}

export function createBattleView(container: HTMLElement, opts: BattleViewOptions): BattleView {
  const { playerTeam, onCommand, onSelect, onPossess } = opts;
  /** 아군 0 / 적 1 (아이콘 테두리·사격 색상용) */
  const rel = (team: Team): Team => (team === playerTeam ? 0 : 1);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  const dom = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9eef3');
  scene.fog = new THREE.Fog('#e9eef3', 140, 260);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  camera.rotation.order = 'YXZ';
  const CAM_DIR = new THREE.Vector3(0, 0.8, 0.6).normalize();
  const controls = new OrbitControls(camera, dom);
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: null } as unknown as typeof controls.mouseButtons;
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
  Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 30, bottom: -30 });
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
  // 1인칭에서 맵 경계가 보이도록 낮은 벽
  const wallMat = new THREE.MeshStandardMaterial({ color: '#d8dde4', roughness: 1 });
  for (const [w, d, x, z] of [
    [MAP.halfX * 2 + 2, 0.6, 0, -MAP.halfZ - 1], [MAP.halfX * 2 + 2, 0.6, 0, MAP.halfZ + 1],
    [0.6, MAP.halfZ * 2 + 2, -MAP.halfX - 1, 0], [0.6, MAP.halfZ * 2 + 2, MAP.halfX + 1, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), wallMat);
    wall.position.set(x, 0.6, z);
    scene.add(wall);
  }

  const views = new Map<number, EntityView>();
  const effects: Effect[] = [];
  const shadowGeo = new THREE.CircleGeometry(1, 24);
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.15 });
  const selGeo = new THREE.RingGeometry(1, 1.15, 32);
  const selMat = new THREE.MeshBasicMaterial({ color: '#34c759', side: THREE.DoubleSide });

  // ---------- 엔티티 뷰 ----------
  function makeBar(width: number): Bar {
    const mk = (color: string, h: number) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false }));
      s.center.set(0, 0.5);
      s.scale.set(width, h, 1);
      s.renderOrder = 10;
      return s;
    };
    return { bg: mk('#1d1d1f', 0.14), fill: mk('#34c759', 0.1), shield: mk('#5ac8fa', 0.1), width };
  }

  function createView(e: Entity): EntityView {
    const group = new THREE.Group();
    let height: number;
    let aimHeight: number;
    let aimRadius: number;
    if (e.kind === 'structure') {
      const sides = e.factionId === 'ascendant' ? 4 : e.factionId === 'swarm' ? 10 : 6;
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(e.radius, e.radius * 1.1, 1.6, sides),
        new THREE.MeshStandardMaterial({ color: FACTIONS[e.factionId].color, roughness: 0.5, metalness: 0.1 }),
      );
      base.position.y = 0.8;
      base.castShadow = true;
      group.add(base);
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(e.factionId, 'hq', rel(e.team)) }));
      icon.scale.set(3, 3, 1);
      icon.position.y = 3.4;
      group.add(icon);
      height = 5.3;
      aimHeight = 1.6;
      aimRadius = e.radius + 0.6;
    } else {
      const s = SPRITE_SIZE[e.size];
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(e.factionId, e.type, rel(e.team)) }));
      icon.scale.set(s, s, 1);
      icon.position.y = s / 2 + 0.1;
      group.add(icon);
      const sh = new THREE.Mesh(shadowGeo, shadowMat);
      sh.rotation.x = -Math.PI / 2;
      sh.scale.setScalar(e.radius * 1.1);
      sh.position.y = 0.02;
      group.add(sh);
      height = s + 0.35;
      aimHeight = s / 2 + 0.1;
      aimRadius = s * 0.45;
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
    return { group, bar, sel, hasShield: e.maxShield > 0, aimHeight, aimRadius };
  }

  // ---------- 이펙트 ----------
  function addEffect(obj: Effect['obj'], life: number, grow = false): void {
    scene.add(obj);
    effects.push({ obj, life, max: life, grow });
  }
  function addShot(from: THREE.Vector3, to: THREE.Vector3, color: string): void {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    addEffect(new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true })), 0.12);
  }
  function addRing(x: number, z: number, color: string, life = 0.5): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.05, z);
    addEffect(ring, life, true);
  }

  // ---------- 공통 상태 ----------
  let lastWorld: World | null = null;
  let active = true;
  let selected = new Set<number>();
  let attackMoveArmed = false;
  let possessed: number | null = null;
  let aim: Entity | null = null;

  const isMine = (e: Entity) => e.team === playerTeam && e.kind === 'unit';
  const myUnits = () => (lastWorld?.entities.filter(isMine) ?? []).sort((a, b) => a.id - b.id);
  const setSelection = (ids: number[]) => { selected = new Set(ids); onSelect?.([...selected]); };
  const selectedIds = () => [...selected];
  const findEntity = (id: number | null) => (id == null ? undefined : lastWorld?.entities.find((e) => e.id === id));

  // ---------- 1인칭 HUD ----------
  container.insertAdjacentHTML('beforeend', `
    <div class="fps-hud hidden">
      <div class="crosshair"></div>
      <div class="aim-info hidden"></div>
      <div class="lock-hint">클릭하여 조준 시작</div>
      <div class="unit-card">
        <b class="u-name"></b>
        <div class="meter shield"><i></i></div>
        <div class="meter hp"><i></i></div>
        <div class="meter cd"><i></i></div>
        <small>WASD 이동 · 마우스 조준 · 좌클릭 사격 · 1~9 유닛 전환 · V 전술 시점 · Esc 마우스 해제</small>
      </div>
    </div>`);
  const hud = container.querySelector<HTMLElement>('.fps-hud')!;
  const hq = <T extends HTMLElement = HTMLElement>(s: string) => hud.querySelector<T>(s)!;
  const crosshair = hq('.crosshair');
  const aimInfo = hq('.aim-info');
  const lockHint = hq('.lock-hint');

  let yaw = 0;
  let pitch = 0;
  const keys = new Set<string>();
  let firing = false;
  let feedbackTimer = 0;

  const locked = () => document.pointerLockElement === dom;

  function enterFps(e: Entity): void {
    const prev = possessed;
    possessed = e.id;
    yaw = e.team === 0 ? -Math.PI / 2 : Math.PI / 2; // 적 본진 방향
    pitch = -0.05;
    container.classList.add('fps');
    hud.classList.remove('hidden');
    controls.enabled = false;
    attackMoveArmed = false;
    container.classList.remove('armed');
    camera.fov = 70;
    camera.updateProjectionMatrix();
    hq('.u-name').textContent = `${e.name} · ${FACTIONS[e.factionId].name}`;
    onPossess(prev, e.id);
  }

  function exitFps(): void {
    if (possessed == null) return;
    const prev = possessed;
    const e = findEntity(prev);
    possessed = null;
    firing = false;
    keys.clear();
    if (locked()) document.exitPointerLock();
    container.classList.remove('fps');
    hud.classList.add('hidden');
    controls.enabled = true;
    camera.fov = 45;
    camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0);
    const pos = e ?? { x: camera.position.x, z: camera.position.z };
    // 1인칭 방향이 남지 않도록 기본 전술 각도로 재설정
    controls.target.set(pos.x, 0, pos.z);
    camera.position.copy(controls.target).addScaledVector(CAM_DIR, 34);
    camera.lookAt(controls.target);
    onPossess(prev, null);
  }

  function switchFps(e: Entity): void {
    const prev = possessed;
    possessed = e.id;
    hq('.u-name').textContent = `${e.name} · ${FACTIONS[e.factionId].name}`;
    onPossess(prev, e.id);
  }

  // 조준: 카메라 정면 광선과 적 구체 충돌
  const ray = new THREE.Ray();
  const sphere = new THREE.Sphere();
  const hitPoint = new THREE.Vector3();
  function computeAim(world: World): Entity | null {
    camera.getWorldDirection(ray.direction);
    ray.origin.copy(camera.position);
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const e of world.entities) {
      if (e.team === playerTeam) continue;
      const v = views.get(e.id);
      if (!v) continue;
      sphere.set(new THREE.Vector3(e.x, v.aimHeight, e.z), v.aimRadius);
      if (!ray.intersectSphere(sphere, hitPoint)) continue;
      const d = hitPoint.distanceTo(ray.origin);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  // ---------- 전술 시점 입력 ----------
  const box = document.createElement('div');
  box.className = 'selbox hidden';
  container.appendChild(box);

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function ndc(ev: MouseEvent): THREE.Vector2 {
    const r = dom.getBoundingClientRect();
    return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  }
  function groundPoint(ev: MouseEvent): THREE.Vector3 | null {
    raycaster.setFromCamera(ndc(ev), camera);
    return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
  }
  function screenPos(e: Entity): { x: number; y: number } {
    const r = dom.getBoundingClientRect();
    const v = new THREE.Vector3(e.x, 0.8, e.z).project(camera);
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }
  function pick(ev: MouseEvent, filter: (e: Entity) => boolean): Entity | null {
    if (!lastWorld) return null;
    let best: Entity | null = null, bestD = Infinity;
    for (const e of lastWorld.entities) {
      if (!filter(e)) continue;
      const s = screenPos(e);
      const d = Math.hypot(s.x - ev.clientX, s.y - ev.clientY);
      const limit = e.kind === 'structure' ? PICK_PX * 2.5 : PICK_PX;
      if (d < limit && d < bestD) { best = e; bestD = d; }
    }
    return best;
  }
  function issue(cmd: Command): void {
    const ids = selectedIds();
    if (ids.length) onCommand({ ...cmd, ids });
  }

  let drag: { x: number; y: number; shift: boolean } | null = null;
  dom.addEventListener('contextmenu', (ev) => ev.preventDefault());
  dom.addEventListener('pointerdown', (ev) => {
    if (possessed != null) {
      if (!locked()) { dom.requestPointerLock(); return; }
      if (ev.button === 0) firing = true;
      return;
    }
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
  window.addEventListener('pointerup', (ev) => {
    if (ev.button === 0) firing = false;
  });
  dom.addEventListener('pointermove', (ev) => {
    if (possessed != null) {
      if (!locked()) return;
      // 포인터 잠금 직후 브라우저가 보내는 비정상적으로 큰 이동값은 무시
      if (Math.abs(ev.movementX) > MAX_MOUSE_DELTA || Math.abs(ev.movementY) > MAX_MOUSE_DELTA) return;
      yaw -= ev.movementX * MOUSE_SENS;
      pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch - ev.movementY * MOUSE_SENS));
      return;
    }
    if (!drag) return;
    const r = container.getBoundingClientRect();
    const x0 = Math.min(drag.x, ev.clientX), y0 = Math.min(drag.y, ev.clientY);
    const w = Math.abs(ev.clientX - drag.x), h = Math.abs(ev.clientY - drag.y);
    if (w + h < 6) return;
    box.classList.remove('hidden');
    Object.assign(box.style, { left: `${x0 - r.left}px`, top: `${y0 - r.top}px`, width: `${w}px`, height: `${h}px` });
  });
  dom.addEventListener('pointerup', (ev) => {
    if (!drag || ev.button !== 0 || !lastWorld) return;
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
  document.addEventListener('pointerlockchange', () => {
    lockHint.classList.toggle('hidden', locked());
    if (!locked()) firing = false;
  });

  window.addEventListener('keydown', (ev) => {
    if (!active) return;
    const k = ev.key.toLowerCase();
    if (k >= '1' && k <= '9') {
      const u = myUnits()[Number(k) - 1];
      if (u) api.possess(u.id);
      return;
    }
    if (k === 'v') {
      if (possessed != null) exitFps();
      else {
        const u = findEntity(selectedIds()[0]) ?? myUnits()[0];
        if (u) api.possess(u.id);
      }
      return;
    }
    if (possessed != null) {
      if (['w', 'a', 's', 'd'].includes(k)) { keys.add(k); ev.preventDefault(); }
      return;
    }
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
  window.addEventListener('keyup', (ev) => keys.delete(ev.key.toLowerCase()));

  // ---------- 카메라 ----------
  function fitDistance(): number {
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitW = (MAP.halfX + 4) / (halfTan * camera.aspect);
    const fitH = (MAP.halfZ + 6) / halfTan;
    return Math.min(150, Math.max(fitW, fitH));
  }
  function resize(): void {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  camera.position.copy(CAM_DIR).multiplyScalar(fitDistance());

  function updateFpsHud(e: Entity, dt: number): void {
    const setMeter = (sel: string, k: number) => { hq(`.meter.${sel} i`).style.width = `${Math.max(0, Math.min(1, k)) * 100}%`; };
    setMeter('hp', e.hp / e.maxHp);
    hq('.meter.shield').classList.toggle('hidden', e.maxShield <= 0);
    if (e.maxShield > 0) setMeter('shield', e.shield / e.maxShield);
    setMeter('cd', e.attack ? 1 - e.cooldownLeft / e.attack.cooldown : 0);

    const inRange = aim && e.attack
      ? Math.hypot(aim.x - e.x, aim.z - e.z) <= e.attack.range + e.radius + aim.radius
      : false;
    crosshair.classList.toggle('on-target', !!aim && inRange);
    crosshair.classList.toggle('far', !!aim && !inRange);
    if (aim) {
      aimInfo.classList.remove('hidden');
      const sh = aim.maxShield > 0 ? ` · 실드 ${Math.ceil(aim.shield)}` : '';
      aimInfo.textContent = `${aim.name}  HP ${Math.ceil(aim.hp)}${sh}${inRange ? '' : ' · 사거리 밖'}`;
    } else {
      aimInfo.classList.add('hidden');
    }
    if (feedbackTimer > 0 && (feedbackTimer -= dt) <= 0) crosshair.classList.remove('hit', 'miss');
  }

  const lastPos = new Map<number, { x: number; z: number; team: Team; h: number }>();

  const api: BattleView = {
    setActive(v) {
      active = v;
      if (!v) exitFps();
    },
    focus(x, z, zoom = true) {
      const offset = camera.position.clone().sub(controls.target);
      if (offset.lengthSq() < 1e-6 || offset.y <= 0) offset.copy(CAM_DIR);
      const d = zoom ? 34 : fitDistance();
      controls.target.set(x, 0, z);
      camera.position.copy(controls.target).add(offset.normalize().multiplyScalar(d));
      camera.lookAt(controls.target);
    },
    overview() { api.focus(0, 0, false); },
    selectAll() { setSelection(myUnits().map((e) => e.id)); },
    selected: selectedIds,
    possess(id) {
      const e = findEntity(id);
      if (!e || !isMine(e)) return;
      if (possessed == null) enterFps(e);
      else if (possessed !== id) switchFps(e);
    },
    release: exitFps,
    possessedId: () => possessed,
    aimTarget: () => aim,
    fpsInput() {
      if (possessed == null) return { dx: 0, dz: 0, firing: false, active: false };
      const f = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0);
      const r = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
      // forward = (-sin yaw, -cos yaw), right = (cos yaw, -sin yaw)
      const dx = -Math.sin(yaw) * f + Math.cos(yaw) * r;
      const dz = -Math.cos(yaw) * f - Math.sin(yaw) * r;
      return { dx, dz, firing, active: f !== 0 || r !== 0 || firing };
    },
    feedback(kind) {
      crosshair.classList.remove('hit', 'miss');
      if (kind === 'hit') crosshair.classList.add('hit');
      else if (kind === 'out_of_range') crosshair.classList.add('miss');
      feedbackTimer = 0.15;
    },

    render(world, dt) {
      lastWorld = world;
      const alive = new Set<number>();
      for (const e of world.entities) {
        alive.add(e.id);
        let v = views.get(e.id);
        if (!v) { v = createView(e); views.set(e.id, v); }
        v.group.position.set(e.x, 0, e.z);
        v.group.visible = e.id !== possessed; // 내 몸은 숨김
        const k = Math.max(0, e.hp / e.maxHp);
        v.bar.fill.scale.x = v.bar.width * k;
        v.bar.fill.material.color.set(k > 0.5 ? '#34c759' : k > 0.25 ? '#ffcc00' : '#ff3b30');
        v.bar.shield.visible = v.hasShield;
        if (v.hasShield) v.bar.shield.scale.x = v.bar.width * Math.max(0, e.shield / e.maxShield);
        v.sel.visible = possessed == null && selected.has(e.id);
        lastPos.set(e.id, { x: e.x, z: e.z, team: e.team, h: v.aimHeight });
      }

      // 빙의 유닛이 죽으면 가장 가까운 아군으로 자동 전환, 없으면 전술 시점
      if (possessed != null && !alive.has(possessed)) {
        const p = lastPos.get(possessed);
        const next = myUnits().sort((a, b) =>
          Math.hypot(a.x - (p?.x ?? 0), a.z - (p?.z ?? 0)) - Math.hypot(b.x - (p?.x ?? 0), b.z - (p?.z ?? 0)))[0];
        if (next) switchFps(next);
        else exitFps();
      }

      for (const ev of world.events) {
        if (ev.type === 'shot' && (ev.ranged || ev.from === possessed)) {
          const a = lastPos.get(ev.from), b = lastPos.get(ev.to);
          if (!a || !b) continue;
          const from = ev.from === possessed
            ? camera.position.clone().add(new THREE.Vector3(0, -0.35, 0))
            : new THREE.Vector3(a.x, 0.9, a.z);
          addShot(from, new THREE.Vector3(b.x, b.h, b.z), a.team === playerTeam ? '#0071e3' : '#ff3b30');
        } else if (ev.type === 'death') {
          const p = lastPos.get(ev.id);
          if (p) addRing(p.x, p.z, '#ff9500');
        }
      }
      for (const [id, v] of views) {
        if (!alive.has(id)) { scene.remove(v.group); views.delete(id); lastPos.delete(id); }
      }
      if ([...selected].some((id) => !alive.has(id))) setSelection([...selected].filter((id) => alive.has(id)));

      for (let i = effects.length - 1; i >= 0; i--) {
        const fx = effects[i];
        fx.life -= dt;
        (fx.obj.material as THREE.Material).opacity = Math.max(0, fx.life / fx.max);
        if (fx.grow) fx.obj.scale.setScalar(1 + (1 - fx.life / fx.max) * 3);
        if (fx.life <= 0) {
          scene.remove(fx.obj);
          fx.obj.geometry.dispose();
          (fx.obj.material as THREE.Material).dispose();
          effects.splice(i, 1);
        }
      }

      const me = findEntity(possessed);
      if (me) {
        camera.position.set(me.x, EYE_HEIGHT[me.size], me.z);
        camera.rotation.set(pitch, yaw, 0);
        aim = computeAim(world);
        updateFpsHud(me, dt);
      } else {
        aim = null;
        controls.update();
      }
      renderer.render(scene, camera);
    },
  };
  return api;
}

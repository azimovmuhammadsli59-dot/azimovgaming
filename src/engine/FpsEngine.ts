import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraPerspective,
  DifficultyLevel,
  GameDefinition,
  GraphicsQuality,
  HudSnapshot,
  WeaponId,
} from '../types/game';
import { WEAPONS } from '../games/weapons';
import { audioEngine } from './AudioEngine';
import { createActorMesh, createTargetProp, createViewModelWeapon } from './EntityFactory';
import { AabbCollider, buildGameMap, BuiltMap } from './MapBuilder';
import { createContactShadowTexture } from './ProceduralTextures';

// Pre-allocated math helpers at module scope (zero GC in loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

interface ActiveParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  isSmoke: boolean;
}

interface ActiveTracer {
  mesh: THREE.Mesh;
  life: number;
}

interface AiActor {
  id: number;
  role: 'enemy' | 'ally' | 'hostage' | 'helperBot';
  group: THREE.Group;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  hitTarget: THREE.Mesh;
  hp: number;
  maxHp: number;
  alive: boolean;
  rescued?: boolean;
  following?: boolean;
  activated?: boolean;
  respawnTimer: number;
  fireCooldown: number;
  patrolTarget: THREE.Vector3;
  walkPhase: number;
}

interface WorldTarget {
  id: number;
  group: THREE.Group;
  hitTarget: THREE.Mesh;
  active: boolean;
  colorKey: string;
  colorUz: string;
  basePos: THREE.Vector3;
  phase: number;
  respawnTimer: number;
  kind: 'ring' | 'fruit' | 'crystal' | 'star' | 'checkpoint' | 'bomb' | 'flag' | 'meteor';
}

const COLOR_CHOICES = [
  { key: 'red', hex: '#ef4444', uz: 'QIZIL' },
  { key: 'blue', hex: '#38bdf8', uz: 'KO‘K' },
  { key: 'yellow', hex: '#facc15', uz: 'SARIQ' },
  { key: 'green', hex: '#22c55e', uz: 'YASHIL' },
];

export interface FpsEngineConfig {
  container: HTMLElement;
  game: GameDefinition;
  quality: GraphicsQuality;
  difficulty: DifficultyLevel;
  sensitivity: number;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameEnd: (won: boolean, score: number, reason: string) => void;
}

export class FpsEngine {
  private container: HTMLElement;
  private game: GameDefinition;
  private quality: GraphicsQuality;
  private difficulty: DifficultyLevel;
  private sensitivity: number;
  private onHudUpdate: (s: HudSnapshot) => void;
  private onGameEnd: (won: boolean, score: number, reason: string) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private isSoftwareGl = false;
  private builtMap!: BuiltMap;
  private shadowTex!: THREE.CanvasTexture;

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Player state
  private playerPos = new THREE.Vector3();
  private playerVel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private isGrounded = true;
  private isCrouching = false;
  private isSprinting = false;
  private currentEyeHeight = 1.7;
  private health = 100;
  private maxHealth = 100;
  private armor = 100;
  private maxArmor = 100;
  private cameraMode: CameraPerspective;
  private playerAvatarGroup: THREE.Group | null = null;

  // Weapons & Viewmodel
  private weaponIndex = 0;
  private currentWeaponId: WeaponId;
  private ammo = 30;
  private reserveAmmo = 120;
  private reloading = false;
  private reloadTimer = 0;
  private fireCooldown = 0;
  private recoilPitch = 0;
  private recoilKickZ = 0;
  private muzzleFlashTimer = 0;
  private isScoped = false;
  private viewModels = new Map<
    WeaponId,
    { group: THREE.Group; muzzlePoint: THREE.Object3D; muzzleFlash: THREE.Mesh }
  >();
  private muzzleLight!: THREE.PointLight;

  // Match / Mission state
  private score = 0;
  private kills = 0;
  private deaths = 0;
  private goalProgress = 0;
  private timeRemaining = 120;
  private round = 1;
  private roundsWon = 0;
  private status: 'playing' | 'won' | 'lost' = 'playing';
  private endReason = '';
  private isPaused = false;
  private isPointerLocked = false;
  private bombState: 'none' | 'carried' | 'planted' | 'defused' | 'exploded' = 'none';
  private bombTimer = 40;
  private bombBeepTimer = 0;
  private defuseHoldProgress = 0;
  private carryingFlag = false;
  private targetColorObj = COLOR_CHOICES[0];

  // Dynamic entities
  private actors: AiActor[] = [];
  private targets: WorldTarget[] = [];
  private particles: ActiveParticle[] = [];
  private tracers: ActiveTracer[] = [];
  private bombProp: THREE.Group | null = null;
  private enemyFlagProp: THREE.Group | null = null;
  private killFeed: Array<{ id: number; text: string; color: string }> = [];
  private feedCounter = 1;
  private hitMarkerAt = 0;
  private damageFlashAt = 0;
  private footstepTimer = 0;
  private hudEmitTimer = 0;

  // Input state
  private keys: Record<string, boolean> = {};
  private mouseDown = false;
  private mobileMove = { x: 0, y: 0 };
  private interactHold = false;

  // Shared particle geometries
  private particleGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private smokeGeo = new THREE.SphereGeometry(0.28, 8, 8);
  private raycaster = new THREE.Raycaster();

  constructor(config: FpsEngineConfig) {
    this.container = config.container;
    this.game = config.game;
    this.quality = config.quality;
    this.difficulty = config.difficulty;
    this.sensitivity = config.sensitivity;
    this.onHudUpdate = config.onHudUpdate;
    this.onGameEnd = config.onGameEnd;

    this.cameraMode = config.game.defaultCamera;
    this.currentWeaponId = config.game.weapons[0] || 'rifle';
    this.timeRemaining = config.game.durationSeconds;

    if (this.game.ageGroup === '3-5') {
      this.armor = 0;
      this.maxArmor = 0;
    } else if (this.game.ageGroup === '6-9') {
      this.armor = 50;
      this.maxArmor = 50;
    }

    this.initRendererAndScene();
    this.initPlayerAndWeapons();
    this.spawnMissionEntities();
    this.bindEvents();
    this.emitHud();
    this.startLoop();
  }

  private detectSoftwareGl(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initRendererAndScene() {
    this.isSoftwareGl = this.detectSoftwareGl();
    const width = Math.max(320, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    const maxDpr = this.quality === 'high' ? 2 : this.quality === 'medium' ? 1.5 : 1;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr),
    );
    this.renderer.setSize(width, height);

    const enableShadows = !this.isSoftwareGl && this.quality !== 'low';
    this.renderer.shadowMap.enabled = enableShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    // Scene & Fog
    this.scene = new THREE.Scene();
    const p = this.game.mapPalette;
    this.scene.background = new THREE.Color(p.skyTop);
    this.scene.fog = new THREE.FogExp2(
      p.fogColor,
      this.game.mapFeatures.isOutdoor ? 0.011 : 0.014,
    );

    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 280);
    this.scene.add(this.camera);

    // Studio IBL Environment Reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // 3-point warm/cool lighting
    const hemi = new THREE.HemisphereLight(
      p.hemiSkyColor,
      p.hemiGroundColor,
      this.game.mapFeatures.isOutdoor ? 0.85 : 0.65,
    );
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(p.keyLightColor, 1.45);
    keyLight.position.set(24, 38, 18);
    if (enableShadows) {
      keyLight.castShadow = true;
      const shadowRes = this.quality === 'high' ? 2048 : 1024;
      keyLight.shadow.mapSize.set(shadowRes, shadowRes);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 110;
      const d = 36;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(p.accentColor, 0.45);
    rimLight.position.set(-22, 16, -24);
    this.scene.add(rimLight);

    this.shadowTex = createContactShadowTexture();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.builtMap = buildGameMap(this.game, maxAniso, enableShadows);
    this.scene.add(this.builtMap.root);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private initPlayerAndWeapons() {
    this.playerPos.copy(this.builtMap.spawnPlayer);
    this.yaw = 0;
    this.pitch = 0;

    // Create viewmodels for every weapon in game.weapons
    this.game.weapons.forEach((wId) => {
      const vm = createViewModelWeapon(wId);
      vm.group.visible = wId === this.currentWeaponId && this.cameraMode === 'fps';
      this.camera.add(vm.group);
      this.viewModels.set(wId, vm);
    });

    this.muzzleLight = new THREE.PointLight('#fbbf24', 0, 8);
    this.muzzleLight.position.set(0.3, -0.15, -0.9);
    this.camera.add(this.muzzleLight);

    this.equipWeapon(0);

    // Third-person player avatar (visible when cameraMode === 'tps')
    if (this.game.allowCameraToggle) {
      const avatar = createActorMesh({
        role: 'ally',
        isCartoon: true,
        primaryColor: '#38bdf8',
        accentColor: '#fde047',
        shadowTex: this.shadowTex,
      });
      this.playerAvatarGroup = avatar.group;
      this.playerAvatarGroup.visible = this.cameraMode === 'tps';
      this.scene.add(this.playerAvatarGroup);
    }
  }

  private equipWeapon(idx: number) {
    if (idx < 0 || idx >= this.game.weapons.length) return;
    this.weaponIndex = idx;
    this.currentWeaponId = this.game.weapons[idx];
    const spec = WEAPONS[this.currentWeaponId];
    this.ammo = spec.magSize;
    this.reserveAmmo = spec.reserveAmmo;
    this.reloading = false;
    this.isScoped = false;

    this.viewModels.forEach((vm, id) => {
      vm.group.visible =
        id === this.currentWeaponId && this.cameraMode === 'fps' && !this.isScoped;
    });
  }

  private clearDynamicEntities() {
    this.actors.forEach((a) => this.scene.remove(a.group));
    this.actors = [];
    this.targets.forEach((t) => this.scene.remove(t.group));
    this.targets = [];
    if (this.bombProp) {
      this.scene.remove(this.bombProp);
      this.bombProp = null;
    }
    if (this.enemyFlagProp) {
      this.scene.remove(this.enemyFlagProp);
      this.enemyFlagProp = null;
    }
  }

  private spawnMissionEntities() {
    this.clearDynamicEntities();
    const g = this.game;
    const isCartoon = g.ageGroup === '3-5' || g.ageGroup === '6-9';
    const diffMult =
      this.difficulty === 'easy' ? 0.75 : this.difficulty === 'hard' ? 1.35 : 1.0;

    // 1. Spawn friendly helper bots / allies
    for (let i = 0; i < g.allyCount; i++) {
      const sp = this.builtMap.spawnAllies[i % this.builtMap.spawnAllies.length];
      const actor = createActorMesh({
        role: g.ageGroup === '3-5' ? 'helperBot' : 'ally',
        isCartoon,
        primaryColor: g.ageGroup === '3-5' ? '#34d399' : '#0284c7',
        accentColor: '#38bdf8',
        shadowTex: this.shadowTex,
      });
      actor.group.position.set(
        sp.x + (i - 1) * 1.6,
        0,
        sp.z - (g.ageGroup === '3-5' ? 12 + i * 5 : 0),
      );
      this.scene.add(actor.group);
      this.actors.push({
        id: 100 + i,
        role: g.ageGroup === '3-5' ? 'helperBot' : 'ally',
        ...actor,
        hp: 120,
        maxHp: 120,
        alive: true,
        activated: false,
        respawnTimer: 0,
        fireCooldown: 0.6 + Math.random(),
        patrolTarget: new THREE.Vector3(
          (Math.random() - 0.5) * 24,
          0,
          (Math.random() - 0.5) * 24,
        ),
        walkPhase: Math.random() * 6,
      });
    }

    // 2. Spawn enemies (for combat/tactical modes)
    for (let i = 0; i < g.enemyCount; i++) {
      const sp = this.builtMap.spawnEnemies[i % this.builtMap.spawnEnemies.length];
      const actor = createActorMesh({
        role: 'enemy',
        isCartoon,
        primaryColor: isCartoon ? '#a855f7' : '#334155',
        accentColor: isCartoon ? '#f43f5e' : '#ef4444',
        shadowTex: this.shadowTex,
      });
      actor.group.position.set(
        sp.x + ((i % 3) - 1) * 2.2,
        0,
        sp.z + Math.floor(i / 3) * 2.2,
      );
      this.scene.add(actor.group);
      const baseHp = isCartoon ? 65 : 100;
      this.actors.push({
        id: 200 + i,
        role: 'enemy',
        ...actor,
        hp: Math.round(baseHp * diffMult),
        maxHp: Math.round(baseHp * diffMult),
        alive: true,
        respawnTimer: 0,
        fireCooldown: 1.0 + Math.random() * 1.2,
        patrolTarget: new THREE.Vector3(
          (Math.random() - 0.5) * 26,
          0,
          (Math.random() - 0.5) * 26,
        ),
        walkPhase: Math.random() * 6,
      });
    }

    // 3. Special mission objectives
    if (
      g.mechanic === 'target-pop' ||
      g.mechanic === 'color-match' ||
      g.mechanic === 'star-hunt' ||
      g.mechanic === 'maze-checkpoint' ||
      g.mechanic === 'station-shield' ||
      g.mechanic === 'helper-bots'
    ) {
      const count =
        g.mechanic === 'maze-checkpoint'
          ? g.targetGoal
          : g.mechanic === 'helper-bots'
          ? g.targetGoal
          : Math.min(8, g.targetGoal);

      const kind: WorldTarget['kind'] =
        g.id.includes('meva')
          ? 'fruit'
          : g.id.includes('lazer') && g.ageGroup === '3-5'
          ? 'crystal'
          : g.mechanic === 'star-hunt'
          ? 'star'
          : g.mechanic === 'maze-checkpoint'
          ? 'checkpoint'
          : g.mechanic === 'station-shield'
          ? 'meteor'
          : 'ring';

      if (g.mechanic === 'color-match') {
        this.targetColorObj = COLOR_CHOICES[0];
      }

      if (g.mechanic === 'helper-bots') {
        // Spawn friendly helper robots around the park to energize!
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const r = 9 + (i % 3) * 5;
          const prop = createActorMesh({
            role: 'helperBot',
            isCartoon: true,
            primaryColor: '#fbbf24',
            accentColor: '#38bdf8',
            shadowTex: this.shadowTex,
          });
          prop.group.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
          this.scene.add(prop.group);
          this.actors.push({
            id: 500 + i,
            role: 'helperBot',
            ...prop,
            hp: 50,
            maxHp: 50,
            alive: true,
            activated: false,
            respawnTimer: 0,
            fireCooldown: 99,
            patrolTarget: prop.group.position.clone(),
            walkPhase: i,
          });
        }
      } else {
        for (let i = 0; i < count; i++) {
          const colorChoice = COLOR_CHOICES[i % COLOR_CHOICES.length];
          const prop = createTargetProp(
            kind,
            g.mechanic === 'star-hunt'
              ? '#facc15'
              : g.mechanic === 'maze-checkpoint'
              ? '#22c55e'
              : colorChoice.hex,
          );
          const angle = (i / count) * Math.PI * 2;
          const radius =
            g.mechanic === 'maze-checkpoint' ? 14 : 7 + (i % 3) * 5.2;
          const px = Math.cos(angle) * radius;
          const pz = Math.sin(angle) * radius;
          const py =
            kind === 'checkpoint' ? 0 : kind === 'star' ? 1.2 : 1.7 + (i % 3) * 0.85;
          prop.group.position.set(px, py, pz);
          this.scene.add(prop.group);

          this.targets.push({
            id: 300 + i,
            group: prop.group,
            hitTarget: prop.hitTarget,
            active: true,
            colorKey: colorChoice.key,
            colorUz: colorChoice.uz,
            basePos: prop.group.position.clone(),
            phase: i * 0.9,
            respawnTimer: 0,
            kind,
          });
        }
      }
    }

    if (g.mechanic === 'bomb-mission') {
      this.bombState = 'planted';
      this.bombTimer = 42;
      const site = this.builtMap.bombSites[0];
      const prop = createTargetProp('bomb', '#ef4444');
      prop.group.position.set(site.x, 0, site.z);
      this.scene.add(prop.group);
      this.bombProp = prop.group;
    }

    if (g.mechanic === 'hostage-rescue') {
      for (let i = 0; i < 2; i++) {
        const vip = createActorMesh({
          role: 'hostage',
          isCartoon: false,
          primaryColor: '#eab308',
          accentColor: '#22c55e',
          shadowTex: this.shadowTex,
        });
        vip.group.position.set(i === 0 ? -10 : 10, 0, -16);
        this.scene.add(vip.group);
        this.actors.push({
          id: 400 + i,
          role: 'hostage',
          ...vip,
          hp: 200,
          maxHp: 200,
          alive: true,
          rescued: false,
          following: false,
          respawnTimer: 0,
          fireCooldown: 99,
          patrolTarget: vip.group.position.clone(),
          walkPhase: 0,
        });
      }
    }

    if (g.mechanic === 'capture-flag') {
      const flag = createTargetProp('flag', '#ef4444');
      flag.group.position.copy(this.builtMap.enemyFlagPos);
      this.scene.add(flag.group);
      this.enemyFlagProp = flag.group;
      this.carryingFlag = false;
    }
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('wheel', this.handleWheel);
    window.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleContextMenu = (e: MouseEvent) => {
    if (this.isPointerLocked) e.preventDefault();
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    if (!this.isPointerLocked && this.status === 'playing') {
      this.mouseDown = false;
    }
    this.emitHud();
  };

  public requestPointerLock() {
    if (this.status !== 'playing' || this.isPaused) return;
    try {
      this.renderer.domElement.requestPointerLock?.();
    } catch {
      // Mobile browsers don't support pointer lock; touch joystick still works!
    }
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
    this.emitHud();
  }

  public restartMatch() {
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.score = 0;
    this.kills = 0;
    this.deaths = 0;
    this.goalProgress = 0;
    this.round = 1;
    this.roundsWon = 0;
    this.timeRemaining = this.game.durationSeconds;
    this.status = 'playing';
    this.endReason = '';
    this.isPaused = false;
    this.killFeed = [];
    this.playerPos.copy(this.builtMap.spawnPlayer);
    this.playerVel.set(0, 0, 0);
    this.equipWeapon(0);
    this.spawnMissionEntities();
    this.emitHud();
  }

  public toggleCameraMode() {
    if (!this.game.allowCameraToggle) return;
    this.cameraMode = this.cameraMode === 'fps' ? 'tps' : 'fps';
    this.viewModels.forEach((vm, id) => {
      vm.group.visible =
        id === this.currentWeaponId && this.cameraMode === 'fps' && !this.isScoped;
    });
    if (this.playerAvatarGroup) {
      this.playerAvatarGroup.visible = this.cameraMode === 'tps';
    }
    this.emitHud();
  }

  // Mobile & UI touch control hooks
  public setMobileMove(x: number, y: number) {
    this.mobileMove.x = Math.max(-1, Math.min(1, x));
    this.mobileMove.y = Math.max(-1, Math.min(1, y));
  }

  public addLookDelta(dx: number, dy: number) {
    const sens = 0.0032 * this.sensitivity;
    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - dy * sens,
      -Math.PI / 2.15,
      Math.PI / 2.15,
    );
  }

  public triggerFire(down: boolean) {
    this.mouseDown = down;
    if (down && !this.isPaused && this.status === 'playing') {
      this.tryShoot();
    }
  }

  public triggerJump() {
    if (this.isGrounded && !this.isPaused && this.status === 'playing') {
      this.playerVel.y = 7.4;
      this.isGrounded = false;
    }
  }

  public triggerReload() {
    this.startReload();
  }

  public triggerCrouch() {
    this.isCrouching = !this.isCrouching;
  }

  public triggerScope() {
    this.toggleScope();
  }

  public triggerInteract(down: boolean) {
    this.interactHold = down;
    if (down) this.tryInstantInteract();
  }

  public switchWeapon(index: number) {
    this.equipWeapon(index);
    this.emitHud();
  }

  private handleResize = () => {
    if (this.disposed) return;
    const width = Math.max(320, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === 'Escape') {
      this.setPaused(!this.isPaused);
      return;
    }
    if (this.isPaused || this.status !== 'playing') return;

    if (e.code === 'Space' && this.isGrounded) {
      this.playerVel.y = 7.4;
      this.isGrounded = false;
    }
    if (e.code === 'KeyC') {
      this.isCrouching = !this.isCrouching;
    }
    if (e.code === 'KeyR') {
      this.startReload();
    }
    if (e.code === 'KeyF') {
      this.toggleScope();
    }
    if (e.code === 'KeyV') {
      this.toggleCameraMode();
    }
    if (e.code === 'KeyE') {
      this.interactHold = true;
      this.tryInstantInteract();
    }
    if (e.code === 'Digit1') this.switchWeapon(0);
    if (e.code === 'Digit2') this.switchWeapon(1);
    if (e.code === 'Digit3') this.switchWeapon(2);
    if (e.code === 'Digit4') this.switchWeapon(3);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
    if (e.code === 'KeyE') {
      this.interactHold = false;
      this.defuseHoldProgress = 0;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked || this.isPaused || this.status !== 'playing') return;
    const zoomFactor = this.isScoped ? 0.45 : 1;
    const sens = 0.0022 * this.sensitivity * zoomFactor;
    this.yaw -= e.movementX * sens;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - e.movementY * sens,
      -Math.PI / 2.15,
      Math.PI / 2.15,
    );
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.isPaused || this.status !== 'playing') return;
    if (!this.isPointerLocked && e.target === this.renderer.domElement) {
      this.requestPointerLock();
      return;
    }
    if (!this.isPointerLocked) return;
    if (e.button === 0) {
      this.mouseDown = true;
      this.tryShoot();
    } else if (e.button === 2) {
      this.toggleScope();
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
  };

  private handleWheel = (e: WheelEvent) => {
    if (!this.isPointerLocked || this.game.weapons.length <= 1) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    const next =
      (this.weaponIndex + dir + this.game.weapons.length) % this.game.weapons.length;
    this.switchWeapon(next);
  };

  private toggleScope() {
    const spec = WEAPONS[this.currentWeaponId];
    if (spec.scopeZoom <= 1) return;
    this.isScoped = !this.isScoped;
    this.viewModels.forEach((vm, id) => {
      vm.group.visible =
        id === this.currentWeaponId && this.cameraMode === 'fps' && !this.isScoped;
    });
  }

  private startReload() {
    const spec = WEAPONS[this.currentWeaponId];
    if (this.reloading || this.ammo >= spec.magSize || this.reserveAmmo <= 0) return;
    this.reloading = true;
    this.reloadTimer = spec.reloadTime;
    this.isScoped = false;
    audioEngine.playReload();
  }

  private tryInstantInteract() {
    // Toggle nearby sliding door
    for (const door of this.builtMap.doors) {
      const dist = _v1
        .set(door.closedPos.x, 0, door.closedPos.z)
        .distanceTo(_v2.set(this.playerPos.x, 0, this.playerPos.z));
      if (dist < 4.5) {
        door.targetOpen = door.targetOpen > 0.5 ? 0 : 1;
        audioEngine.playUiClick();
      }
    }

    // Rescue hostage VIPs
    if (this.game.mechanic === 'hostage-rescue') {
      for (const actor of this.actors) {
        if (actor.role === 'hostage' && !actor.rescued) {
          const dist = actor.group.position.distanceTo(this.playerPos);
          if (dist < 3.6) {
            actor.following = true;
            audioEngine.playCollect();
            this.pushKillFeed('Garovdagi siz bilan ergashmoqda — yashil zonaga olib boring!', '#10b981');
          }
        }
      }
    }
  }

  private pushKillFeed(text: string, color: string) {
    this.killFeed = [
      { id: this.feedCounter++, text, color },
      ...this.killFeed.slice(0, 3),
    ];
  }

  private tryShoot() {
    if (this.reloading || this.fireCooldown > 0 || this.status !== 'playing') return;
    const spec = WEAPONS[this.currentWeaponId];
    if (this.ammo <= 0) {
      this.startReload();
      return;
    }

    this.ammo--;
    this.fireCooldown = spec.fireInterval;
    this.recoilPitch += spec.recoilKick * (this.isCrouching ? 0.65 : 1);
    this.recoilKickZ = 0.08;
    this.muzzleFlashTimer = 0.055;
    this.muzzleLight.intensity = 3.2;
    this.muzzleLight.color.set(spec.muzzleColor);
    audioEngine.playShoot(this.currentWeaponId);

    const vm = this.viewModels.get(this.currentWeaponId);
    if (vm && this.cameraMode === 'fps' && !this.isScoped) {
      vm.muzzleFlash.visible = true;
      vm.muzzleFlash.rotation.z = Math.random() * Math.PI;
    }

    // Raycast from camera center with slight weapon spread
    const spread = spec.spread * (this.isCrouching ? 0.5 : 1) * (this.isScoped ? 0.15 : 1);
    const sx = (Math.random() - 0.5) * spread;
    const sy = (Math.random() - 0.5) * spread;
    this.raycaster.setFromCamera(new THREE.Vector2(sx, sy), this.camera);
    this.raycaster.far = spec.range;

    // Collect raycastable meshes
    const hitMeshes: THREE.Object3D[] = [...this.builtMap.worldMeshes];
    const hitLookup = new Map<
      THREE.Object3D,
      { type: 'actor'; actor: AiActor } | { type: 'target'; target: WorldTarget }
    >();

    for (const actor of this.actors) {
      if (actor.alive && (actor.role === 'enemy' || actor.role === 'helperBot')) {
        hitMeshes.push(actor.hitTarget);
        hitLookup.set(actor.hitTarget, { type: 'actor', actor });
      }
    }
    for (const t of this.targets) {
      if (t.active) {
        hitMeshes.push(t.hitTarget);
        hitLookup.set(t.hitTarget, { type: 'target', target: t });
      }
    }

    const hits = this.raycaster.intersectObjects(hitMeshes, false);

    // Tracer beam start & end
    _v1.set(0.22, -0.15, -0.75).applyMatrix4(this.camera.matrixWorld);
    const endPoint =
      hits.length > 0
        ? hits[0].point.clone()
        : this.raycaster.ray.origin
            .clone()
            .add(this.raycaster.ray.direction.clone().multiplyScalar(48));

    this.spawnTracer(_v1, endPoint, spec.beamColor);

    if (hits.length > 0) {
      const firstHit = hits[0];
      const match = hitLookup.get(firstHit.object);
      if (match) {
        if (match.type === 'actor') {
          this.handleActorHit(match.actor, spec.damage, firstHit.point);
        } else {
          this.handleTargetHit(match.target, firstHit.point);
        }
      } else {
        // Wall or physics crate impact
        this.spawnImpactParticles(firstHit.point, '#cbd5e1', 5, true);
        for (const crate of this.builtMap.physicsCrates) {
          if (crate.mesh === firstHit.object) {
            _dir.copy(this.raycaster.ray.direction).setY(0).normalize();
            crate.velocity.addScaledVector(_dir, 5.5);
          }
        }
      }
    }

    if (this.ammo === 0 && this.reserveAmmo > 0 && this.game.ageGroup !== '3-5') {
      this.startReload();
    }
  }

  private handleActorHit(actor: AiActor, damage: number, hitPoint: THREE.Vector3) {
    if (actor.role === 'helperBot') {
      if (!actor.activated) {
        actor.activated = true;
        this.goalProgress++;
        this.score += 120;
        this.hitMarkerAt = performance.now();
        audioEngine.playHit(true);
        this.spawnImpactParticles(hitPoint, '#fde047', 12, false);
        this.pushKillFeed('Do‘st robot quvvatlandi! (+120)', '#34d399');
        this.checkWinProgress();
      }
      return;
    }

    actor.hp -= damage;
    this.hitMarkerAt = performance.now();
    audioEngine.playHit(this.game.nonViolent);
    this.spawnImpactParticles(
      hitPoint,
      this.game.nonViolent ? '#38bdf8' : '#f59e0b',
      8,
      false,
    );

    if (actor.hp <= 0) {
      actor.alive = false;
      actor.group.visible = false;
      this.kills++;
      this.score += 100;
      this.spawnImpactParticles(actor.group.position.clone().setY(1.2), '#fbbf24', 14, true);

      if (
        this.game.mechanic === 'team-skirmish' ||
        this.game.mechanic === 'survival-waves' ||
        this.game.mechanic === 'sniper-overwatch' ||
        this.game.mechanic === 'tactical-round'
      ) {
        this.goalProgress++;
        this.pushKillFeed(`Raqib zararsizlantirildi! (+100)`, '#fbbf24');
      }

      // Respawn logic for modes that need continuous opponents
      if (
        this.game.mechanic === 'team-skirmish' ||
        this.game.mechanic === 'capture-flag' ||
        this.game.mechanic === 'sniper-overwatch'
      ) {
        actor.respawnTimer = 4.0;
      }

      this.checkRoundOrWaveAdvance();
      this.checkWinProgress();
    }
  }

  private handleTargetHit(target: WorldTarget, hitPoint: THREE.Vector3) {
    if (this.game.mechanic === 'color-match') {
      if (target.colorKey === this.targetColorObj.key) {
        this.goalProgress++;
        this.score += 100;
        audioEngine.playCollect();
        this.spawnImpactParticles(hitPoint, '#fde047', 12, false);
        this.targetColorObj =
          COLOR_CHOICES[Math.floor(Math.random() * COLOR_CHOICES.length)];
        this.pushKillFeed(`To‘g‘ri rang! (+100)`, '#22c55e');
      } else {
        audioEngine.playUiClick();
        this.pushKillFeed(`Boshqa rang tanlandi: ${this.targetColorObj.uz} kerak`, '#f59e0b');
        return;
      }
    } else {
      this.goalProgress++;
      this.score += 80;
      audioEngine.playHit(true);
      this.spawnImpactParticles(hitPoint, '#fde047', 12, false);
    }

    target.active = false;
    target.group.visible = false;
    this.hitMarkerAt = performance.now();

    if (this.goalProgress < this.game.targetGoal) {
      target.respawnTimer = 2.2;
    }
    this.checkWinProgress();
  }

  private checkRoundOrWaveAdvance() {
    const aliveEnemies = this.actors.filter((a) => a.role === 'enemy' && a.alive).length;
    if (aliveEnemies === 0) {
      if (
        this.game.mechanic === 'tactical-round' ||
        this.game.mechanic === 'survival-waves'
      ) {
        if (this.round < this.game.roundsTotal) {
          this.round++;
          this.roundsWon++;
          this.health = Math.min(this.maxHealth, this.health + 35);
          this.pushKillFeed(`${this.round}-bosqich boshlandi!`, '#38bdf8');
          // Respawn enemies for next wave/round
          this.actors.forEach((a, idx) => {
            if (a.role === 'enemy') {
              const sp =
                this.builtMap.spawnEnemies[idx % this.builtMap.spawnEnemies.length];
              a.group.position.set(sp.x, 0, sp.z);
              a.hp = a.maxHp;
              a.alive = true;
              a.group.visible = true;
            }
          });
        } else if (this.game.mechanic === 'tactical-round') {
          this.roundsWon++;
          this.finishGame(true, 'Barcha taktik raundlarda g‘alaba qozondingiz!');
        }
      }
    }
  }

  private checkWinProgress() {
    if (this.status !== 'playing') return;
    if (
      this.game.mechanic !== 'tactical-round' &&
      this.game.mechanic !== 'bomb-mission' &&
      this.goalProgress >= this.game.targetGoal
    ) {
      this.finishGame(true, `Missiya muvaffaqiyatli bajarildi! (${this.goalProgress}/${this.game.targetGoal})`);
    }
  }

  private finishGame(won: boolean, reason: string) {
    if (this.status !== 'playing') return;
    this.status = won ? 'won' : 'lost';
    this.endReason = reason;
    if (won) {
      this.score += Math.round(this.timeRemaining * 4);
      audioEngine.playVictory();
    } else {
      audioEngine.playDefeat();
    }
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
    this.emitHud();
    this.onGameEnd(won, this.score, reason);
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: string) {
    const dist = start.distanceTo(end);
    if (dist < 0.2) return;
    const geo = new THREE.CylinderGeometry(0.025, 0.025, dist, 6);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(start).lerp(end, 0.5);
    mesh.lookAt(end);
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: 0.08 });
  }

  private spawnImpactParticles(
    origin: THREE.Vector3,
    colorHex: string,
    count: number,
    includeSmoke: boolean,
  ) {
    const actualCount = this.quality === 'low' ? Math.ceil(count / 2) : count;
    for (let i = 0; i < actualCount; i++) {
      const isSmoke = includeSmoke && i % 3 === 0;
      const mat = new THREE.MeshBasicMaterial({
        color: isSmoke ? '#94a3b8' : colorHex,
        transparent: true,
        opacity: isSmoke ? 0.55 : 0.95,
      });
      const mesh = new THREE.Mesh(isSmoke ? this.smokeGeo : this.particleGeo, mat);
      mesh.position.copy(origin);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * (isSmoke ? 2.5 : 7.5),
          Math.random() * (isSmoke ? 3 : 5.5),
          (Math.random() - 0.5) * (isSmoke ? 2.5 : 7.5),
        ),
        life: isSmoke ? 0.65 : 0.38,
        maxLife: isSmoke ? 0.65 : 0.38,
        isSmoke,
      });
    }
  }

  private resolveCollisions(pos: THREE.Vector3, radius: number, height: number) {
    const bound = this.builtMap.arenaHalfExtent - radius - 0.6;
    pos.x = THREE.MathUtils.clamp(pos.x, -bound, bound);
    pos.z = THREE.MathUtils.clamp(pos.z, -bound, bound);

    for (let i = 0; i < this.builtMap.colliders.length; i++) {
      const c: AabbCollider = this.builtMap.colliders[i];
      if (pos.y >= c.maxY - 0.1 || pos.y + height <= c.minY) continue;
      if (
        pos.x + radius > c.minX &&
        pos.x - radius < c.maxX &&
        pos.z + radius > c.minZ &&
        pos.z - radius < c.maxZ
      ) {
        const penLeft = pos.x + radius - c.minX;
        const penRight = c.maxX - (pos.x - radius);
        const penFront = pos.z + radius - c.minZ;
        const penBack = c.maxZ - (pos.z - radius);
        const minPen = Math.min(penLeft, penRight, penFront, penBack);
        if (minPen === penLeft) pos.x = c.minX - radius;
        else if (minPen === penRight) pos.x = c.maxX + radius;
        else if (minPen === penFront) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      }
    }
  }

  private updatePlayer(dt: number) {
    const forwardInput =
      (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
      (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0) -
      this.mobileMove.y;
    const strafeInput =
      (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
      (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0) +
      this.mobileMove.x;

    this.isSprinting =
      Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight']) &&
      !this.isCrouching &&
      forwardInput > 0;

    const baseSpeed = this.game.ageGroup === '3-5' ? 8.2 : 7.6;
    const speed =
      baseSpeed *
      (this.isSprinting ? 1.45 : this.isCrouching ? 0.55 : 1.0) *
      (this.isScoped ? 0.6 : 1.0);

    _v1.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); // forward
    _v2.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); // right
    _dir.set(0, 0, 0).addScaledVector(_v1, forwardInput).addScaledVector(_v2, strafeInput);
    if (_dir.lengthSq() > 0.001) {
      _dir.normalize();
      if (this.isGrounded) {
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
          this.footstepTimer = this.isSprinting ? 0.3 : 0.45;
          audioEngine.playFootstep(this.isSprinting);
        }
      }
    }

    this.playerPos.x += _dir.x * speed * dt;
    this.playerPos.z += _dir.z * speed * dt;

    // Gravity & ground check
    this.playerVel.y -= 19.5 * dt;
    this.playerPos.y += this.playerVel.y * dt;

    let groundHeight = 0;
    for (const c of this.builtMap.colliders) {
      if (
        this.playerPos.x > c.minX - 0.3 &&
        this.playerPos.x < c.maxX + 0.3 &&
        this.playerPos.z > c.minZ - 0.3 &&
        this.playerPos.z < c.maxZ + 0.3 &&
        this.playerPos.y >= c.maxY - 0.45 &&
        c.maxY > groundHeight
      ) {
        groundHeight = c.maxY;
      }
    }

    if (this.playerPos.y <= groundHeight) {
      this.playerPos.y = groundHeight;
      this.playerVel.y = 0;
      this.isGrounded = true;
    }

    const playerHeight = this.isCrouching ? 1.15 : 1.8;
    this.resolveCollisions(this.playerPos, 0.45, playerHeight);

    // Smooth crouch eye height & FOV
    const targetEye = this.isCrouching ? 1.05 : 1.68;
    this.currentEyeHeight = THREE.MathUtils.damp(this.currentEyeHeight, targetEye, 12, dt);

    const spec = WEAPONS[this.currentWeaponId];
    const targetFov = this.isScoped
      ? 75 / spec.scopeZoom
      : this.isSprinting
      ? 83
      : 75;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    // Recoil recovery
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 12, dt);
    this.recoilKickZ = THREE.MathUtils.damp(this.recoilKickZ, 0, 16, dt);

    // Camera transform (FPS vs TPS)
    _euler.set(
      THREE.MathUtils.clamp(this.pitch + this.recoilPitch, -Math.PI / 2.1, Math.PI / 2.1),
      this.yaw,
      0,
      'YXZ',
    );
    this.camera.quaternion.setFromEuler(_euler);

    if (this.cameraMode === 'fps') {
      this.camera.position.set(
        this.playerPos.x,
        this.playerPos.y + this.currentEyeHeight,
        this.playerPos.z,
      );
    } else {
      _v3.set(0, 0, 4.2).applyQuaternion(this.camera.quaternion);
      this.camera.position
        .set(this.playerPos.x, this.playerPos.y + 2.2, this.playerPos.z)
        .add(_v3);
      if (this.camera.position.y < 0.7) this.camera.position.y = 0.7;
      if (this.playerAvatarGroup) {
        this.playerAvatarGroup.position.copy(this.playerPos);
        this.playerAvatarGroup.rotation.y = this.yaw + Math.PI;
      }
    }

    // Weapon bobbing & reload tilt
    const vm = this.viewModels.get(this.currentWeaponId);
    if (vm) {
      const moving = _dir.lengthSq() > 0.01 && this.isGrounded;
      const bob = moving ? Math.sin(performance.now() * (this.isSprinting ? 0.014 : 0.009)) * 0.016 : 0;
      const reloadTilt = this.reloading ? -0.45 : 0;
      vm.group.position.set(0, bob + reloadTilt * 0.25, this.recoilKickZ);
      vm.group.rotation.x = reloadTilt;
    }

    // Automatic fire
    if (this.mouseDown && spec.autoFire) {
      this.tryShoot();
    }
  }

  private updateWorldDynamics(dt: number, elapsed: number) {
    // Doors smooth slide & auto-open for friendly bots/player
    for (const door of this.builtMap.doors) {
      const distPlayer = _v1
        .set(door.closedPos.x, 0, door.closedPos.z)
        .distanceTo(_v2.set(this.playerPos.x, 0, this.playerPos.z));
      if (distPlayer < 3.4) door.targetOpen = 1;
      door.openAmount = THREE.MathUtils.damp(door.openAmount, door.targetOpen, 8, dt);
      door.mesh.position.lerpVectors(door.closedPos, door.openPos, door.openAmount);
      const col = this.builtMap.colliders[door.colliderIndex];
      col.minY = door.openAmount * 3.4;
      col.maxY = 3.6 + door.openAmount * 3.4;
    }

    // Moving platforms
    for (const plat of this.builtMap.movingPlatforms) {
      const offset = Math.sin(elapsed * plat.speed + plat.phase) * plat.amplitude;
      plat.mesh.position.copy(plat.basePos);
      plat.mesh.position[plat.axis] += offset;
    }

    // Physics crates friction & bounds
    for (const crate of this.builtMap.physicsCrates) {
      if (crate.velocity.lengthSq() > 0.001) {
        crate.mesh.position.addScaledVector(crate.velocity, dt);
        crate.velocity.multiplyScalar(Math.max(0, 1 - 6 * dt));
        const b = this.builtMap.arenaHalfExtent - 2;
        crate.mesh.position.x = THREE.MathUtils.clamp(crate.mesh.position.x, -b, b);
        crate.mesh.position.z = THREE.MathUtils.clamp(crate.mesh.position.z, -b, b);
        const col = this.builtMap.colliders[crate.colliderIndex];
        col.minX = crate.mesh.position.x - crate.halfSize;
        col.maxX = crate.mesh.position.x + crate.halfSize;
        col.minZ = crate.mesh.position.z - crate.halfSize;
        col.maxZ = crate.mesh.position.z + crate.halfSize;
      }
    }

    // Snowfall
    if (this.builtMap.snowPoints) {
      const attr = this.builtMap.snowPoints.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        let y = attr.getY(i) - dt * 2.4;
        if (y < 0.2) y = 18;
        attr.setY(i, y);
      }
      attr.needsUpdate = true;
    }

    // Targets animation & proximity collection (stars / checkpoints)
    for (const t of this.targets) {
      if (!t.active) {
        if (t.respawnTimer > 0) {
          t.respawnTimer -= dt;
          if (t.respawnTimer <= 0) {
            t.active = true;
            t.group.visible = true;
            t.group.position.x = (Math.random() - 0.5) * 26;
            t.group.position.z = (Math.random() - 0.5) * 26;
            t.basePos.copy(t.group.position);
          }
        }
        continue;
      }

      t.group.rotation.y += dt * 1.6;
      if (t.kind !== 'checkpoint') {
        t.group.position.y =
          t.basePos.y + Math.sin(elapsed * 2.2 + t.phase) * 0.28;
      }
      if (t.kind === 'meteor') {
        t.group.position.x = THREE.MathUtils.damp(t.group.position.x, 0, 0.25, dt);
        t.group.position.z = THREE.MathUtils.damp(t.group.position.z, 0, 0.25, dt);
      }

      // Walk-over pickup for stars & maze checkpoints
      if (t.kind === 'star' || t.kind === 'checkpoint') {
        const dist = _v1
          .set(t.group.position.x, 0, t.group.position.z)
          .distanceTo(_v2.set(this.playerPos.x, 0, this.playerPos.z));
        if (dist < 2.2) {
          t.active = false;
          t.group.visible = false;
          this.goalProgress++;
          this.score += 100;
          audioEngine.playCollect();
          this.spawnImpactParticles(t.group.position, '#fde047', 12, false);
          if (t.kind === 'star' && this.goalProgress < this.game.targetGoal) {
            t.respawnTimer = 2.0;
          }
          this.checkWinProgress();
        }
      }
    }

    // Bomb mission timer & defusal
    if (this.game.mechanic === 'bomb-mission' && this.bombState === 'planted') {
      this.bombTimer -= dt;
      this.bombBeepTimer -= dt;
      if (this.bombBeepTimer <= 0) {
        this.bombBeepTimer = this.bombTimer < 10 ? 0.35 : 0.9;
        audioEngine.playBombBeep(this.bombTimer < 10);
      }

      if (this.bombProp) {
        const distToBomb = this.bombProp.position.distanceTo(this.playerPos);
        if (distToBomb < 3.2 && (this.interactHold || this.keys['KeyE'])) {
          this.defuseHoldProgress += dt;
          if (this.defuseHoldProgress >= 2.2) {
            this.bombState = 'defused';
            this.score += 400;
            this.goalProgress = 1;
            this.finishGame(true, 'Zaryad muvaffaqiyatli zararsizlantirildi!');
          }
        } else {
          this.defuseHoldProgress = Math.max(0, this.defuseHoldProgress - dt * 1.5);
        }
      }

      if (this.bombTimer <= 0) {
        this.bombState = 'exploded';
        this.finishGame(false, 'Vaqt tugadi — zaryad ishga tushdi!');
      }
    }

    // CTF flag pickup & delivery
    if (this.game.mechanic === 'capture-flag' && this.enemyFlagProp) {
      if (!this.carryingFlag) {
        const distFlag = this.enemyFlagProp.position.distanceTo(this.playerPos);
        if (distFlag < 2.5) {
          this.carryingFlag = true;
          this.enemyFlagProp.visible = false;
          audioEngine.playCollect();
          this.pushKillFeed('Bayroq qo‘lga kiritildi! Yashil bazaga qayting!', '#22c55e');
        }
      } else {
        const distHome = this.builtMap.extractionZone.distanceTo(this.playerPos);
        if (distHome < 2.8) {
          this.carryingFlag = false;
          this.enemyFlagProp.visible = true;
          this.goalProgress++;
          this.score += 300;
          audioEngine.playCollect();
          this.pushKillFeed('Bayroq bazaga yetkazildi! (+300)', '#10b981');
          this.checkWinProgress();
        }
      }
    }

    // Actors AI update
    this.updateActors(dt);
  }

  private updateActors(dt: number) {
    const isCartoon = this.game.ageGroup === '3-5' || this.game.ageGroup === '6-9';
    const diffFireRate =
      this.difficulty === 'easy' ? 1.8 : this.difficulty === 'hard' ? 0.95 : 1.35;

    for (const actor of this.actors) {
      if (!actor.alive) {
        if (actor.respawnTimer > 0) {
          actor.respawnTimer -= dt;
          if (actor.respawnTimer <= 0) {
            actor.alive = true;
            actor.hp = actor.maxHp;
            actor.group.visible = true;
            const sp =
              this.builtMap.spawnEnemies[
                actor.id % this.builtMap.spawnEnemies.length
              ];
            actor.group.position.set(sp.x, 0, sp.z);
          }
        }
        continue;
      }

      // HelperBot proximity activation (3-5)
      if (actor.role === 'helperBot' && !actor.activated) {
        if (actor.group.position.distanceTo(this.playerPos) < 2.6) {
          actor.activated = true;
          this.goalProgress++;
          this.score += 120;
          audioEngine.playCollect();
          this.spawnImpactParticles(
            actor.group.position.clone().setY(1.2),
            '#fde047',
            12,
            false,
          );
          this.checkWinProgress();
        }
        actor.group.rotation.y += dt * 1.2;
        continue;
      }

      // Hostage VIP follow & extraction
      if (actor.role === 'hostage') {
        if (actor.following && !actor.rescued) {
          _v1.copy(this.playerPos).sub(actor.group.position);
          _v1.y = 0;
          const d = _v1.length();
          if (d > 2.2) {
            _v1.normalize();
            actor.group.position.addScaledVector(_v1, 5.2 * dt);
            actor.group.rotation.y = Math.atan2(_v1.x, _v1.z);
            actor.walkPhase += dt * 9;
          }
          if (actor.group.position.distanceTo(this.builtMap.extractionZone) < 3.0) {
            actor.rescued = true;
            actor.following = false;
            actor.group.visible = false;
            this.goalProgress++;
            this.score += 350;
            audioEngine.playCollect();
            this.pushKillFeed('Garovdagi xavfsiz zonaga yetkazildi! (+350)', '#10b981');
            this.checkWinProgress();
          }
        }
        continue;
      }

      // Combat AI (enemy or ally)
      let targetPos = this.playerPos;
      let targetActor: AiActor | null = null;

      if (actor.role === 'ally') {
        const enemies = this.actors.filter((a) => a.role === 'enemy' && a.alive);
        if (enemies.length > 0) {
          targetActor = enemies[actor.id % enemies.length];
          targetPos = targetActor.group.position;
        } else {
          targetPos = actor.patrolTarget;
        }
      } else {
        // Enemy picks closest between player and allies
        let bestDist = actor.group.position.distanceTo(this.playerPos);
        targetPos = this.playerPos;
        for (const ally of this.actors) {
          if (ally.role === 'ally' && ally.alive) {
            const d = actor.group.position.distanceTo(ally.group.position);
            if (d < bestDist) {
              bestDist = d;
              targetPos = ally.group.position;
              targetActor = ally;
            }
          }
        }
      }

      _v1.copy(targetPos).sub(actor.group.position);
      _v1.y = 0;
      const dist = _v1.length();

      if (dist > 0.1) {
        _v1.normalize();
        const desiredAngle = Math.atan2(_v1.x, _v1.z);
        actor.group.rotation.y = desiredAngle;
      }

      const desiredRange = actor.role === 'enemy' ? 11 : 9;
      if (dist > desiredRange) {
        const moveSpeed = isCartoon ? 2.8 : 3.6;
        actor.group.position.addScaledVector(_v1, moveSpeed * dt);
        this.resolveCollisions(actor.group.position, 0.55, 1.85);
        actor.walkPhase += dt * 8;
        const swing = Math.sin(actor.walkPhase) * 0.45;
        actor.leftLeg.rotation.x = swing;
        actor.rightLeg.rotation.x = -swing;
        actor.leftArm.rotation.x = -swing * 0.6;
      }

      // AI firing with line-of-sight check
      actor.fireCooldown -= dt;
      if (actor.fireCooldown <= 0 && dist < 34) {
        actor.fireCooldown =
          (actor.role === 'enemy' ? diffFireRate : 1.1) + Math.random() * 0.8;

        _v2.copy(actor.group.position).setY(1.4);
        _v3.copy(targetPos).setY(1.3).sub(_v2).normalize();
        this.raycaster.set(_v2, _v3);
        this.raycaster.far = dist;
        const blocked = this.raycaster.intersectObjects(this.builtMap.worldMeshes, false);

        if (blocked.length === 0) {
          this.spawnTracer(
            _v2,
            targetPos.clone().setY(1.3),
            actor.role === 'ally' ? '#38bdf8' : '#ef4444',
          );

          if (actor.role === 'ally' && targetActor && targetActor.alive) {
            if (Math.random() < 0.55) {
              targetActor.hp -= 24;
              if (targetActor.hp <= 0) {
                targetActor.alive = false;
                targetActor.group.visible = false;
                this.goalProgress++;
                this.score += 50;
                if (this.game.mechanic === 'team-skirmish') {
                  targetActor.respawnTimer = 4.0;
                }
                this.checkRoundOrWaveAdvance();
                this.checkWinProgress();
              }
            }
          } else if (actor.role === 'enemy' && targetPos === this.playerPos) {
            // Enemy shoots player (gentle shield tap for 6-9, tactical damage for 10-20)
            const hitChance =
              this.difficulty === 'easy' ? 0.35 : this.difficulty === 'hard' ? 0.7 : 0.52;
            if (Math.random() < hitChance && this.game.ageGroup !== '3-5') {
              const dmg = this.game.ageGroup === '6-9' ? 6 : 11;
              this.applyDamageToPlayer(dmg);
            }
          }
        }
      }
    }
  }

  private applyDamageToPlayer(amount: number) {
    if (this.status !== 'playing' || this.game.ageGroup === '3-5') return;
    this.damageFlashAt = performance.now();
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, Math.ceil(amount * 0.55));
      this.armor -= absorbed;
      this.health -= amount - absorbed;
    } else {
      this.health -= amount;
    }

    if (this.health <= 0) {
      this.deaths++;
      if (this.game.mechanic === 'tactical-round') {
        this.health = 0;
        this.finishGame(false, 'Operator safdan chiqdi — raund boy berildi.');
      } else {
        // Respawn in arcade/skirmish modes with score penalty
        this.health = this.maxHealth;
        this.armor = Math.round(this.maxArmor * 0.5);
        this.playerPos.copy(this.builtMap.spawnPlayer);
        this.pushKillFeed('Qayta tushish (Respawn)', '#f59e0b');
      }
    }
  }

  private updateEffects(dt: number) {
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleLight.intensity = 0;
        this.viewModels.forEach((vm) => {
          vm.muzzleFlash.visible = false;
        });
      }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.scene.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        (tr.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        (pt.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      pt.mesh.position.addScaledVector(pt.vel, dt);
      if (!pt.isSmoke) pt.vel.y -= 12 * dt;
      else pt.mesh.scale.addScalar(dt * 1.8);
      const mat = pt.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, pt.life / pt.maxLife);
    }
  }

  private computeInteractPrompt(): string | null {
    for (const door of this.builtMap.doors) {
      if (
        _v1
          .set(door.closedPos.x, 0, door.closedPos.z)
          .distanceTo(_v2.set(this.playerPos.x, 0, this.playerPos.z)) < 4.5
      ) {
        return '[E] Eshikni ochish / yopish';
      }
    }
    if (this.game.mechanic === 'bomb-mission' && this.bombProp && this.bombState === 'planted') {
      if (this.bombProp.position.distanceTo(this.playerPos) < 3.2) {
        const pct = Math.min(100, Math.round((this.defuseHoldProgress / 2.2) * 100));
        return pct > 0
          ? `Zararsizlantirilmoqda... ${pct}%`
          : '[E] Bosib ushlab zararsizlantiring';
      }
    }
    if (this.game.mechanic === 'hostage-rescue') {
      for (const a of this.actors) {
        if (a.role === 'hostage' && !a.following && !a.rescued) {
          if (a.group.position.distanceTo(this.playerPos) < 3.6) {
            return '[E] Garovdagini ozod qilish';
          }
        }
      }
    }
    return null;
  }

  private emitHud() {
    const spec = WEAPONS[this.currentWeaponId];
    const entitiesMinimap: HudSnapshot['entitiesMinimap'] = [];

    for (const a of this.actors) {
      if (!a.alive) continue;
      entitiesMinimap.push({
        x: a.group.position.x,
        z: a.group.position.z,
        kind: a.role === 'enemy' ? 'enemy' : a.role === 'hostage' ? 'objective' : 'ally',
      });
    }
    for (const t of this.targets) {
      if (t.active) {
        entitiesMinimap.push({
          x: t.group.position.x,
          z: t.group.position.z,
          kind: 'target',
        });
      }
    }
    if (this.bombProp && this.bombState === 'planted') {
      entitiesMinimap.push({
        x: this.bombProp.position.x,
        z: this.bombProp.position.z,
        kind: 'objective',
      });
    }

    this.onHudUpdate({
      health: Math.max(0, Math.round(this.health)),
      maxHealth: this.maxHealth,
      armor: Math.max(0, Math.round(this.armor)),
      maxArmor: this.maxArmor,
      ammo: this.ammo,
      maxAmmo: spec.magSize,
      reserveAmmo: this.reserveAmmo,
      reloading: this.reloading,
      reloadProgress: this.reloading
        ? Math.min(1, 1 - this.reloadTimer / spec.reloadTime)
        : 0,
      weaponId: this.currentWeaponId,
      weaponName: spec.nameUz,
      score: this.score,
      kills: this.kills,
      deaths: this.deaths,
      goalProgress: this.goalProgress,
      goalTarget: this.game.targetGoal,
      timeRemaining: Math.max(0, Math.ceil(this.timeRemaining)),
      round: this.round,
      roundsTotal: this.game.roundsTotal,
      allyAlive: this.actors.filter((a) => a.role === 'ally' && a.alive).length + 1,
      enemyAlive: this.actors.filter((a) => a.role === 'enemy' && a.alive).length,
      missionText: this.game.missionDesc,
      targetColorHint:
        this.game.mechanic === 'color-match' ? this.targetColorObj.uz : undefined,
      isScoped: this.isScoped,
      cameraMode: this.cameraMode,
      isPaused: this.isPaused,
      isPointerLocked: this.isPointerLocked,
      bombState: this.bombState,
      bombTimer: Math.max(0, Math.ceil(this.bombTimer)),
      interactPrompt: this.computeInteractPrompt(),
      hitMarkerAt: this.hitMarkerAt,
      damageFlashAt: this.damageFlashAt,
      killFeed: this.killFeed,
      playerPos: { x: this.playerPos.x, z: this.playerPos.z, yaw: this.yaw },
      entitiesMinimap,
      status: this.status,
      endReason: this.endReason,
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = this.clock.elapsedTime;

      if (!this.isPaused && this.status === 'playing') {
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);

        if (this.reloading) {
          this.reloadTimer -= dt;
          if (this.reloadTimer <= 0) {
            const spec = WEAPONS[this.currentWeaponId];
            const needed = spec.magSize - this.ammo;
            const take = Math.min(needed, this.reserveAmmo);
            this.ammo += take;
            this.reserveAmmo -= take;
            this.reloading = false;
          }
        }

        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
          this.timeRemaining = 0;
          if (this.game.ageGroup === '3-5' && this.goalProgress > 0) {
            this.finishGame(true, `Ajoyib harakat! ${this.goalProgress} ta nishon to‘plandi!`);
          } else {
            this.finishGame(false, 'Vaqt tugadi! Qayta urinib ko‘ring.');
          }
        }

        this.updatePlayer(dt);
        this.updateWorldDynamics(dt, elapsed);
        this.updateEffects(dt);

        this.hudEmitTimer += dt;
        if (this.hudEmitTimer >= 0.08) {
          this.hudEmitTimer = 0;
          this.emitHud();
        }
      }

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }

    this.clearDynamicEntities();
    this.builtMap.dispose();
    this.shadowTex.dispose();
    this.particleGeo.dispose();
    this.smokeGeo.dispose();
    this.envTarget?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

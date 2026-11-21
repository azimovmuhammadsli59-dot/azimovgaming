import * as THREE from 'three';
import {
  createCrateTexture,
  createGridFloorTexture,
  createWallPanelTexture,
} from './textures.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildGameMap(game, maxAnisotropy, enableShadows) {
  const rng = mulberry32(game.mapSeed);
  const root = new THREE.Group();
  const colliders = [];
  const worldMeshes = [];
  const doors = [];
  const movingPlatforms = [];
  const physicsCrates = [];

  const geometries = [];
  const materials = [];
  const textures = [];

  const trackGeo = (g) => {
    geometries.push(g);
    return g;
  };
  const trackMat = (m) => {
    materials.push(m);
    return m;
  };

  const p = game.mapPalette;
  const arenaHalf = game.ageGroup === '3-5' ? 24 : 30;

  const floorTex = createGridFloorTexture(p.groundColor, p.groundAccent, maxAnisotropy, 4);
  textures.push(floorTex);
  floorTex.repeat.set(arenaHalf / 2, arenaHalf / 2);

  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: game.mapFeatures.isOutdoor ? 0.05 : 0.25,
    }),
  );

  const terrainSize = game.mapFeatures.isOutdoor ? 220 : arenaHalf * 2 + 4;
  const floorMesh = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(terrainSize, terrainSize)),
    floorMat,
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = enableShadows;
  root.add(floorMesh);
  worldMeshes.push(floorMesh);

  if (game.mapFeatures.hasWaterPlane) {
    const waterMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#0284c7',
        roughness: 0.12,
        metalness: 0.65,
        transparent: true,
        opacity: 0.82,
      }),
    );
    const waterMesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(240, 240)),
      waterMat,
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -0.35;
    root.add(waterMesh);
  }

  const wallTex = createWallPanelTexture(p.wallColor, p.trimColor, maxAnisotropy);
  textures.push(wallTex);
  wallTex.repeat.set(2, 1);

  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.7,
      metalness: game.mapFeatures.isOutdoor ? 0.1 : 0.35,
    }),
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: p.trimColor,
      roughness: 0.35,
      metalness: 0.6,
    }),
  );

  const accentGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: p.accentColor,
      emissive: p.accentColor,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.4,
    }),
  );

  const crateTex = createCrateTexture(p.groundAccent, p.accentColor, maxAnisotropy);
  textures.push(crateTex);
  const crateMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: crateTex,
      roughness: 0.65,
      metalness: 0.18,
    }),
  );

  const addSolidBox = (x, y, z, w, h, d, mat = wallMat, cast = true) => {
    const geo = trackGeo(new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = enableShadows && cast;
    mesh.receiveShadow = enableShadows;
    root.add(mesh);
    worldMeshes.push(mesh);
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y,
      maxY: y + h,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
    return mesh;
  };

  if (!game.mapFeatures.isOutdoor) {
    const wallH = 8.5;
    addSolidBox(0, 0, -arenaHalf, arenaHalf * 2 + 2, wallH, 1.5);
    addSolidBox(0, 0, arenaHalf, arenaHalf * 2 + 2, wallH, 1.5);
    addSolidBox(-arenaHalf, 0, 0, 1.5, wallH, arenaHalf * 2);
    addSolidBox(arenaHalf, 0, 0, 1.5, wallH, arenaHalf * 2);

    const ceilingMesh = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(arenaHalf * 2 + 2, arenaHalf * 2 + 2)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: '#0f172a',
          roughness: 0.9,
          metalness: 0.2,
        }),
      ),
    );
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = wallH;
    root.add(ceilingMesh);

    for (let z = -arenaHalf + 10; z <= arenaHalf - 10; z += 14) {
      const strip = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(arenaHalf * 1.4, 0.25, 0.8)),
        accentGlowMat,
      );
      strip.position.set(0, wallH - 0.15, z);
      root.add(strip);
    }
  } else {
    const fenceH = game.ageGroup === '3-5' ? 1.8 : 2.6;
    addSolidBox(0, 0, -arenaHalf, arenaHalf * 2, fenceH, 1.2, trimMat);
    addSolidBox(0, 0, arenaHalf, arenaHalf * 2, fenceH, 1.2, trimMat);
    addSolidBox(-arenaHalf, 0, 0, 1.2, fenceH, arenaHalf * 2, trimMat);
    addSolidBox(arenaHalf, 0, 0, 1.2, fenceH, arenaHalf * 2, trimMat);

    const rockCount = 48;
    const rockGeo = trackGeo(new THREE.DodecahedronGeometry(3.2, 0));
    const rockMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: p.wallColor,
        roughness: 0.85,
        metalness: 0.05,
      }),
    );
    const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2 + rng() * 0.2;
      const dist = arenaHalf + 10 + rng() * 48;
      const sx = 0.8 + rng() * 2.2;
      const sy = 1.2 + rng() * 3.8;
      const sz = 0.8 + rng() * 2.2;
      dummy.position.set(Math.cos(angle) * dist, sy * 1.1, Math.sin(angle) * dist);
      dummy.rotation.set(rng() * 0.3, rng() * Math.PI, rng() * 0.3);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      rockInst.setMatrixAt(i, dummy.matrix);
      color.set(p.wallColor).offsetHSL(0, 0, (rng() - 0.5) * 0.15);
      rockInst.setColorAt(i, color);
    }
    rockInst.computeBoundingSphere();
    root.add(rockInst);
  }

  if (game.mapFeatures.hasMaze) {
    const mazeBlocks = [
      [-10, -8, 10, 1.5],
      [8, -8, 10, 1.5],
      [-6, 0, 1.5, 12],
      [6, 0, 1.5, 12],
      [-12, 10, 9, 1.5],
      [10, 10, 9, 1.5],
      [0, -14, 1.5, 8],
      [0, 14, 1.5, 8],
    ];
    mazeBlocks.forEach(([bx, bz, bw, bd]) => {
      addSolidBox(bx, 0, bz, bw, 3.2, bd);
    });
  } else {
    const layoutStyle = game.mapSeed % 3;
    if (layoutStyle === 0) {
      addSolidBox(-5, 0, 0, 2.2, 4.2, 7.5);
      addSolidBox(5, 0, 0, 2.2, 4.2, 7.5);
      addSolidBox(0, 0, -9, 8, 3.2, 2);
      addSolidBox(0, 0, 9, 8, 3.2, 2);
    } else if (layoutStyle === 1) {
      addSolidBox(0, 0, 0, 5.5, 3.8, 5.5);
      addSolidBox(-11, 0, -6, 6, 3.2, 2.2);
      addSolidBox(11, 0, 6, 6, 3.2, 2.2);
      addSolidBox(-11, 0, 8, 2.2, 3.2, 6);
      addSolidBox(11, 0, -8, 2.2, 3.2, 6);
    } else {
      [-9, 9].forEach((px) => {
        [-9, 9].forEach((pz) => {
          addSolidBox(px, 0, pz, 3.4, 4.5, 3.4);
        });
      });
      addSolidBox(0, 0, 0, 3.6, 2.2, 3.6, trimMat);
    }

    const coverCount = game.ageGroup === '3-5' ? 6 : 10;
    for (let i = 0; i < coverCount; i++) {
      const cx = (rng() - 0.5) * (arenaHalf * 1.45);
      const cz = (rng() - 0.5) * (arenaHalf * 1.45);
      if (Math.abs(cz) > arenaHalf - 7 && Math.abs(cx) < 8) continue;
      if (Math.hypot(cx, cz) < 5.5) continue;
      const w = 1.6 + rng() * 2.4;
      const h = 1.3 + rng() * 1.8;
      const d = 1.6 + rng() * 2.4;
      addSolidBox(cx, 0, cz, w, h, d, i % 2 === 0 ? crateMat : wallMat);
    }
  }

  if (game.mapFeatures.hasDoors) {
    [
      [-13, 0],
      [13, 0],
    ].forEach(([dx, dz], idx) => {
      addSolidBox(dx, 0, dz - 2.4, 1.1, 4.2, 1.1, trimMat);
      addSolidBox(dx, 0, dz + 2.4, 1.1, 4.2, 1.1, trimMat);

      const doorW = 0.45;
      const doorH = 3.6;
      const doorD = 3.6;
      const doorMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(doorW, doorH, doorD)),
        trackMat(
          new THREE.MeshStandardMaterial({
            color: p.accentColor,
            roughness: 0.35,
            metalness: 0.7,
          }),
        ),
      );
      const closedPos = new THREE.Vector3(dx, doorH / 2, dz);
      const openPos = new THREE.Vector3(dx, doorH / 2 + 3.4, dz);
      doorMesh.position.copy(closedPos);
      doorMesh.castShadow = enableShadows;
      doorMesh.receiveShadow = enableShadows;
      root.add(doorMesh);
      worldMeshes.push(doorMesh);

      const colliderIndex = colliders.length;
      colliders.push({
        minX: dx - doorW / 2,
        maxX: dx + doorW / 2,
        minY: 0,
        maxY: doorH,
        minZ: dz - doorD / 2,
        maxZ: dz + doorD / 2,
        isDoor: true,
        doorId: `door_${idx}`,
      });

      doors.push({
        id: `door_${idx}`,
        mesh: doorMesh,
        closedPos,
        openPos,
        openAmount: 0,
        targetOpen: 0,
        colliderIndex,
      });
    });
  }

  if (game.mapFeatures.hasCatwalks) {
    const platMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: p.trimColor,
        roughness: 0.4,
        metalness: 0.65,
      }),
    );
    addSolidBox(-arenaHalf + 4.5, 0, 0, 5.5, 3.0, 12, platMat);
    addSolidBox(arenaHalf - 4.5, 0, 0, 5.5, 3.0, 12, platMat);
    addSolidBox(-arenaHalf + 4.5, 0, 7.5, 3.5, 1.5, 3, crateMat);
    addSolidBox(arenaHalf - 4.5, 0, -7.5, 3.5, 1.5, 3, crateMat);
  }

  if (game.mapFeatures.hasMovingPlatforms) {
    const mMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: p.accentColor,
        roughness: 0.3,
        metalness: 0.55,
      }),
    );
    const platA = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4, 0.5, 4)), mMat);
    platA.position.set(-10, 1.4, -12);
    platA.castShadow = enableShadows;
    root.add(platA);
    movingPlatforms.push({
      mesh: platA,
      basePos: platA.position.clone(),
      axis: 'y',
      amplitude: 1.1,
      speed: 1.4,
      phase: 0,
    });

    const platB = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4, 0.5, 4)), mMat);
    platB.position.set(10, 1.4, 12);
    platB.castShadow = enableShadows;
    root.add(platB);
    movingPlatforms.push({
      mesh: platB,
      basePos: platB.position.clone(),
      axis: 'x',
      amplitude: 3.5,
      speed: 1.1,
      phase: Math.PI / 2,
    });
  }

  if (game.mapFeatures.hasPhysicsCrates) {
    [
      [-4, 5],
      [4, -5],
      [-7, -11],
      [7, 11],
    ].forEach(([kx, kz]) => {
      const size = 1.35;
      const mesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(size, size, size)),
        crateMat,
      );
      mesh.position.set(kx, size / 2, kz);
      mesh.castShadow = enableShadows;
      mesh.receiveShadow = enableShadows;
      root.add(mesh);
      worldMeshes.push(mesh);

      const cIdx = colliders.length;
      colliders.push({
        minX: kx - size / 2,
        maxX: kx + size / 2,
        minY: 0,
        maxY: size,
        minZ: kz - size / 2,
        maxZ: kz + size / 2,
      });

      physicsCrates.push({
        mesh,
        velocity: new THREE.Vector3(),
        halfSize: size / 2,
        colliderIndex: cIdx,
      });
    });
  }

  const bombSites = [new THREE.Vector3(-12, 0, -14), new THREE.Vector3(12, 0, -14)];
  if (game.mapFeatures.hasBombSites) {
    bombSites.forEach((site) => {
      const ring = new THREE.Mesh(
        trackGeo(new THREE.RingGeometry(1.7, 2.1, 28)),
        trackMat(
          new THREE.MeshBasicMaterial({
            color: '#ef4444',
            side: THREE.DoubleSide,
          }),
        ),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(site.x, 0.04, site.z);
      root.add(ring);
    });
  }

  const extractionZone = new THREE.Vector3(0, 0, arenaHalf - 5);
  if (game.mapFeatures.hasHostages || game.mapFeatures.hasFlags) {
    const extRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(2.0, 2.5, 32)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#10b981',
          side: THREE.DoubleSide,
        }),
      ),
    );
    extRing.rotation.x = -Math.PI / 2;
    extRing.position.set(extractionZone.x, 0.04, extractionZone.z);
    root.add(extRing);
  }

  let snowPoints = null;
  if (game.mapFeatures.hasWeatherSnow) {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() - 0.5) * arenaHalf * 2.4;
      positions[i * 3 + 1] = rng() * 18;
      positions[i * 3 + 2] = (rng() - 0.5) * arenaHalf * 2.4;
    }
    const snowGeo = trackGeo(new THREE.BufferGeometry());
    snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const snowMat = trackMat(
      new THREE.PointsMaterial({
        color: '#ffffff',
        size: 0.22,
        transparent: true,
        opacity: 0.78,
      }),
    );
    snowPoints = new THREE.Points(snowGeo, snowMat);
    root.add(snowPoints);
  }

  return {
    root,
    colliders,
    worldMeshes,
    doors,
    movingPlatforms,
    physicsCrates,
    spawnPlayer: new THREE.Vector3(0, 0, arenaHalf - 5),
    spawnAllies: [
      new THREE.Vector3(-4, 0, arenaHalf - 6),
      new THREE.Vector3(4, 0, arenaHalf - 6),
      new THREE.Vector3(-8, 0, arenaHalf - 7),
    ],
    spawnEnemies: [
      new THREE.Vector3(-12, 0, -arenaHalf + 6),
      new THREE.Vector3(12, 0, -arenaHalf + 6),
      new THREE.Vector3(0, 0, -arenaHalf + 5),
      new THREE.Vector3(-15, 0, -4),
      new THREE.Vector3(15, 0, -4),
      new THREE.Vector3(0, 0, -14),
    ],
    bombSites,
    extractionZone,
    homeFlagPos: new THREE.Vector3(0, 0, arenaHalf - 5),
    enemyFlagPos: new THREE.Vector3(0, 0, -arenaHalf + 5),
    arenaHalfExtent: arenaHalf,
    snowPoints,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

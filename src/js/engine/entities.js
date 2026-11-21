import * as THREE from 'three';

export function createActorMesh(options) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: options.primaryColor,
    roughness: options.isCartoon ? 0.35 : 0.6,
    metalness: options.isCartoon ? 0.25 : 0.15,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: options.isCartoon ? '#e2e8f0' : '#1e293b',
    roughness: 0.3,
    metalness: 0.72,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: options.accentColor,
    emissive: options.accentColor,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    metalness: 0.85,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.75,
    metalness: 0.2,
  });

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshBasicMaterial({
      map: options.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.2, 0.7, 0);
  const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.26);
  const lLegMesh = new THREE.Mesh(legGeo, darkMat);
  lLegMesh.position.y = -0.35;
  lLegMesh.castShadow = true;
  leftLeg.add(lLegMesh);
  const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.34), armorMat);
  lBoot.position.set(0, -0.62, 0.04);
  leftLeg.add(lBoot);
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.2, 0.7, 0);
  const rLegMesh = new THREE.Mesh(legGeo, darkMat);
  rLegMesh.position.y = -0.35;
  rLegMesh.castShadow = true;
  rightLeg.add(rLegMesh);
  const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.34), armorMat);
  rBoot.position.set(0, -0.62, 0.04);
  rightLeg.add(rBoot);
  group.add(rightLeg);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.78, 0.42),
    bodyMat,
  );
  torso.position.y = 1.09;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.48, 0.47),
    armorMat,
  );
  chestPlate.position.y = 1.15;
  group.add(chestPlate);

  const coreBadge = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.12, 0.5),
    visorMat,
  );
  coreBadge.position.y = 1.18;
  group.add(coreBadge);

  const head = new THREE.Group();
  head.position.set(0, 1.66, 0);
  const helmet = new THREE.Mesh(
    options.isCartoon
      ? new THREE.BoxGeometry(0.52, 0.44, 0.48)
      : new THREE.BoxGeometry(0.42, 0.4, 0.44),
    options.isCartoon ? bodyMat : armorMat,
  );
  helmet.castShadow = true;
  head.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.14, 0.08),
    visorMat,
  );
  visor.position.set(0, 0.02, 0.23);
  head.add(visor);

  if (options.isCartoon) {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8),
      armorMat,
    );
    stem.position.y = 0.32;
    head.add(stem);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), visorMat);
    bulb.position.y = 0.45;
    head.add(bulb);
  }
  group.add(head);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.46, 1.38, 0);
  const lArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), bodyMat);
  lArmMesh.position.y = -0.26;
  lArmMesh.castShadow = true;
  leftArm.add(lArmMesh);
  const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.28), armorMat);
  leftArm.add(lPauldron);
  group.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.46, 1.38, 0);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), bodyMat);
  rArmMesh.position.y = -0.26;
  rArmMesh.castShadow = true;
  rightArm.add(rArmMesh);
  const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.28), armorMat);
  rightArm.add(rPauldron);

  if (options.role === 'enemy' || options.role === 'ally') {
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.65),
      darkMat,
    );
    gun.position.set(0, -0.35, 0.32);
    rightArm.add(gun);
    rightArm.rotation.x = -Math.PI / 3;
  }
  group.add(rightArm);

  const hitTarget = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.95, 0.85),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitTarget.position.y = 0.98;
  group.add(hitTarget);

  return {
    group,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    visorMat,
    hitTarget,
  };
}

export function createViewModelWeapon(weaponId) {
  const group = new THREE.Group();

  const receiverMat = new THREE.MeshStandardMaterial({
    color: weaponId === 'wand' ? '#38bdf8' : weaponId === 'blaster' ? '#0ea5e9' : '#1e293b',
    roughness: 0.32,
    metalness: 0.78,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: weaponId === 'wand' ? '#f472b6' : '#0f172a',
    roughness: 0.8,
    metalness: 0.1,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: weaponId === 'wand' ? '#fde047' : weaponId === 'blaster' ? '#22d3ee' : '#f59e0b',
    emissive: weaponId === 'wand' ? '#fde047' : weaponId === 'blaster' ? '#22d3ee' : '#f59e0b',
    emissiveIntensity: weaponId === 'wand' || weaponId === 'blaster' ? 1.2 : 0.45,
    roughness: 0.25,
    metalness: 0.6,
  });

  if (weaponId === 'wand') {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.038, 0.42, 12),
      gripMat,
    );
    handle.rotation.x = Math.PI / 2.3;
    handle.position.set(0.24, -0.22, -0.42);
    group.add(handle);

    const starTip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.085, 0),
      accentMat,
    );
    starTip.position.set(0.24, -0.06, -0.66);
    group.add(starTip);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.015, 8, 24),
      receiverMat,
    );
    ring.position.set(0.24, -0.06, -0.66);
    group.add(ring);
  } else {
    const length =
      weaponId === 'sniper' ? 0.92 : weaponId === 'rifle' ? 0.72 : weaponId === 'pistol' ? 0.36 : 0.56;

    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.11, length * 0.65),
      receiverMat,
    );
    receiver.position.set(0.26, -0.22, -0.45);
    group.add(receiver);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, length * 0.65, 10),
      gripMat,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.26, -0.195, -0.45 - length * 0.42);
    group.add(barrel);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.15, 0.075),
      gripMat,
    );
    mag.position.set(0.26, -0.32, -0.46);
    mag.rotation.x = 0.2;
    group.add(mag);

    const optic = new THREE.Mesh(
      weaponId === 'sniper'
        ? new THREE.CylinderGeometry(0.032, 0.032, 0.28, 12)
        : new THREE.BoxGeometry(0.048, 0.048, 0.12),
      gripMat,
    );
    if (weaponId === 'sniper') optic.rotation.x = Math.PI / 2;
    optic.position.set(0.26, -0.14, -0.45);
    group.add(optic);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.084, 0.02, length * 0.4),
      accentMat,
    );
    strip.position.set(0.26, -0.2, -0.48);
    group.add(strip);
  }

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0.26, -0.18, weaponId === 'sniper' ? -1.05 : -0.82);
  group.add(muzzlePoint);

  const muzzleFlash = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.24, 6),
    new THREE.MeshBasicMaterial({
      color: weaponId === 'wand' ? '#fde047' : weaponId === 'blaster' ? '#38bdf8' : '#fbbf24',
      transparent: true,
      opacity: 0.9,
    }),
  );
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.copy(muzzlePoint.position);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  return { group, muzzlePoint, muzzleFlash };
}

export function createTargetProp(kind, colorHex) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: kind === 'star' || kind === 'crystal' || kind === 'checkpoint' ? 0.55 : 0.2,
    roughness: 0.25,
    metalness: kind === 'bomb' ? 0.7 : 0.2,
  });

  if (kind === 'ring') {
    const outer = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.11, 12, 24), mat);
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }),
    );
    inner.rotation.x = Math.PI / 2;
    const bullseye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), mat);
    group.add(outer, inner, bullseye);
  } else if (kind === 'fruit') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), mat);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 }),
    );
    stem.position.y = 0.48;
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.14),
      new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.5 }),
    );
    leaf.position.set(0.12, 0.52, 0);
    leaf.rotation.z = 0.3;
    group.add(body, stem, leaf);
  } else if (kind === 'crystal') {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.48, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4, metalness: 0.5 }),
    );
    base.position.y = -0.5;
    group.add(core, base);
  } else if (kind === 'star') {
    const starA = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), mat);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.05, 8, 24),
      new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: colorHex, emissiveIntensity: 0.7 }),
    );
    group.add(starA, halo);
  } else if (kind === 'checkpoint') {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.2, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6, roughness: 0.3 }),
    );
    pad.position.y = 0.07;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 2.2, 12),
      new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.45, emissive: colorHex, emissiveIntensity: 0.8 }),
    );
    pillar.position.y = 1.1;
    const topOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), mat);
    topOrb.position.y = 2.35;
    group.add(pad, pillar, topOrb);
  } else if (kind === 'bomb') {
    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.35, 0.55),
      new THREE.MeshStandardMaterial({ color: '#27272a', metalness: 0.7, roughness: 0.3 }),
    );
    caseMesh.position.y = 0.18;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.06, 0.3),
      new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#10b981', emissiveIntensity: 0.6 }),
    );
    panel.position.y = 0.37;
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 12),
      new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.5 }),
    );
    beacon.position.set(0.22, 0.42, 0);
    group.add(caseMesh, panel, beacon);
  } else if (kind === 'flag') {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.85, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.6, roughness: 0.4 }),
    );
    base.position.y = 0.075;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 2.6, 10),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.8, roughness: 0.2 }),
    );
    pole.position.y = 1.3;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.05), mat);
    cloth.position.set(0.48, 2.25, 0);
    group.add(base, pole, cloth);
  } else {
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mat);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.06, 8, 20),
      new THREE.MeshStandardMaterial({ color: '#fde047', emissive: '#fde047', emissiveIntensity: 0.6 }),
    );
    group.add(core, ring);
  }

  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  if (kind === 'checkpoint' || kind === 'flag') {
    hitTarget.position.y = 1.2;
  }
  group.add(hitTarget);

  return { group, hitTarget };
}

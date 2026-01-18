// ==========================================
// functions.js - アバター・エフェクト・ユーティリティ
// ==========================================

import * as THREE from "three";

// 照明設定（時間帯別）
export function getLighting() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return { ambient: 0xfff5e6, ambientIntensity: 0.6, dir: 0xffeedd, dirIntensity: 0.8, name: "morning" };
  if (hour >= 10 && hour < 17) return { ambient: 0xffffff, ambientIntensity: 0.7, dir: 0xffffff, dirIntensity: 1.0, name: "day" };
  if (hour >= 17 && hour < 20) return { ambient: 0xffddbb, ambientIntensity: 0.5, dir: 0xff9966, dirIntensity: 0.7, name: "evening" };
  return { ambient: 0x334455, ambientIntensity: 0.3, dir: 0x6688aa, dirIntensity: 0.4, name: "night" };
}

// ローポリ人間アバター生成
export function createHumanAvatar(colors) {
  const group = new THREE.Group();
  const { skin, shirt, pants, hair } = colors;

  // 頭
  const headGeo = new THREE.SphereGeometry(0.22, 12, 10);
  const headMat = new THREE.MeshStandardMaterial({ color: skin, flatShading: true });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.55;
  group.add(head);

  // 髪
  const hairGeo = new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, flatShading: true });
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.y = 1.65;
  group.add(hairMesh);

  // 首
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
  const neck = new THREE.Mesh(neckGeo, new THREE.MeshStandardMaterial({ color: skin, flatShading: true }));
  neck.position.y = 1.28;
  group.add(neck);

  // 胴体
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8);
  const torso = new THREE.Mesh(torsoGeo, new THREE.MeshStandardMaterial({ color: shirt, flatShading: true }));
  torso.position.y = 0.97;
  group.add(torso);

  // 腰
  const hipGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.15, 8);
  const hip = new THREE.Mesh(hipGeo, new THREE.MeshStandardMaterial({ color: pants, flatShading: true }));
  hip.position.y = 0.65;
  group.add(hip);

  // 腕
  const armMat = new THREE.MeshStandardMaterial({ color: shirt, flatShading: true });
  const handMat = new THREE.MeshStandardMaterial({ color: skin, flatShading: true });

  const leftArm = new THREE.Group();
  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), armMat);
  leftUpperArm.position.y = -0.15;
  leftArm.add(leftUpperArm);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), handMat);
  leftHand.position.y = -0.35;
  leftArm.add(leftHand);
  leftArm.position.set(-0.28, 1.1, 0);
  leftArm.name = "leftArm";
  group.add(leftArm);

  const rightArm = new THREE.Group();
  const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), armMat);
  rightUpperArm.position.y = -0.15;
  rightArm.add(rightUpperArm);
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), handMat);
  rightHand.position.y = -0.35;
  rightArm.add(rightHand);
  rightArm.position.set(0.28, 1.1, 0);
  rightArm.name = "rightArm";
  group.add(rightArm);

  // 足
  const legMat = new THREE.MeshStandardMaterial({ color: pants, flatShading: true });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true });

  const leftLeg = new THREE.Group();
  const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), legMat);
  leftThigh.position.y = -0.25;
  leftLeg.add(leftThigh);
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.14), shoeMat);
  leftFoot.position.set(0, -0.52, 0.03);
  leftLeg.add(leftFoot);
  leftLeg.position.set(-0.1, 0.5, 0);
  leftLeg.name = "leftLeg";
  group.add(leftLeg);

  const rightLeg = new THREE.Group();
  const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8), legMat);
  rightThigh.position.y = -0.25;
  rightLeg.add(rightThigh);
  const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.14), shoeMat);
  rightFoot.position.set(0, -0.52, 0.03);
  rightLeg.add(rightFoot);
  rightLeg.position.set(0.1, 0.5, 0);
  rightLeg.name = "rightLeg";
  group.add(rightLeg);

  // 影
  const shadowGeo = new THREE.CircleGeometry(0.3, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

// ローポリ犬アバター生成
export function createDogAvatar(colors) {
  const group = new THREE.Group();
  const { body, ear } = colors;

  const bodyMat = new THREE.MeshStandardMaterial({ color: body, flatShading: true });
  const earMat = new THREE.MeshStandardMaterial({ color: ear, flatShading: true });

  // 胴体
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.6), bodyMat);
  bodyMesh.position.set(0, 0.35, 0);
  group.add(bodyMesh);

  // 頭
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.28), bodyMat);
  headMesh.position.set(0, 0.5, 0.35);
  group.add(headMesh);

  // マズル
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.15), bodyMat);
  muzzle.position.set(0, 0.42, 0.52);
  group.add(muzzle);

  // 鼻
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  nose.position.set(0, 0.44, 0.6);
  group.add(nose);

  // 目
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
  leftEye.position.set(-0.08, 0.55, 0.47);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
  rightEye.position.set(0.08, 0.55, 0.47);
  group.add(rightEye);

  // 耳
  const leftEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), earMat);
  leftEar.position.set(-0.12, 0.7, 0.3);
  leftEar.rotation.set(0.2, 0, 0.3);
  group.add(leftEar);
  const rightEar = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), earMat);
  rightEar.position.set(0.12, 0.7, 0.3);
  rightEar.rotation.set(0.2, 0, -0.3);
  group.add(rightEar);

  // 足
  const positions = [[-0.12, 0.12, 0.2], [0.12, 0.12, 0.2], [-0.12, 0.12, -0.2], [0.12, 0.12, -0.2]];
  positions.forEach(pos => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), earMat);
    leg.position.set(...pos);
    group.add(leg);
  });

  // しっぽ
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.25, 6), bodyMat);
  tail.position.set(0, 0.5, -0.35);
  tail.rotation.x = -0.8;
  tail.name = "tail";
  group.add(tail);

  // 影
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

// 人間歩行アニメーション
export function animateHuman(avatar, time, isMoving) {
  const leftArm = avatar.getObjectByName("leftArm");
  const rightArm = avatar.getObjectByName("rightArm");
  const leftLeg = avatar.getObjectByName("leftLeg");
  const rightLeg = avatar.getObjectByName("rightLeg");

  const swing = isMoving ? Math.sin(time * 10) * 0.5 : 0;

  if (leftArm) leftArm.rotation.x = swing;
  if (rightArm) rightArm.rotation.x = -swing;
  if (leftLeg) leftLeg.rotation.x = -swing * 0.7;
  if (rightLeg) rightLeg.rotation.x = swing * 0.7;
}

// 犬歩行アニメーション
export function animateDog(avatar, time, isMoving) {
  const tail = avatar.getObjectByName("tail");
  if (tail) {
    tail.rotation.z = Math.sin(time * 8) * 0.4;
  }
}

// 豆を作成
export function createBean() {
  const geo = new THREE.SphereGeometry(0.1, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ color: 0xd4a574, flatShading: true });
  const bean = new THREE.Mesh(geo, mat);
  bean.scale.set(1, 0.7, 0.8);
  return bean;
}

// パーティクル（埃）
export function createDustParticles(count = 100) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 1] = Math.random() * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.4,
    depthWrite: false
  });

  return new THREE.Points(geo, mat);
}

// シャンデリア作成（1階用）
export function createChandelier() {
  const group = new THREE.Group();
  
  // 中央の軸
  const chainMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 8), chainMat);
  chain.position.y = 1;
  group.add(chain);
  
  // 本体
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), bodyMat);
  group.add(body);
  
  // 腕（6本）
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 1.2, 8), bodyMat);
    arm.position.set(Math.cos(angle) * 0.4, -0.3, Math.sin(angle) * 0.4);
    arm.rotation.z = Math.cos(angle) * 0.5;
    arm.rotation.x = Math.sin(angle) * 0.5;
    group.add(arm);
    
    // 電球
    const bulbGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(Math.cos(angle) * 1.2, -0.8, Math.sin(angle) * 1.2);
    group.add(bulb);
    
    // ポイントライト
    const light = new THREE.PointLight(0xfff5e0, 0.5, 15);
    light.position.copy(bulb.position);
    group.add(light);
  }
  
  return group;
}

// VIPシャンデリア作成（2階用・豪華版）
export function createVIPChandelier() {
  const group = new THREE.Group();
  
  // 中央の軸（太め）
  const chainMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.1 });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), chainMat);
  chain.position.y = 0.75;
  group.add(chain);
  
  // 本体（装飾的）
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), bodyMat);
  group.add(body);
  
  // 腕（8本・2層）
  for (let layer = 0; layer < 2; layer++) {
    const armCount = 4;
    const radius = layer === 0 ? 1.0 : 0.6;
    const yPos = layer === 0 ? -0.4 : 0.2;
    
    for (let i = 0; i < armCount; i++) {
      const angle = (i / armCount) * Math.PI * 2 + (layer * Math.PI / 4);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 1.0, 8), bodyMat);
      arm.position.set(Math.cos(angle) * radius * 0.4, yPos, Math.sin(angle) * radius * 0.4);
      arm.rotation.z = Math.cos(angle) * 0.6;
      arm.rotation.x = Math.sin(angle) * 0.6;
      group.add(arm);
      
      // 電球（ゴールドがかった光）
      const bulbGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(Math.cos(angle) * radius, yPos - 0.5, Math.sin(angle) * radius);
      group.add(bulb);
      
      // ポイントライト（ゴールド）
      const light = new THREE.PointLight(0xffd700, 0.6, 12);
      light.position.copy(bulb.position);
      group.add(light);
    }
  }
  
  return group;
}

// 特殊NFT用オーラエフェクト
export function createAuraParticles(position) {
  const particleCount = 30;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 1.5 + Math.random() * 0.5;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffd700,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });

  const particles = new THREE.Points(geo, mat);
  particles.position.copy(position);
  
  return particles;
}

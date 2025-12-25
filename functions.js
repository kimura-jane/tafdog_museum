// ==========================================
// function.js - アバター・インタラクション・エフェクト
// ==========================================

import * as THREE from "three";

// ==========================================
// 照明システム（時間帯で変化）
// ==========================================

export function getLightingByTime() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = jst.getUTCHours();

  // 朝 (6-10)
  if (hour >= 6 && hour < 10) {
    return {
      ambient: { color: 0xfff5e6, intensity: 0.6 },
      directional: { color: 0xffeedd, intensity: 0.8 },
      name: "morning"
    };
  }
  // 昼 (10-17)
  if (hour >= 10 && hour < 17) {
    return {
      ambient: { color: 0xffffff, intensity: 0.7 },
      directional: { color: 0xffffff, intensity: 1.0 },
      name: "day"
    };
  }
  // 夕方 (17-20)
  if (hour >= 17 && hour < 20) {
    return {
      ambient: { color: 0xffddbb, intensity: 0.5 },
      directional: { color: 0xff9966, intensity: 0.7 },
      name: "evening"
    };
  }
  // 夜 (20-6)
  return {
    ambient: { color: 0x334455, intensity: 0.3 },
    directional: { color: 0x6688aa, intensity: 0.4 },
    name: "night"
  };
}

// ==========================================
// ローポリ人間アバター生成
// ==========================================

export function createHumanAvatar(colors = {}) {
  const {
    skin = 0xffdbac,
    shirt = 0x4a90d9,
    pants = 0x2d3436,
    hair = 0x3d2314
  } = colors;

  const group = new THREE.Group();

  // 頭（丸みのある形状）
  const headGeo = new THREE.SphereGeometry(0.22, 12, 10);
  const headMat = new THREE.MeshStandardMaterial({ color: skin, flatShading: true });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.55;
  head.scale.set(1, 1.1, 0.95);
  group.add(head);

  // 髪
  const hairGeo = new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, flatShading: true });
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.y = 1.6;
  hairMesh.scale.set(1, 0.8, 1);
  group.add(hairMesh);

  // 首
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
  const neckMat = new THREE.MeshStandardMaterial({ color: skin, flatShading: true });
  const neck = new THREE.Mesh(neckGeo, neckMat);
  neck.position.y = 1.28;
  group.add(neck);

  // 胴体（台形っぽく）
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.5, 8);
  const torsoMat = new THREE.MeshStandardMaterial({ color: shirt, flatShading: true });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 0.97;
  group.add(torso);

  // 腰
  const hipGeo = new THREE.CylinderGeometry(0.2, 0.18, 0.15, 8);
  const hipMat = new THREE.MeshStandardMaterial({ color: pants, flatShading: true });
  const hip = new THREE.Mesh(hipGeo, hipMat);
  hip.position.y = 0.65;
  group.add(hip);

  // 左腕
  const leftArm = createArm(skin, shirt);
  leftArm.position.set(-0.28, 1.15, 0);
  leftArm.rotation.z = 0.15;
  group.add(leftArm);
  group.userData.leftArm = leftArm;

  // 右腕
  const rightArm = createArm(skin, shirt);
  rightArm.position.set(0.28, 1.15, 0);
  rightArm.rotation.z = -0.15;
  group.add(rightArm);
  group.userData.rightArm = rightArm;

  // 左足
  const leftLeg = createLeg(skin, pants);
  leftLeg.position.set(-0.1, 0.55, 0);
  group.add(leftLeg);
  group.userData.leftLeg = leftLeg;

  // 右足
  const rightLeg = createLeg(skin, pants);
  rightLeg.position.set(0.1, 0.55, 0);
  group.add(rightLeg);
  group.userData.rightLeg = rightLeg;

  // 影
  const shadowGeo = new THREE.CircleGeometry(0.3, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ 
    color: 0x000000, 
    transparent: true, 
    opacity: 0.3,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

function createArm(skinColor, shirtColor) {
  const arm = new THREE.Group();

  // 上腕
  const upperArmGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.25, 8);
  const upperArmMat = new THREE.MeshStandardMaterial({ color: shirtColor, flatShading: true });
  const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
  upperArm.position.y = -0.12;
  arm.add(upperArm);

  // 前腕
  const forearmGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8);
  const forearmMat = new THREE.MeshStandardMaterial({ color: skinColor, flatShading: true });
  const forearm = new THREE.Mesh(forearmGeo, forearmMat);
  forearm.position.y = -0.32;
  arm.add(forearm);
  arm.userData.forearm = forearm;

  // 手
  const handGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const handMat = new THREE.MeshStandardMaterial({ color: skinColor, flatShading: true });
  const hand = new THREE.Mesh(handGeo, handMat);
  hand.position.y = -0.45;
  arm.add(hand);
  arm.userData.hand = hand;

  return arm;
}

function createLeg(skinColor, pantsColor) {
  const leg = new THREE.Group();

  // 太もも
  const thighGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.28, 8);
  const thighMat = new THREE.MeshStandardMaterial({ color: pantsColor, flatShading: true });
  const thigh = new THREE.Mesh(thighGeo, thighMat);
  thigh.position.y = -0.14;
  leg.add(thigh);

  // ふくらはぎ
  const calfGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.26, 8);
  const calfMat = new THREE.MeshStandardMaterial({ color: pantsColor, flatShading: true });
  const calf = new THREE.Mesh(calfGeo, calfMat);
  calf.position.y = -0.4;
  leg.add(calf);

  // 足
  const footGeo = new THREE.BoxGeometry(0.08, 0.05, 0.14);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x222222, flatShading: true });
  const foot = new THREE.Mesh(footGeo, footMat);
  foot.position.set(0, -0.55, 0.03);
  leg.add(foot);

  return leg;
}

// ==========================================
// ローポリ犬アバター生成
// ==========================================

export function createDogAvatar(colors = {}) {
  const {
    body = 0xd4a574,
    ear = 0xc49464,
    nose = 0x333333
  } = colors;

  const group = new THREE.Group();

  // 胴体
  const bodyGeo = new THREE.BoxGeometry(0.35, 0.3, 0.6);
  const bodyMat = new THREE.MeshStandardMaterial({ color: body, flatShading: true });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, 0.35, 0);
  group.add(bodyMesh);

  // 頭
  const headGeo = new THREE.BoxGeometry(0.3, 0.28, 0.28);
  const headMat = new THREE.MeshStandardMaterial({ color: body, flatShading: true });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 0.5, 0.35);
  group.add(headMesh);
  group.userData.head = headMesh;

  // マズル（鼻先）
  const muzzleGeo = new THREE.BoxGeometry(0.15, 0.12, 0.15);
  const muzzleMat = new THREE.MeshStandardMaterial({ color: body, flatShading: true });
  const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
  muzzle.position.set(0, 0.42, 0.52);
  group.add(muzzle);

  // 鼻
  const noseGeo = new THREE.BoxGeometry(0.06, 0.05, 0.03);
  const noseMat = new THREE.MeshStandardMaterial({ color: nose, flatShading: true });
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseMesh.position.set(0, 0.44, 0.6);
  group.add(noseMesh);

  // 目
  const eyeGeo = new THREE.SphereGeometry(0.035, 8, 6);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.08, 0.55, 0.47);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.08, 0.55, 0.47);
  group.add(rightEye);

  // 耳
  const earGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
  const earMat = new THREE.MeshStandardMaterial({ color: ear, flatShading: true });
  
  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-0.12, 0.7, 0.3);
  leftEar.rotation.z = 0.3;
  leftEar.rotation.x = 0.2;
  group.add(leftEar);
  group.userData.leftEar = leftEar;
  
  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(0.12, 0.7, 0.3);
  rightEar.rotation.z = -0.3;
  rightEar.rotation.x = 0.2;
  group.add(rightEar);
  group.userData.rightEar = rightEar;

  // 足 x 4
  const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: ear, flatShading: true });

  const frontLeftLeg = new THREE.Mesh(legGeo, legMat);
  frontLeftLeg.position.set(-0.12, 0.12, 0.2);
  group.add(frontLeftLeg);
  group.userData.frontLeftLeg = frontLeftLeg;

  const frontRightLeg = new THREE.Mesh(legGeo, legMat);
  frontRightLeg.position.set(0.12, 0.12, 0.2);
  group.add(frontRightLeg);
  group.userData.frontRightLeg = frontRightLeg;

  const backLeftLeg = new THREE.Mesh(legGeo, legMat);
  backLeftLeg.position.set(-0.12, 0.12, -0.2);
  group.add(backLeftLeg);
  group.userData.backLeftLeg = backLeftLeg;

  const backRightLeg = new THREE.Mesh(legGeo, legMat);
  backRightLeg.position.set(0.12, 0.12, -0.2);
  group.add(backRightLeg);
  group.userData.backRightLeg = backRightLeg;

  // しっぽ
  const tailGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.25, 6);
  const tailMat = new THREE.MeshStandardMaterial({ color: body, flatShading: true });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0.5, -0.35);
  tail.rotation.x = -0.8;
  group.add(tail);
  group.userData.tail = tail;

  // 影
  const shadowGeo = new THREE.CircleGeometry(0.25, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

// ==========================================
// 人間の歩行アニメーション
// ==========================================

export function animateHumanWalk(avatar, time, isMoving) {
  const { leftArm, rightArm, leftLeg, rightLeg } = avatar.userData;
  if (!leftArm || !rightArm || !leftLeg || !rightLeg) return;

  const speed = 10;
  const swing = isMoving ? 0.5 : 0;
  const t = time * speed;

  leftArm.rotation.x = Math.sin(t) * swing;
  rightArm.rotation.x = Math.sin(t + Math.PI) * swing;
  leftLeg.rotation.x = Math.sin(t + Math.PI) * swing * 0.7;
  rightLeg.rotation.x = Math.sin(t) * swing * 0.7;
}

// ==========================================
// 犬の歩行アニメーション
// ==========================================

export function animateDogWalk(avatar, time, isMoving) {
  const { frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg, tail, head } = avatar.userData;
  if (!frontLeftLeg) return;

  const speed = 12;
  const swing = isMoving ? 0.3 : 0;
  const t = time * speed;

  if (frontLeftLeg) frontLeftLeg.rotation.x = Math.sin(t) * swing;
  if (frontRightLeg) frontRightLeg.rotation.x = Math.sin(t + Math.PI) * swing;
  if (backLeftLeg) backLeftLeg.rotation.x = Math.sin(t + Math.PI) * swing;
  if (backRightLeg) backRightLeg.rotation.x = Math.sin(t) * swing;

  // しっぽ振り
  if (tail) {
    tail.rotation.z = Math.sin(time * 8) * 0.4;
  }

  // 頭の揺れ
  if (head && isMoving) {
    head.rotation.y = Math.sin(time * 4) * 0.1;
  }
}

// ==========================================
// 豆投げエフェクト
// ==========================================

export function createBean() {
  const geo = new THREE.SphereGeometry(0.08, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ 
    color: 0xd4a574, 
    flatShading: true 
  });
  const bean = new THREE.Mesh(geo, mat);
  bean.scale.set(1, 0.7, 0.8); // 豆っぽい形
  return bean;
}

export function animateBeanThrow(bean, startPos, targetPos, progress) {
  // 放物線
  const height = 2;
  const t = progress;
  
  bean.position.x = startPos.x + (targetPos.x - startPos.x) * t;
  bean.position.z = startPos.z + (targetPos.z - startPos.z) * t;
  bean.position.y = startPos.y + (targetPos.y - startPos.y) * t + Math.sin(t * Math.PI) * height;
  
  // 回転
  bean.rotation.x += 0.3;
  bean.rotation.y += 0.2;
}

// ==========================================
// 投げるキャラクター（痛がる＆飛んでいく）
// ==========================================

export function createTargetCharacter() {
  const group = new THREE.Group();

  // 簡易的な2D風キャラ（板ポリ）
  const geo = new THREE.PlaneGeometry(2, 3);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");

  // キャラを描画
  if (ctx) {
    // 背景透明
    ctx.clearRect(0, 0, 256, 384);
    
    // 体
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.ellipse(128, 250, 60, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 顔
    ctx.fillStyle = "#ffd93d";
    ctx.beginPath();
    ctx.arc(128, 120, 70, 0, Math.PI * 2);
    ctx.fill();
    
    // 目
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(100, 110, 12, 0, Math.PI * 2);
    ctx.arc(156, 110, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 口
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 145, 25, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.5;
  group.add(mesh);

  group.userData.hitCount = 0;
  group.userData.isHurt = false;
  group.userData.isFlyingAway = false;
  group.userData.mesh = mesh;
  group.userData.originalTexture = texture;

  return group;
}

// 痛がるエフェクト
export function showHurtEffect(character) {
  character.userData.isHurt = true;
  
  // 赤くフラッシュ
  const mesh = character.userData.mesh;
  if (mesh && mesh.material) {
    mesh.material.color.setHex(0xff0000);
    setTimeout(() => {
      mesh.material.color.setHex(0xffffff);
      character.userData.isHurt = false;
    }, 200);
  }
}

// 飛んでいくアニメーション
export function animateFlyAway(character, deltaTime) {
  if (!character.userData.isFlyingAway) return false;

  character.position.y += deltaTime * 5;
  character.rotation.z += deltaTime * 3;
  character.scale.multiplyScalar(0.98);

  // 十分上に行ったら非表示
  if (character.position.y > 20) {
    character.visible = false;
    return true; // 完了
  }
  return false;
}

// ==========================================
// パーティクル（埃）
// ==========================================

export function createDustParticles(count = 50) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = Math.random() * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    velocities.push({
      x: (Math.random() - 0.5) * 0.01,
      y: (Math.random() - 0.5) * 0.005,
      z: (Math.random() - 0.5) * 0.01
    });
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(geometry, material);
  particles.userData.velocities = velocities;

  return particles;
}

export function animateDust(particles, time) {
  const positions = particles.geometry.attributes.position.array;
  const velocities = particles.userData.velocities;

  for (let i = 0; i < velocities.length; i++) {
    positions[i * 3] += velocities[i].x;
    positions[i * 3 + 1] += Math.sin(time + i) * 0.002;
    positions[i * 3 + 2] += velocities[i].z;

    // 範囲外に出たらリセット
    if (Math.abs(positions[i * 3]) > 15) positions[i * 3] *= -0.9;
    if (Math.abs(positions[i * 3 + 2]) > 15) positions[i * 3 + 2] *= -0.9;
    if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] = 8;
    if (positions[i * 3 + 1] > 8) positions[i * 3 + 1] = 0;
  }

  particles.geometry.attributes.position.needsUpdate = true;
}

// ==========================================
// アバターカラーバリエーション
// ==========================================

export const HUMAN_COLORS = [
  { skin: 0xffdbac, shirt: 0x4a90d9, pants: 0x2d3436, hair: 0x3d2314 },
  { skin: 0xf1c27d, shirt: 0xe74c3c, pants: 0x1a1a2e, hair: 0x1a1a1a },
  { skin: 0xffdbac, shirt: 0x2ecc71, pants: 0x2c3e50, hair: 0x5d4e37 },
  { skin: 0xd4a574, shirt: 0x9b59b6, pants: 0x2d3436, hair: 0x1a1a1a },
  { skin: 0xffdbac, shirt: 0xf39c12, pants: 0x34495e, hair: 0x8b4513 },
  { skin: 0xf1c27d, shirt: 0x1abc9c, pants: 0x2c3e50, hair: 0x3d2314 },
  { skin: 0xffdbac, shirt: 0xe91e63, pants: 0x263238, hair: 0xd4a574 },
  { skin: 0xd4a574, shirt: 0x3498db, pants: 0x1a1a2e, hair: 0x2c1810 }
];

export const DOG_COLORS = [
  { body: 0xd4a574, ear: 0xc49464, nose: 0x333333 }, // 茶色
  { body: 0xf5f5dc, ear: 0xe8e8d0, nose: 0x333333 }, // クリーム
  { body: 0x1a1a1a, ear: 0x0d0d0d, nose: 0x333333 }, // 黒
  { body: 0xffffff, ear: 0xeeeeee, nose: 0x333333 }, // 白
  { body: 0x8b4513, ear: 0x6b3510, nose: 0x222222 }, // 濃い茶
  { body: 0xd2691e, ear: 0xb8581a, nose: 0x333333 }, // チョコ
  { body: 0xa0522d, ear: 0x8b4726, nose: 0x222222 }, // シエナ
  { body: 0xdeb887, ear: 0xcfa876, nose: 0x333333 }  // バーリーウッド
];

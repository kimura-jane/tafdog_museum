// ==========================================
// app.js - メインアプリケーション
// ==========================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  fetchAllNFTData,
  getImageUrl,
  getStateImageUrl,
  NFT_CONFIG,
  CHANGE_RULES
} from "./data.js";
import {
  createHumanAvatar,
  createDogAvatar,
  createTargetCharacter,
  createBean,
  createDustParticles,
  animateHumanWalk,
  animateDogWalk,
  animateBeanThrow,
  animateFlyAway,
  animateDust,
  showHurtEffect,
  getLightingByTime,
  HUMAN_COLORS,
  DOG_COLORS
} from "./function.js";

// ==========================================
// グローバル変数
// ==========================================

let scene, camera, renderer, controls;
let player, playerAvatar;
let isDogMode = false;
let isFlying = false;
let currentFloor = 1; // 1 = 一般美術館, 2 = 運営オフィス
let moveVector = { x: 0, y: 0 };
let playerPosition = new THREE.Vector3(0, 0, 5);
let playerVelocity = new THREE.Vector3();
let playerRotation = 0;

// NFTデータ
let nftData = null;
let artFrames = [];

// NPC犬たち
let npcDogs = [];
const NPC_DOG_COUNT = 5;

// 豆投げ関連
let targetCharacters = [];
let beans = [];
let throwCooldown = 0;

// パーティクル
let dustParticles = null;

// 部屋サイズ
const ROOM_SIZE = 40;
const WALL_HEIGHT = 12;

// 色インデックス
let humanColorIndex = 0;
let dogColorIndex = 0;

// ==========================================
// 初期化
// ==========================================

async function init() {
  // シーン
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  scene.fog = new THREE.Fog(0x111111, 10, 50);

  // カメラ
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 3, 8);

  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById("root").appendChild(renderer.domElement);

  // コントロール
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.target.set(0, 1, 0);

  // NFTデータ取得
  nftData = await fetchAllNFTData();
  console.log("NFT Data loaded:", nftData);

  // 照明設定
  setupLighting();

  // 部屋作成
  createRoom(currentFloor);

  // プレイヤー作成
  createPlayer();

  // NPC犬作成
  createNPCDogs();

  // 豆投げターゲット作成
  createTargetCharacters();

  // パーティクル
  dustParticles = createDustParticles(80);
  scene.add(dustParticles);

  // UI作成
  createUI();

  // イベントリスナー
  setupEventListeners();

  // ローディング非表示
  document.getElementById("loading").style.display = "none";

  // アニメーションループ
  animate();
}

// ==========================================
// 照明設定
// ==========================================

function setupLighting() {
  const lighting = getLightingByTime();

  // 環境光
  const ambient = new THREE.AmbientLight(
    lighting.ambient.color,
    lighting.ambient.intensity
  );
  ambient.name = "ambientLight";
  scene.add(ambient);

  // ディレクショナルライト
  const directional = new THREE.DirectionalLight(
    lighting.directional.color,
    lighting.directional.intensity
  );
  directional.position.set(10, 20, 10);
  directional.castShadow = true;
  directional.shadow.mapSize.width = 2048;
  directional.shadow.mapSize.height = 2048;
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 50;
  directional.shadow.camera.left = -20;
  directional.shadow.camera.right = 20;
  directional.shadow.camera.top = 20;
  directional.shadow.camera.bottom = -20;
  directional.name = "directionalLight";
  scene.add(directional);
}

// ==========================================
// 部屋作成
// ==========================================

function createRoom(floor) {
  // 既存の部屋要素を削除
  const toRemove = [];
  scene.traverse((child) => {
    if (child.userData.isRoomElement || child.userData.isArtFrame) {
      toRemove.push(child);
    }
  });
  toRemove.forEach((obj) => scene.remove(obj));
  artFrames = [];

  if (floor === 1) {
    createMuseumRoom();
  } else {
    createOfficeRoom();
  }
}

// 1階: 美術館風
function createMuseumRoom() {
  // 床（大理石風）
  const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    roughness: 0.2,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.isRoomElement = true;
  scene.add(floor);

  // 壁の色
  const wallColor = 0xfafafa;
  createWalls(wallColor);

  // 天井
  const ceilingGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  ceiling.userData.isRoomElement = true;
  scene.add(ceiling);

  // 階段
  createStairs();

  // NFT展示（一般所有）
  if (nftData && nftData.publicNFTs) {
    displayNFTs(nftData.publicNFTs);
  }
}

// 2階: オフィス風
function createOfficeRoom() {
  // 床（フローリング風）
  const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    roughness: 0.8,
    metalness: 0
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.isRoomElement = true;
  scene.add(floor);

  // 壁の色（落ち着いたグレー）
  const wallColor = 0xe0e0e0;
  createWalls(wallColor);

  // 天井
  const ceilingGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  ceiling.userData.isRoomElement = true;
  scene.add(ceiling);

  // 階段
  createStairs();

  // オフィス家具
  createOfficeFurniture();

  // NFT展示（運営所有）
  if (nftData && nftData.ownerNFTs) {
    displayNFTs(nftData.ownerNFTs);
  }
}

function createWalls(color) {
  const wallMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.9,
    metalness: 0
  });

  // 北壁
  const northWall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE, WALL_HEIGHT, 0.5),
    wallMat
  );
  northWall.position.set(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2);
  northWall.receiveShadow = true;
  northWall.userData.isRoomElement = true;
  scene.add(northWall);

  // 南壁
  const southWall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE, WALL_HEIGHT, 0.5),
    wallMat
  );
  southWall.position.set(0, WALL_HEIGHT / 2, ROOM_SIZE / 2);
  southWall.receiveShadow = true;
  southWall.userData.isRoomElement = true;
  scene.add(southWall);

  // 東壁
  const eastWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, WALL_HEIGHT, ROOM_SIZE),
    wallMat
  );
  eastWall.position.set(ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
  eastWall.receiveShadow = true;
  eastWall.userData.isRoomElement = true;
  scene.add(eastWall);

  // 西壁
  const westWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, WALL_HEIGHT, ROOM_SIZE),
    wallMat
  );
  westWall.position.set(-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
  westWall.receiveShadow = true;
  westWall.userData.isRoomElement = true;
  scene.add(westWall);
}

function createStairs() {
  const stairGroup = new THREE.Group();
  stairGroup.userData.isRoomElement = true;

  const stepCount = 10;
  const stepWidth = 3;
  const stepHeight = 0.3;
  const stepDepth = 0.4;

  for (let i = 0; i < stepCount; i++) {
    const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.7
    });
    const step = new THREE.Mesh(stepGeo, stepMat);
    step.position.set(0, stepHeight / 2 + i * stepHeight, -ROOM_SIZE / 2 + 3 + i * stepDepth);
    step.castShadow = true;
    step.receiveShadow = true;
    stairGroup.add(step);
  }

  // 階段のインタラクションエリア
  const triggerGeo = new THREE.BoxGeometry(stepWidth + 1, 3, stepCount * stepDepth + 2);
  const triggerMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    visible: false
  });
  const trigger = new THREE.Mesh(triggerGeo, triggerMat);
  trigger.position.set(0, 1.5, -ROOM_SIZE / 2 + 3 + (stepCount * stepDepth) / 2);
  trigger.userData.isStairTrigger = true;
  stairGroup.add(trigger);

  scene.add(stairGroup);
}

function createOfficeFurniture() {
  // デスク
  const deskGeo = new THREE.BoxGeometry(3, 0.8, 1.5);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x5d4e37 });
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.set(-12, 0.4, -12);
  desk.castShadow = true;
  desk.userData.isRoomElement = true;
  scene.add(desk);

  // 椅子
  const chairGroup = new THREE.Group();
  const seatGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const seat = new THREE.Mesh(seatGeo, seatMat);
  seat.position.y = 0.5;
  chairGroup.add(seat);

  const backGeo = new THREE.BoxGeometry(0.6, 0.8, 0.1);
  const back = new THREE.Mesh(backGeo, seatMat);
  back.position.set(0, 0.9, -0.25);
  chairGroup.add(back);

  chairGroup.position.set(-12, 0, -10.5);
  chairGroup.userData.isRoomElement = true;
  scene.add(chairGroup);

  // 観葉植物
  const potGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 8);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(15, 0.25, -15);
  pot.userData.isRoomElement = true;
  scene.add(pot);

  const plantGeo = new THREE.ConeGeometry(0.8, 2, 8);
  const plantMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const plant = new THREE.Mesh(plantGeo, plantMat);
  plant.position.set(15, 1.5, -15);
  plant.userData.isRoomElement = true;
  scene.add(plant);
}

// ==========================================
// NFT展示
// ==========================================

function displayNFTs(nfts) {
  const perWall = Math.ceil(nfts.length / 4);
  const spacing = (ROOM_SIZE - 8) / Math.max(perWall, 1);

  nfts.forEach((nft, index) => {
    const wallIndex = Math.floor(index / perWall);
    const posIndex = index % perWall;
    const offset = (posIndex - (perWall - 1) / 2) * spacing;

    let position, rotation;

    switch (wallIndex) {
      case 0: // 北壁
        position = new THREE.Vector3(offset, 5, -ROOM_SIZE / 2 + 1);
        rotation = new THREE.Euler(0, 0, 0);
        break;
      case 1: // 東壁
        position = new THREE.Vector3(ROOM_SIZE / 2 - 1, 5, offset);
        rotation = new THREE.Euler(0, -Math.PI / 2, 0);
        break;
      case 2: // 南壁
        position = new THREE.Vector3(-offset, 5, ROOM_SIZE / 2 - 1);
        rotation = new THREE.Euler(0, Math.PI, 0);
        break;
      case 3: // 西壁
        position = new THREE.Vector3(-ROOM_SIZE / 2 + 1, 5, -offset);
        rotation = new THREE.Euler(0, Math.PI / 2, 0);
        break;
      default:
        position = new THREE.Vector3(offset, 5, -ROOM_SIZE / 2 + 1);
        rotation = new THREE.Euler(0, 0, 0);
    }

    createArtFrame(nft, position, rotation);
  });
}

function createArtFrame(nft, position, rotation) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.copy(rotation);
  group.userData.isArtFrame = true;
  group.userData.nft = nft;

  // フレーム
  const frameGeo = new THREE.BoxGeometry(4.4, 4.4, 0.2);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.3,
    metalness: 0.1
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.z = 0.1;
  frame.castShadow = true;
  group.add(frame);

  // マット（白い余白）
  const matGeo = new THREE.BoxGeometry(4, 4, 0.05);
  const matMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const mat = new THREE.Mesh(matGeo, matMaterial);
  mat.position.z = 0.2;
  group.add(mat);

  // 画像
  const loader = new THREE.TextureLoader();
  const imageUrl = nft.imageUrl || getImageUrl(nft.tokenId);

  loader.load(
    imageUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const artGeo = new THREE.PlaneGeometry(3.5, 3.5);
      const artMat = new THREE.MeshBasicMaterial({ map: texture });
      const art = new THREE.Mesh(artGeo, artMat);
      art.position.z = 0.25;
      group.add(art);
    },
    undefined,
    (err) => {
      console.warn("Failed to load image:", imageUrl, err);
      // プレースホルダー
      const artGeo = new THREE.PlaneGeometry(3.5, 3.5);
      const artMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const art = new THREE.Mesh(artGeo, artMat);
      art.position.z = 0.25;
      group.add(art);
    }
  );

  // スポットライト
  const spotlight = new THREE.SpotLight(0xffffff, 2);
  spotlight.position.set(0, 3, 2);
  spotlight.target = frame;
  spotlight.angle = Math.PI / 6;
  spotlight.penumbra = 0.5;
  spotlight.decay = 2;
  spotlight.distance = 10;
  group.add(spotlight);
  group.add(spotlight.target);

  // ラベル
  createLabel(group, nft);

  scene.add(group);
  artFrames.push(group);
}

function createLabel(parent, nft) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`TAF DOG #${nft.tokenId}`, 256, 50);

    ctx.font = "24px Arial";
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(`Owner: ${nft.ownerShort}`, 256, 100);

    if (nft.changeRule) {
      ctx.fillStyle = "#ffcc00";
      ctx.font = "20px Arial";
      ctx.fillText(nft.changeRule.rule, 256, 150);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  const labelGeo = new THREE.PlaneGeometry(2.5, 1.25);
  const labelMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true
  });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.set(0, -3, 0.3);
  parent.add(label);
}

// ==========================================
// プレイヤー
// ==========================================

function createPlayer() {
  player = new THREE.Group();

  playerAvatar = createHumanAvatar(HUMAN_COLORS[humanColorIndex]);
  player.add(playerAvatar);

  player.position.copy(playerPosition);
  scene.add(player);
}

function switchAvatar() {
  if (playerAvatar) {
    player.remove(playerAvatar);
  }

  if (isDogMode) {
    playerAvatar = createDogAvatar(DOG_COLORS[dogColorIndex]);
  } else {
    playerAvatar = createHumanAvatar(HUMAN_COLORS[humanColorIndex]);
  }

  player.add(playerAvatar);
}

// ==========================================
// NPC犬
// ==========================================

function createNPCDogs() {
  for (let i = 0; i < NPC_DOG_COUNT; i++) {
    const colorIndex = i % DOG_COLORS.length;
    const dog = createDogAvatar(DOG_COLORS[colorIndex]);

    dog.position.set(
      (Math.random() - 0.5) * (ROOM_SIZE - 10),
      0,
      (Math.random() - 0.5) * (ROOM_SIZE - 10)
    );

    dog.userData.targetPosition = dog.position.clone();
    dog.userData.waitTime = Math.random() * 3;
    dog.userData.isMoving = false;

    scene.add(dog);
    npcDogs.push(dog);
  }
}

function updateNPCDogs(deltaTime, time) {
  npcDogs.forEach((dog) => {
    // 待機時間カウント
    if (dog.userData.waitTime > 0) {
      dog.userData.waitTime -= deltaTime;
      dog.userData.isMoving = false;
      animateDogWalk(dog, time, false);
      return;
    }

    // 目標地点へ移動
    const target = dog.userData.targetPosition;
    const distance = dog.position.distanceTo(target);

    if (distance > 0.5) {
      const direction = new THREE.Vector3()
        .subVectors(target, dog.position)
        .normalize();

      dog.position.add(direction.multiplyScalar(deltaTime * 2));

      // 向きを変える
      const angle = Math.atan2(direction.x, direction.z);
      dog.rotation.y = angle;

      dog.userData.isMoving = true;
    } else {
      // 新しい目標地点を設定
      dog.userData.targetPosition = new THREE.Vector3(
        (Math.random() - 0.5) * (ROOM_SIZE - 10),
        0,
        (Math.random() - 0.5) * (ROOM_SIZE - 10)
      );
      dog.userData.waitTime = 2 + Math.random() * 4;
      dog.userData.isMoving = false;
    }

    animateDogWalk(dog, time, dog.userData.isMoving);
  });
}

// ==========================================
// 豆投げターゲット
// ==========================================

function createTargetCharacters() {
  const positions = [
    new THREE.Vector3(ROOM_SIZE / 2 - 3, 0, ROOM_SIZE / 2 - 3),
    new THREE.Vector3(-ROOM_SIZE / 2 + 3, 0, ROOM_SIZE / 2 - 3),
    new THREE.Vector3(ROOM_SIZE / 2 - 3, 0, -ROOM_SIZE / 2 + 3),
    new THREE.Vector3(-ROOM_SIZE / 2 + 3, 0, -ROOM_SIZE / 2 + 3)
  ];

  positions.forEach((pos) => {
    const character = createTargetCharacter();
    character.position.copy(pos);
    character.userData.rotationSpeed = (Math.random() - 0.5) * 2;
    scene.add(character);
    targetCharacters.push(character);
  });
}

function throwBeanAtTarget() {
  if (throwCooldown > 0) return;
  throwCooldown = 0.5; // 0.5秒のクールダウン

  // 最も近いターゲットを探す
  let closestTarget = null;
  let closestDistance = Infinity;

  targetCharacters.forEach((target) => {
    if (!target.visible || target.userData.isFlyingAway) return;
    const dist = player.position.distanceTo(target.position);
    if (dist < closestDistance && dist < 15) {
      closestDistance = dist;
      closestTarget = target;
    }
  });

  if (!closestTarget) return;

  // 豆を作成
  const bean = createBean();
  bean.position.copy(player.position);
  bean.position.y = 1.2;

  bean.userData.startPos = bean.position.clone();
  bean.userData.targetPos = closestTarget.position.clone();
  bean.userData.targetPos.y = 1.5;
  bean.userData.progress = 0;
  bean.userData.target = closestTarget;

  scene.add(bean);
  beans.push(bean);
}

function updateBeans(deltaTime) {
  const toRemove = [];

  beans.forEach((bean, index) => {
    bean.userData.progress += deltaTime * 2;

    animateBeanThrow(
      bean,
      bean.userData.startPos,
      bean.userData.targetPos,
      bean.userData.progress
    );

    // ヒット判定
    if (bean.userData.progress >= 1) {
      const target = bean.userData.target;
      if (target && target.visible && !target.userData.isFlyingAway) {
        target.userData.hitCount++;
        showHurtEffect(target);

        // 10回で飛んでいく
        if (target.userData.hitCount >= 10) {
          target.userData.isFlyingAway = true;
        }
      }
      toRemove.push(index);
    }
  });

  // 豆を削除
  toRemove.reverse().forEach((index) => {
    scene.remove(beans[index]);
    beans.splice(index, 1);
  });
}

function updateTargetCharacters(deltaTime) {
  targetCharacters.forEach((character) => {
    if (character.userData.isFlyingAway) {
      animateFlyAway(character, deltaTime);
    } else {
      // 回転
      character.rotation.y += character.userData.rotationSpeed * deltaTime;
    }
  });
}

// ==========================================
// プレイヤー更新
// ==========================================

function updatePlayer(deltaTime, time) {
  const isMoving = Math.abs(moveVector.x) > 0.01 || Math.abs(moveVector.y) > 0.01;

  if (isMoving) {
    // カメラの向きに基づいて移動
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const right = new THREE.Vector3()
      .crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0))
      .normalize();

    const moveDirection = new THREE.Vector3()
      .addScaledVector(cameraDirection, moveVector.y)
      .addScaledVector(right, moveVector.x)
      .normalize();

    const speed = isDogMode ? 0.08 : 0.06;
    playerVelocity.lerp(moveDirection.multiplyScalar(speed), 0.15);

    // 向きを変える
    if (moveDirection.length() > 0.01) {
      playerRotation = Math.atan2(moveDirection.x, moveDirection.z);
    }
  } else {
    playerVelocity.lerp(new THREE.Vector3(0, 0, 0), 0.15);
  }

  // 位置更新
  playerPosition.add(playerVelocity);

  // 壁との衝突
  const limit = ROOM_SIZE / 2 - 2;
  playerPosition.x = Math.max(-limit, Math.min(limit, playerPosition.x));
  playerPosition.z = Math.max(-limit, Math.min(limit, playerPosition.z));

  // 高さ（飛行モード）
  const targetY = isFlying ? 5 : 0;
  playerPosition.y = THREE.MathUtils.lerp(playerPosition.y, targetY, 0.05);

  player.position.copy(playerPosition);
  player.rotation.y = playerRotation;

  // アニメーション
  if (isDogMode) {
    animateDogWalk(playerAvatar, time, isMoving);
  } else {
    animateHumanWalk(playerAvatar, time, isMoving);
  }

  // カメラ追従
  const cameraTargetY = isDogMode ? playerPosition.y + 0.5 : playerPosition.y + 1.2;
  controls.target.lerp(
    new THREE.Vector3(playerPosition.x, cameraTargetY, playerPosition.z),
    0.1
  );
  controls.update();

  // 階段判定
  checkStairsTrigger();
}

function checkStairsTrigger() {
  const stairZ = -ROOM_SIZE / 2 + 5;
  const stairX = 2;

  if (
    Math.abs(playerPosition.x) < stairX &&
    playerPosition.z < stairZ &&
    playerPosition.z > -ROOM_SIZE / 2 + 1
  ) {
    // 階段エリアにいる場合、UIに表示
    showFloorChangePrompt(true);
  } else {
    showFloorChangePrompt(false);
  }
}

function showFloorChangePrompt(show) {
  let prompt = document.getElementById("floor-prompt");
  if (show) {
    if (!prompt) {
      prompt = document.createElement("div");
      prompt.id = "floor-prompt";
      prompt.className =
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-lg text-center z-30";
      prompt.innerHTML = `
        <div class="text-lg mb-2">${currentFloor === 1 ? "2階へ上がる" : "1階へ下りる"}</div>
        <button id="change-floor-btn" class="bg-white text-black px-6 py-2 rounded-full font-bold">移動する</button>
      `;
      document.body.appendChild(prompt);

      document.getElementById("change-floor-btn").addEventListener("click", () => {
        changeFloor();
      });
    }
  } else {
    if (prompt) {
      prompt.remove();
    }
  }
}

function changeFloor() {
  currentFloor = currentFloor === 1 ? 2 : 1;
  createRoom(currentFloor);
  playerPosition.set(0, 0, 5);
  player.position.copy(playerPosition);
  updateFloorIndicator();
  showFloorChangePrompt(false);
}

// ==========================================
// UI作成
// ==========================================

function createUI() {
  // UIコンテナ
  const uiContainer = document.createElement("div");
  uiContainer.className = "fixed inset-0 pointer-events-none z-20";
  uiContainer.innerHTML = `
    <!-- ヘッダー -->
    <div class="absolute top-0 left-0 right-0 p-4 flex justify-between items-center pointer-events-auto">
      <h1 class="text-white text-xl font-bold tracking-wider">TAF DOG MUSEUM</h1>
      <div class="flex gap-2">
        <button id="btn-human" class="px-4 py-2 rounded-full bg-white text-black font-bold text-sm transition-all">HUMAN</button>
        <button id="btn-dog" class="px-4 py-2 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-sm transition-all">DOG</button>
      </div>
    </div>

    <!-- フロアインジケーター -->
    <div class="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
      <button id="btn-floor-2" class="w-12 h-12 rounded-lg bg-black/50 text-white/70 border border-white/20 font-bold text-sm transition-all">2F</button>
      <button id="btn-floor-1" class="w-12 h-12 rounded-lg bg-white text-black font-bold text-sm transition-all">1F</button>
    </div>

    <!-- 右サイドボタン -->
    <div class="absolute bottom-32 right-4 flex flex-col gap-3 pointer-events-auto">
      <button id="btn-fly" class="w-14 h-14 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-xs transition-all">FLY</button>
      <button id="btn-throw" class="w-14 h-14 rounded-full bg-red-500/80 text-white border border-red-300 font-bold text-xs transition-all">THROW</button>
    </div>

    <!-- ジョイスティック -->
    <div class="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div id="joystick-base" class="w-32 h-32 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center cursor-pointer">
        <div id="joystick-stick" class="w-12 h-12 rounded-full bg-white shadow-lg"></div>
      </div>
      <div class="text-white/30 text-xs text-center mt-4 tracking-widest">DRAG TO WALK</div>
    </div>
  `;
  document.body.appendChild(uiContainer);

  // イベント設定
  setupUIEvents();
}

function setupUIEvents() {
  // HUMAN/DOGボタン
  document.getElementById("btn-human").addEventListener("click", () => {
    if (isDogMode) {
      isDogMode = false;
      switchAvatar();
      updateModeButtons();
    } else {
      humanColorIndex = (humanColorIndex + 1) % HUMAN_COLORS.length;
      switchAvatar();
    }
  });

  document.getElementById("btn-dog").addEventListener("click", () => {
    if (!isDogMode) {
      isDogMode = true;
      isFlying = false;
      switchAvatar();
      updateModeButtons();
    } else {
      dogColorIndex = (dogColorIndex + 1) % DOG_COLORS.length;
      switchAvatar();
    }
  });

  // FLYボタン
  document.getElementById("btn-fly").addEventListener("click", () => {
    if (!isDogMode) {
      isFlying = !isFlying;
      updateFlyButton();
    }
  });

  // THROWボタン
  document.getElementById("btn-throw").addEventListener("click", () => {
    throwBeanAtTarget();
  });

  // フロアボタン
  document.getElementById("btn-floor-1").addEventListener("click", () => {
    if (currentFloor !== 1) {
      currentFloor = 1;
      createRoom(currentFloor);
      playerPosition.set(0, 0, 5);
      player.position.copy(playerPosition);
      updateFloorIndicator();
    }
  });

  document.getElementById("btn-floor-2").addEventListener("click", () => {
    if (currentFloor !== 2) {
      currentFloor = 2;
      createRoom(currentFloor);
      playerPosition.set(0, 0, 5);
      player.position.copy(playerPosition);
      updateFloorIndicator();
    }
  });

  // ジョイスティック
  setupJoystick();
}

function updateModeButtons() {
  const humanBtn = document.getElementById("btn-human");
  const dogBtn = document.getElementById("btn-dog");
  const flyBtn = document.getElementById("btn-fly");

  if (isDogMode) {
    humanBtn.className = "px-4 py-2 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-sm transition-all";
    dogBtn.className = "px-4 py-2 rounded-full bg-white text-black font-bold text-sm transition-all";
    flyBtn.style.display = "none";
  } else {
    humanBtn.className = "px-4 py-2 rounded-full bg-white text-black font-bold text-sm transition-all";
    dogBtn.className = "px-4 py-2 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-sm transition-all";
    flyBtn.style.display = "flex";
  }
}

function updateFlyButton() {
  const flyBtn = document.getElementById("btn-fly");
  if (isFlying) {
    flyBtn.className = "w-14 h-14 rounded-full bg-blue-500 text-white border border-blue-300 font-bold text-xs transition-all";
  } else {
    flyBtn.className = "w-14 h-14 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-xs transition-all";
  }
}

function updateFloorIndicator() {
  const floor1Btn = document.getElementById("btn-floor-1");
  const floor2Btn = document.getElementById("btn-floor-2");

  if (currentFloor === 1) {
    floor1Btn.className = "w-12 h-12 rounded-lg bg-white text-black font-bold text-sm transition-all";
    floor2Btn.className = "w-12 h-12 rounded-lg bg-black/50 text-white/70 border border-white/20 font-bold text-sm transition-all";
  } else {
    floor1Btn.className = "w-12 h-12 rounded-lg bg-black/50 text-white/70 border border-white/20 font-bold text-sm transition-all";
    floor2Btn.className = "w-12 h-12 rounded-lg bg-white text-black font-bold text-sm transition-all";
  }
}

// ==========================================
// ジョイスティック
// ==========================================

function setupJoystick() {
  const base = document.getElementById("joystick-base");
  const stick = document.getElementById("joystick-stick");
  let active = false;
  const maxDist = 40;

  function handleMove(clientX, clientY) {
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    moveVector.x = dx / maxDist;
    moveVector.y = -dy / maxDist;
  }

  function handleEnd() {
    active = false;
    stick.style.transform = "translate(0, 0)";
    moveVector.x = 0;
    moveVector.y = 0;
  }

  base.addEventListener("mousedown", (e) => {
    active = true;
    handleMove(e.clientX, e.clientY);
  });

  base.addEventListener("touchstart", (e) => {
    active = true;
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  });

  window.addEventListener("mousemove", (e) => {
    if (active) handleMove(e.clientX, e.clientY);
  });

  window.addEventListener("touchmove", (e) => {
    if (active) {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  window.addEventListener("mouseup", handleEnd);
  window.addEventListener("touchend", handleEnd);
}

// ==========================================
// イベントリスナー
// ==========================================

function setupEventListeners() {
  // リサイズ
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // キーボード操作（オプション）
  window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "w": moveVector.y = 1; break;
      case "s": moveVector.y = -1; break;
      case "a": moveVector.x = -1; break;
      case "d": moveVector.x = 1; break;
      case " ": throwBeanAtTarget(); break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.key.toLowerCase()) {
      case "w": case "s": moveVector.y = 0; break;
      case "a": case "d": moveVector.x = 0; break;
    }
  });

  // NFTクリック
  renderer.domElement.addEventListener("click", onCanvasClick);
}

function onCanvasClick(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  for (const intersect of intersects) {
    let obj = intersect.object;
    while (obj.parent) {
      if (obj.userData.isArtFrame) {
        showNFTModal(obj.userData.nft);
        return;
      }
      obj = obj.parent;
    }
  }
}

// ==========================================
// NFTモーダル
// ==========================================

function showNFTModal(nft) {
  // 既存モーダルを削除
  const existing = document.getElementById("nft-modal");
  if (existing) existing.remove();

  const hasChangeRule = CHANGE_RULES[nft.tokenId];
  const imageUrl = getImageUrl(nft.tokenId);
  const stateImageUrl = hasChangeRule ? getStateImageUrl(nft.tokenId) : null;

  const modal = document.createElement("div");
  modal.id = "nft-modal";
  modal.className = "fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4";
  modal.innerHTML = `
    <div class="bg-zinc-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex flex-col md:flex-row">
        <!-- 画像エリア -->
        <div class="w-full md:w-1/2 bg-black p-8 flex flex-col items-center justify-center gap-4">
          <img src="${imageUrl}" alt="TAF DOG #${nft.tokenId}" class="max-w-full max-h-[40vh] object-contain" />
          ${stateImageUrl ? `
            <div class="text-white/50 text-sm">↓ 変化後 ↓</div>
            <img src="${stateImageUrl}" alt="TAF DOG #${nft.tokenId} (変化後)" class="max-w-full max-h-[30vh] object-contain opacity-80" />
          ` : ""}
        </div>
        
        <!-- 情報エリア -->
        <div class="w-full md:w-1/2 p-8">
          <h2 class="text-3xl font-bold text-white mb-4">TAF DOG #${nft.tokenId}</h2>
          
          <div class="space-y-4">
            <div>
              <div class="text-white/50 text-sm mb-1">Owner</div>
              <div class="text-white font-mono text-sm">${nft.owner || "Unknown"}</div>
            </div>
            
            ${hasChangeRule ? `
              <div>
                <div class="text-white/50 text-sm mb-1">変化条件</div>
                <div class="text-yellow-400">${hasChangeRule.rule}</div>
              </div>
            ` : ""}
            
            <div class="text-white/60 text-sm leading-relaxed">
              TAF DOGコレクションのユニークな作品。ローポリゴンの美学と、どこか哀愁漂う表情が特徴です。
            </div>
          </div>
          
          <div class="mt-8 flex gap-4">
            <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" target="_blank" 
               class="bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors">
              OpenSea
            </a>
            <button id="close-modal" class="bg-zinc-700 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-zinc-600 transition-colors">
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 閉じるボタン
  document.getElementById("close-modal").addEventListener("click", () => {
    modal.remove();
  });

  // 背景クリックで閉じる
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// ==========================================
// アニメーションループ
// ==========================================

let lastTime = 0;

function animate(currentTime = 0) {
  requestAnimationFrame(animate);

  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  const time = currentTime / 1000;

  // クールダウン更新
  if (throwCooldown > 0) {
    throwCooldown -= deltaTime;
  }

  // 更新
  updatePlayer(deltaTime, time);
  updateNPCDogs(deltaTime, time);
  updateBeans(deltaTime);
  updateTargetCharacters(deltaTime);

  // パーティクル
  if (dustParticles) {
    animateDust(dustParticles, time);
  }

  // レンダリング
  renderer.render(scene, camera);
}

// ==========================================
// 起動
// ==========================================

init().catch(console.error);

// ==========================================
// app.js - TAF DOG MUSEUM メインアプリケーション
// ==========================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { NFT_CONFIG, CHANGE_RULES, generateNFTData, ROOM_SIZE, WALL_HEIGHT, TARGET_IMAGES, HUMAN_COLORS, DOG_COLORS } from "./data.js";
import { getLighting, createHumanAvatar, createDogAvatar, animateHuman, animateDog, createBean, createTargetCharacter, createDustParticles } from "./functions.js";

// ==========================================
// グローバル変数
// ==========================================
let scene, camera, renderer, controls;
let player, playerAvatar;
let isDogMode = false;
let isAutoMode = false;
let autoTarget = null;
let isFlyMode = false;
let currentFloor = 1;
let allNFTs = [];
let nftMeshes = [];
let beans = [];
let targets = [];
let npcDogs = [];
let dustParticles;
let moveVector = new THREE.Vector3();
let keys = {};

// 投げるアニメーション用
let isThrowingAnimation = false;
let throwAnimationTime = 0;

const ALCHEMY_API_KEY = "NzzY5_VyMSoXXD0XqZpDL";

// ==========================================
// 初期化
// ==========================================
async function init() {
  // NFTデータ生成
  allNFTs = generateNFTData();
  
  // オーナー情報取得
  await fetchOwners();
  
  // シーン作成
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  
  // カメラ
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);
  
  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('root').appendChild(renderer.domElement);
  
  // コントロール
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2.1;
  
  // 照明
  setupLighting();
  
  // 部屋作成
  createRoom();
  
  // プレイヤー作成
  createPlayer();
  
  // NPC犬作成
  createNPCDogs();
  
  // ターゲット作成
  createTargets();
  
  // ダストパーティクル
  dustParticles = createDustParticles(100);
  scene.add(dustParticles);
  
  // UI作成
  createUI();
  
  // イベントリスナー
  setupEventListeners();
  
  // ローディング非表示
  document.getElementById('loading').style.display = 'none';
  
  // アニメーション開始
  animate();
}

// ==========================================
// オーナー情報取得（Alchemy API）
// ==========================================
async function fetchOwners() {
  try {
    const url = `https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getOwnersForContract?contractAddress=${NFT_CONFIG.contractAddress}&withTokenBalances=true`;
    const response = await fetch(url);
    const data = await response.json();
    
    const ownerMap = {};
    if (data.owners) {
      data.owners.forEach(ownerData => {
        if (ownerData.tokenBalances) {
          ownerData.tokenBalances.forEach(token => {
            let tokenId = token.tokenId;
            // 16進数の場合は10進数に変換
            if (tokenId.startsWith('0x')) {
              tokenId = parseInt(tokenId, 16).toString();
            }
            ownerMap[tokenId] = ownerData.ownerAddress;
          });
        }
      });
    }
    
    // NFTにオーナー情報を設定
    allNFTs.forEach(nft => {
      const owner = ownerMap[nft.tokenId];
      if (owner) {
        nft.owner = owner;
        nft.ownerShort = owner.slice(0, 6) + '...' + owner.slice(-4);
      } else {
        nft.ownerShort = 'Not minted';
      }
    });
    
    console.log('Owners loaded:', Object.keys(ownerMap).length);
  } catch (error) {
    console.warn('Owner fetch failed:', error);
    allNFTs.forEach(nft => {
      nft.ownerShort = 'N/A';
    });
  }
}

// ==========================================
// 照明設定
// ==========================================
function setupLighting() {
  // 環境光
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  
  // メイン照明
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(10, 30, 10);
  mainLight.castShadow = true;
  scene.add(mainLight);
  
  // 補助照明
  const subLight = new THREE.DirectionalLight(0xffffff, 0.8);
  subLight.position.set(-10, 25, -10);
  scene.add(subLight);
  
  // 床からの反射光
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(0, -10, 0);
  scene.add(fillLight);
}

// ==========================================
// 部屋作成
// ==========================================
function createRoom() {
  // 既存の部屋要素を削除
  const toRemove = [];
  scene.traverse(child => {
    if (child.userData.isRoom || child.userData.isNFT || child.userData.isSpotlight) {
      toRemove.push(child);
    }
  });
  toRemove.forEach(obj => scene.remove(obj));
  nftMeshes = [];
  
  const isMuseum = currentFloor === 1;
  const floorColor = isMuseum ? 0xb0b0b0 : 0xa08060;
  const wallColor = isMuseum ? 0xe8e8e8 : 0xd0c0a0;
  
  // 床
  const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.6 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.isRoom = true;
  scene.add(floor);
  
  // 壁
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 });
  
  // 北壁
  const northWallGeo = new THREE.BoxGeometry(ROOM_SIZE, WALL_HEIGHT, 0.3);
  const northWall = new THREE.Mesh(northWallGeo, wallMat);
  northWall.position.set(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2);
  northWall.receiveShadow = true;
  northWall.userData.isRoom = true;
  scene.add(northWall);
  
  // 南壁
  const southWall = new THREE.Mesh(northWallGeo, wallMat);
  southWall.position.set(0, WALL_HEIGHT / 2, ROOM_SIZE / 2);
  southWall.receiveShadow = true;
  southWall.userData.isRoom = true;
  scene.add(southWall);
  
  // 東壁
  const eastWallGeo = new THREE.BoxGeometry(0.3, WALL_HEIGHT, ROOM_SIZE);
  const eastWall = new THREE.Mesh(eastWallGeo, wallMat);
  eastWall.position.set(ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
  eastWall.receiveShadow = true;
  eastWall.userData.isRoom = true;
  scene.add(eastWall);
  
  // 西壁
  const westWall = new THREE.Mesh(eastWallGeo, wallMat);
  westWall.position.set(-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
  westWall.receiveShadow = true;
  westWall.userData.isRoom = true;
  scene.add(westWall);
  
  // 天井
  const ceilingGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x606060 });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  ceiling.userData.isRoom = true;
  scene.add(ceiling);
  
  // NFTを壁に配置
  placeNFTsOnWalls();
}

// ==========================================
// NFTを壁に配置
// ==========================================
function placeNFTsOnWalls() {
  const nftsToShow = currentFloor === 1 ? allNFTs.slice(0, 80) : allNFTs.slice(80, 100);
  
  const SPACING = 5.0;
  const WALL_OFFSET = 2.0;
  const START_HEIGHT = 2.5;
  
  const wallLength = ROOM_SIZE - 10;
  const nftsPerWall = Math.floor(wallLength / SPACING);
  
  let nftIndex = 0;
  
  // 北壁（内側向き = +Z方向）
  for (let i = 0; i < nftsPerWall && nftIndex < nftsToShow.length; i++) {
    const x = -wallLength / 2 + i * SPACING + SPACING / 2;
    const position = new THREE.Vector3(x, START_HEIGHT, -ROOM_SIZE / 2 + WALL_OFFSET);
    const rotation = new THREE.Euler(0, 0, 0);
    createArtFrame(nftsToShow[nftIndex], position, rotation);
    nftIndex++;
  }
  
  // 南壁（内側向き = -Z方向）
  for (let i = 0; i < nftsPerWall && nftIndex < nftsToShow.length; i++) {
    const x = wallLength / 2 - i * SPACING - SPACING / 2;
    const position = new THREE.Vector3(x, START_HEIGHT, ROOM_SIZE / 2 - WALL_OFFSET);
    const rotation = new THREE.Euler(0, Math.PI, 0);
    createArtFrame(nftsToShow[nftIndex], position, rotation);
    nftIndex++;
  }
  
  // 東壁（内側向き = -X方向）
  for (let i = 0; i < nftsPerWall && nftIndex < nftsToShow.length; i++) {
    const z = -wallLength / 2 + i * SPACING + SPACING / 2;
    const position = new THREE.Vector3(ROOM_SIZE / 2 - WALL_OFFSET, START_HEIGHT, z);
    const rotation = new THREE.Euler(0, -Math.PI / 2, 0);
    createArtFrame(nftsToShow[nftIndex], position, rotation);
    nftIndex++;
  }
  
  // 西壁（内側向き = +X方向）
  for (let i = 0; i < nftsPerWall && nftIndex < nftsToShow.length; i++) {
    const z = wallLength / 2 - i * SPACING - SPACING / 2;
    const position = new THREE.Vector3(-ROOM_SIZE / 2 + WALL_OFFSET, START_HEIGHT, z);
    const rotation = new THREE.Euler(0, Math.PI / 2, 0);
    createArtFrame(nftsToShow[nftIndex], position, rotation);
    nftIndex++;
  }
}

// ==========================================
// アートフレーム作成
// ==========================================
function createArtFrame(nft, position, rotation) {
  const group = new THREE.Group();
  
  // フレーム
  const frameGeo = new THREE.BoxGeometry(3.2, 3.2, 0.1);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.3 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.castShadow = true;
  group.add(frame);
  
  // マット（白い縁）
  const matGeo = new THREE.BoxGeometry(2.8, 2.8, 0.05);
  const matMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const mat = new THREE.Mesh(matGeo, matMat);
  mat.position.z = 0.05;
  group.add(mat);
  
  // 画像
  const imgGeo = new THREE.PlaneGeometry(2.5, 2.5);
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(nft.imageUrl)}&w=512`;
  
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    proxyUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const imgMat = new THREE.MeshStandardMaterial({ 
        map: texture,
        side: THREE.DoubleSide
      });
      const img = new THREE.Mesh(imgGeo, imgMat);
      img.position.z = 0.08;
      group.add(img);
    },
    undefined,
    () => {
      const imgMat = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        side: THREE.DoubleSide
      });
      const img = new THREE.Mesh(imgGeo, imgMat);
      img.position.z = 0.08;
      group.add(img);
    }
  );
  
  // スポットライト器具
  const spotlightGroup = new THREE.Group();
  
  // レール
  const railGeo = new THREE.BoxGeometry(0.8, 0.05, 0.05);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.set(0, 2.0, 0.3);
  spotlightGroup.add(rail);
  
  // ライト本体
  const lightGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const lightBody = new THREE.Mesh(lightGeo, lightMat);
  lightBody.position.set(0, 1.85, 0.3);
  lightBody.rotation.x = Math.PI / 6;
  spotlightGroup.add(lightBody);
  
  group.add(spotlightGroup);
  spotlightGroup.userData.isSpotlight = true;
  
  // 位置と回転を設定
  group.position.copy(position);
  group.rotation.copy(rotation);
  group.userData.isNFT = true;
  group.userData.nftData = nft;
  
  scene.add(group);
  nftMeshes.push(group);
}

// ==========================================
// プレイヤー作成
// ==========================================
function createPlayer() {
  player = new THREE.Group();
  
  if (isDogMode) {
    playerAvatar = createDogAvatar(DOG_COLORS);
  } else {
    playerAvatar = createHumanAvatar(HUMAN_COLORS);
  }
  
  player.add(playerAvatar);
  player.position.set(0, 0, 0);
  scene.add(player);
}

// ==========================================
// アバター切り替え
// ==========================================
function switchAvatar() {
  isDogMode = !isDogMode;
  
  player.remove(playerAvatar);
  
  if (isDogMode) {
    playerAvatar = createDogAvatar(DOG_COLORS);
  } else {
    playerAvatar = createHumanAvatar(HUMAN_COLORS);
    isFlyMode = false;
  }
  
  player.add(playerAvatar);
  updateButtons();
}

// ==========================================
// NPC犬作成
// ==========================================
function createNPCDogs() {
  const colors = [
    { body: 0xffffff, spots: 0x333333 },
    { body: 0xd4a574, spots: 0x8b4513 },
    { body: 0x333333, spots: 0x666666 }
  ];
  
  for (let i = 0; i < 3; i++) {
    const dog = createDogAvatar(colors[i % colors.length]);
    dog.position.set(
      (Math.random() - 0.5) * (ROOM_SIZE - 10),
      0,
      (Math.random() - 0.5) * (ROOM_SIZE - 10)
    );
    dog.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      0,
      (Math.random() - 0.5) * 0.05
    );
    scene.add(dog);
    npcDogs.push(dog);
  }
}

// ==========================================
// ターゲット作成
// ==========================================
function createTargets() {
  TARGET_IMAGES.forEach((url, index) => {
    const target = createTargetCharacter(url);
    const angle = (index / TARGET_IMAGES.length) * Math.PI * 2;
    const radius = ROOM_SIZE / 3;
    target.position.set(
      Math.cos(angle) * radius,
      1.5,
      Math.sin(angle) * radius
    );
    scene.add(target);
    targets.push(target);
  });
}

// ==========================================
// UI作成
// ==========================================
function createUI() {
  // ヘッダー
  const header = document.createElement('div');
  header.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    z-index: 1000;
    display: flex;
    gap: 10px;
  `;
  document.body.appendChild(header);
  
  // HUMANボタン
  const humanBtn = document.createElement('button');
  humanBtn.id = 'btn-human';
  humanBtn.textContent = 'HUMAN';
  humanBtn.style.cssText = `
    padding: 10px 15px;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
  `;
  humanBtn.onclick = () => { if (isDogMode) switchAvatar(); };
  header.appendChild(humanBtn);
  
  // DOGボタン
  const dogBtn = document.createElement('button');
  dogBtn.id = 'btn-dog';
  dogBtn.textContent = 'DOG';
  dogBtn.style.cssText = `
    padding: 10px 15px;
    background: #666;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
  `;
  dogBtn.onclick = () => { if (!isDogMode) switchAvatar(); };
  header.appendChild(dogBtn);
  
  // AUTOボタン
  const autoBtn = document.createElement('button');
  autoBtn.id = 'btn-auto';
  autoBtn.textContent = 'AUTO';
  autoBtn.style.cssText = `
    padding: 10px 15px;
    background: #666;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
  `;
  autoBtn.onclick = () => {
    isAutoMode = !isAutoMode;
    autoTarget = null;
    updateButtons();
  };
  header.appendChild(autoBtn);
  
  // 階層ボタン
  const floorDiv = document.createElement('div');
  floorDiv.style.cssText = `
    position: fixed;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 1000;
  `;
  document.body.appendChild(floorDiv);
  
  const floor2Btn = document.createElement('button');
  floor2Btn.id = 'btn-2f';
  floor2Btn.textContent = '2F';
  floor2Btn.style.cssText = `
    padding: 15px 20px;
    background: #666;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
  `;
  floor2Btn.onclick = () => {
    if (currentFloor !== 2) {
      currentFloor = 2;
      createRoom();
      updateButtons();
    }
  };
  floorDiv.appendChild(floor2Btn);
  
  const floor1Btn = document.createElement('button');
  floor1Btn.id = 'btn-1f';
  floor1Btn.textContent = '1F';
  floor1Btn.style.cssText = `
    padding: 15px 20px;
    background: #fff;
    color: black;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    cursor: pointer;
  `;
  floor1Btn.onclick = () => {
    if (currentFloor !== 1) {
      currentFloor = 1;
      createRoom();
      updateButtons();
    }
  };
  floorDiv.appendChild(floor1Btn);
  
  // FLYボタン（位置固定）
  const flyBtn = document.createElement('button');
  flyBtn.id = 'btn-fly';
  flyBtn.textContent = 'FLY';
  flyBtn.style.cssText = `
    position: fixed;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #333;
    color: white;
    border: 2px solid #666;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    z-index: 1000;
    touch-action: manipulation;
  `;
  flyBtn.onclick = () => {
    if (isDogMode) {
      isFlyMode = !isFlyMode;
      updateButtons();
    }
  };
  document.body.appendChild(flyBtn);
  
  // THROWボタン
  const throwBtn = document.createElement('button');
  throwBtn.id = 'btn-throw';
  throwBtn.textContent = 'THROW';
  throwBtn.style.cssText = `
    position: fixed;
    right: 20px;
    top: calc(50% + 80px);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #d9534f;
    color: white;
    border: none;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    z-index: 1000;
    touch-action: manipulation;
  `;
  throwBtn.onclick = throwBean;
  document.body.appendChild(throwBtn);
  
  // ジョイスティック
  const joystickContainer = document.createElement('div');
  joystickContainer.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    text-align: center;
  `;
  document.body.appendChild(joystickContainer);
  
  const joystick = document.createElement('div');
  joystick.id = 'joystick';
  joystick.style.cssText = `
    width: 120px;
    height: 120px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
    position: relative;
    touch-action: none;
  `;
  joystickContainer.appendChild(joystick);
  
  const joystickKnob = document.createElement('div');
  joystickKnob.id = 'joystick-knob';
  joystickKnob.style.cssText = `
    width: 50px;
    height: 50px;
    background: rgba(255,255,255,0.8);
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  `;
  joystick.appendChild(joystickKnob);
  
  const joystickLabel = document.createElement('div');
  joystickLabel.textContent = 'DRAG TO WALK';
  joystickLabel.style.cssText = `
    color: rgba(255,255,255,0.6);
    font-size: 12px;
    margin-top: 10px;
  `;
  joystickContainer.appendChild(joystickLabel);
  
  // ジョイスティック操作
  setupJoystick(joystick, joystickKnob);
  
  updateButtons();
}

// ==========================================
// ジョイスティック設定
// ==========================================
function setupJoystick(joystick, knob) {
  let isDragging = false;
  const centerX = 60;
  const centerY = 60;
  const maxDistance = 40;
  
  function handleMove(clientX, clientY) {
    const joystickRect = joystick.getBoundingClientRect();
    let x = clientX - joystickRect.left - centerX;
    let y = clientY - joystickRect.top - centerY;
    
    const distance = Math.sqrt(x * x + y * y);
    if (distance > maxDistance) {
      x = (x / distance) * maxDistance;
      y = (y / distance) * maxDistance;
    }
    
    knob.style.left = (centerX + x) + 'px';
    knob.style.top = (centerY + y) + 'px';
    knob.style.transform = 'translate(-50%, -50%)';
    
    moveVector.x = x / maxDistance;
    moveVector.z = y / maxDistance;
  }
  
  function handleEnd() {
    isDragging = false;
    knob.style.left = '50%';
    knob.style.top = '50%';
    knob.style.transform = 'translate(-50%, -50%)';
    moveVector.x = 0;
    moveVector.z = 0;
  }
  
  joystick.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleMove(e.clientX, e.clientY);
  });
  
  joystick.addEventListener('touchstart', (e) => {
    isDragging = true;
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  });
  
  window.addEventListener('mousemove', (e) => {
    if (isDragging) handleMove(e.clientX, e.clientY);
  });
  
  window.addEventListener('touchmove', (e) => {
    if (isDragging) handleMove(e.touches[0].clientX, e.touches[0].clientY);
  });
  
  window.addEventListener('mouseup', handleEnd);
  window.addEventListener('touchend', handleEnd);
}

// ==========================================
// ボタン状態更新
// ==========================================
function updateButtons() {
  const humanBtn = document.getElementById('btn-human');
  const dogBtn = document.getElementById('btn-dog');
  const autoBtn = document.getElementById('btn-auto');
  const flyBtn = document.getElementById('btn-fly');
  const floor1Btn = document.getElementById('btn-1f');
  const floor2Btn = document.getElementById('btn-2f');
  
  if (humanBtn) humanBtn.style.background = isDogMode ? '#666' : '#4a90d9';
  if (dogBtn) dogBtn.style.background = isDogMode ? '#4a90d9' : '#666';
  if (autoBtn) autoBtn.style.background = isAutoMode ? '#4a90d9' : '#666';
  if (flyBtn) {
    flyBtn.style.background = isFlyMode ? '#4a90d9' : '#333';
    flyBtn.style.display = isDogMode ? 'block' : 'none';
  }
  if (floor1Btn) {
    floor1Btn.style.background = currentFloor === 1 ? '#fff' : '#666';
    floor1Btn.style.color = currentFloor === 1 ? '#000' : '#fff';
  }
  if (floor2Btn) {
    floor2Btn.style.background = currentFloor === 2 ? '#fff' : '#666';
    floor2Btn.style.color = currentFloor === 2 ? '#000' : '#fff';
  }
}

// ==========================================
// 豆を投げる（アニメーション付き）
// ==========================================
function throwBean() {
  // アニメーション中は投げない
  if (isThrowingAnimation) return;
  
  // 投げるアニメーション開始
  isThrowingAnimation = true;
  throwAnimationTime = 0;
  
  // 0.3秒後に実際に豆を発射
  setTimeout(() => {
    // 豆のサイズを大きく
    const beanGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const beanMat = new THREE.MeshStandardMaterial({ 
      color: 0xd4a574,
      emissive: 0x442200,
      emissiveIntensity: 0.3
    });
    const bean = new THREE.Mesh(beanGeo, beanMat);
    
    // 投げる位置（手の位置から）
    const throwPos = player.position.clone();
    throwPos.y += 2.0;
    
    // プレイヤーの向きの前方に
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(player.quaternion);
    throwPos.add(forward.multiplyScalar(0.5));
    
    bean.position.copy(throwPos);
    
    // カメラの向きに投げる
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    bean.userData.velocity = direction.multiplyScalar(0.8);
    bean.userData.velocity.y += 0.3;
    bean.userData.gravity = -0.02;
    bean.userData.life = 180;
    
    scene.add(bean);
    beans.push(bean);
  }, 300);
  
  // 0.6秒後にアニメーション終了
  setTimeout(() => {
    isThrowingAnimation = false;
  }, 600);
}

// ==========================================
// 投げるアニメーション適用
// ==========================================
function applyThrowAnimation(avatar, isHuman) {
  if (!isThrowingAnimation) return;
  
  throwAnimationTime += 0.15;
  
  if (isHuman) {
    // 人間の右腕を上げて投げる動作
    const rightArm = avatar.getObjectByName('rightArm');
    if (rightArm) {
      if (throwAnimationTime < 3) {
        // 振りかぶり
        rightArm.rotation.x = -Math.PI * 0.8 * (throwAnimationTime / 3);
        rightArm.rotation.z = -0.3;
      } else if (throwAnimationTime < 6) {
        // 投げる
        const t = (throwAnimationTime - 3) / 3;
        rightArm.rotation.x = -Math.PI * 0.8 + Math.PI * 1.2 * t;
        rightArm.rotation.z = -0.3 + 0.3 * t;
      } else {
        // 元に戻す
        rightArm.rotation.x = 0;
        rightArm.rotation.z = 0;
      }
    }
  } else {
    // 犬の場合は頭を上げる
    const head = avatar.getObjectByName('head');
    if (head) {
      if (throwAnimationTime < 3) {
        head.rotation.x = -0.3 * (throwAnimationTime / 3);
      } else if (throwAnimationTime < 6) {
        const t = (throwAnimationTime - 3) / 3;
        head.rotation.x = -0.3 + 0.5 * t;
      } else {
        head.rotation.x = 0;
      }
    }
  }
}

// ==========================================
// 吹き出し表示
// ==========================================
function showSpeechBubble(position, text, duration = 2000) {
  const bubble = document.createElement('div');
  bubble.textContent = text;
  bubble.style.cssText = `
    position: fixed;
    background: white;
    padding: 10px 15px;
    border-radius: 20px;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 2000;
    pointer-events: none;
    animation: bubblePop 0.3s ease-out;
  `;
  
  // 3D座標を2D画面座標に変換
  const vector = position.clone();
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  
  bubble.style.left = x + 'px';
  bubble.style.top = (y - 50) + 'px';
  bubble.style.transform = 'translateX(-50%)';
  
  document.body.appendChild(bubble);
  
  setTimeout(() => {
    bubble.remove();
  }, duration);
}

// CSSアニメーション追加
const style = document.createElement('style');
style.textContent = `
  @keyframes bubblePop {
    0% { transform: translateX(-50%) scale(0); opacity: 0; }
    50% { transform: translateX(-50%) scale(1.2); }
    100% { transform: translateX(-50%) scale(1); opacity: 1; }
  }
`;
document.head.appendChild(style);

// ==========================================
// イベントリスナー設定
// ==========================================
function setupEventListeners() {
  // キーボード
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
  });
  
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });
  
  // リサイズ
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // NFTクリック（マウス）
  renderer.domElement.addEventListener('click', onCanvasClick);
  
  // NFTタップ（タッチ）
  renderer.domElement.addEventListener('touchend', (e) => {
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      onCanvasClick({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
      });
    }
  });
}

// ==========================================
// キャンバスクリック処理
// ==========================================
function onCanvasClick(event) {
  event.preventDefault && event.preventDefault();
  
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // シーン全体との交差判定
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  for (const intersect of intersects) {
    let obj = intersect.object;
    
    // 親をたどってNFTデータを探す
    while (obj) {
      if (obj.userData && obj.userData.nftData) {
        showNFTModal(obj.userData.nftData);
        return;
      }
      obj = obj.parent;
    }
  }
}

// ==========================================
// NFTモーダル表示
// ==========================================
function showNFTModal(nft) {
  // 既存のモーダルを削除
  const existingModal = document.getElementById('nft-modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'nft-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 10px;
    max-width: 400px;
    text-align: center;
  `;
  
  const changeRule = CHANGE_RULES[nft.tokenId];
  const changeRuleHtml = changeRule ? `<p style="color: #e74c3c; margin: 10px 0;"><strong>Change Rule:</strong> ${changeRule}</p>` : '';
  
  content.innerHTML = `
    <img src="${nft.imageUrl}" style="max-width: 100%; max-height: 300px; border-radius: 5px;">
    <h3 style="margin: 15px 0 10px;">${nft.name}</h3>
    <p style="color: #666; margin: 5px 0;"><strong>Owner:</strong> ${nft.ownerShort || 'Unknown'}</p>
    ${changeRuleHtml}
    <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" 
       target="_blank" 
       style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #2081e2; color: white; text-decoration: none; border-radius: 5px;">
      OpenSeaで見る
    </a>
    <button onclick="this.parentElement.parentElement.remove()" 
            style="display: block; margin: 15px auto 0; padding: 10px 30px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
      閉じる
    </button>
  `;
  
  modal.appendChild(content);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

// ==========================================
// プレイヤー更新
// ==========================================
function updatePlayer() {
  const speed = isDogMode ? 0.15 : 0.12;
  
  // キーボード入力をリセット
  let keyMove = new THREE.Vector3();
  
  // キーボード入力
  if (keys['KeyW'] || keys['ArrowUp']) keyMove.z = -1;
  if (keys['KeyS'] || keys['ArrowDown']) keyMove.z = 1;
  if (keys['KeyA'] || keys['ArrowLeft']) keyMove.x = -1;
  if (keys['KeyD'] || keys['ArrowRight']) keyMove.x = 1;
  
  // ジョイスティックまたはキーボードの入力を使用
  let finalMove = new THREE.Vector3();
  if (keyMove.length() > 0) {
    finalMove.copy(keyMove);
  } else if (moveVector.length() > 0) {
    finalMove.copy(moveVector);
  }
  
  // AUTOモード
  if (isAutoMode) {
    if (!autoTarget || player.position.distanceTo(autoTarget) < 2) {
      autoTarget = new THREE.Vector3(
        (Math.random() - 0.5) * (ROOM_SIZE - 10),
        player.position.y,
        (Math.random() - 0.5) * (ROOM_SIZE - 10)
      );
    }
    
    const direction = autoTarget.clone().sub(player.position).normalize();
    finalMove.x = direction.x;
    finalMove.z = direction.z;
  }
  
  // 移動
  if (finalMove.length() > 0) {
    const movement = finalMove.clone().normalize().multiplyScalar(speed);
    
    // カメラの向きに合わせて移動
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
    
    const moveX = right.x * movement.x + cameraDirection.x * -movement.z;
    const moveZ = right.z * movement.x + cameraDirection.z * -movement.z;
    
    player.position.x += moveX;
    player.position.z += moveZ;
    
    // 境界制限
    const limit = ROOM_SIZE / 2 - 2;
    player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
    player.position.z = Math.max(-limit, Math.min(limit, player.position.z));
    
    // 向きを変更
    if (moveX !== 0 || moveZ !== 0) {
      player.rotation.y = Math.atan2(moveX, moveZ);
    }
  }
  
  // FLYモード
  if (isFlyMode && isDogMode) {
    if (keys['Space']) {
      player.position.y += 0.1;
    } else if (player.position.y > 0) {
      player.position.y = Math.max(0, player.position.y - 0.05);
    }
  } else {
    player.position.y = 0;
  }
  
  // カメラ追従
  const cameraOffset = new THREE.Vector3(0, 5, 10);
  camera.position.lerp(player.position.clone().add(cameraOffset), 0.05);
  controls.target.lerp(player.position, 0.05);
}

// ==========================================
// 豆更新
// ==========================================
function updateBeans() {
  for (let i = beans.length - 1; i >= 0; i--) {
    const bean = beans[i];
    
    // 物理演算
    bean.userData.velocity.y += bean.userData.gravity;
    bean.position.add(bean.userData.velocity);
    bean.userData.life--;
    
    // ターゲットとの衝突判定
    for (const target of targets) {
      if (target.userData.isFlyingAway) continue;
      
      const distance = bean.position.distanceTo(target.position);
      if (distance < 1.5) {
        target.userData.hitCount = (target.userData.hitCount || 0) + 1;
        
        // 吹き出し表示
        showSpeechBubble(target.position.clone(), '痛いっ！');
        
        if (target.userData.hitCount >= 3) {
          target.userData.isFlyingAway = true;
          target.userData.flyVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            0.2,
            (Math.random() - 0.5) * 0.3
          );
          showSpeechBubble(target.position.clone(), 'あーれー！', 3000);
        }
        
        // 豆を削除
        scene.remove(bean);
        beans.splice(i, 1);
        break;
      }
    }
    
    // 寿命切れまたは床に落ちた
    if (bean.userData.life <= 0 || bean.position.y < -1) {
      scene.remove(bean);
      beans.splice(i, 1);
    }
  }
}

// ==========================================
// ターゲット更新
// ==========================================
function updateTargets() {
  targets.forEach(target => {
    if (target.userData.isFlyingAway) {
      target.position.add(target.userData.flyVelocity);
      target.rotation.z += 0.1;
      target.userData.flyVelocity.y -= 0.005;
      
      if (target.position.y < -10) {
        scene.remove(target);
        const index = targets.indexOf(target);
        if (index > -1) targets.splice(index, 1);
      }
    } else {
      // プレイヤーの方を向く
      target.lookAt(player.position);
    }
  });
}

// ==========================================
// NPC犬更新
// ==========================================
function updateNPCDogs() {
  const time = Date.now() * 0.001;
  
  npcDogs.forEach(dog => {
    // 移動
    dog.position.add(dog.userData.velocity);
    
    // 境界で反転
    const limit = ROOM_SIZE / 2 - 3;
    if (Math.abs(dog.position.x) > limit) {
      dog.userData.velocity.x *= -1;
    }
    if (Math.abs(dog.position.z) > limit) {
      dog.userData.velocity.z *= -1;
    }
    
    // 向きを変更
    if (dog.userData.velocity.length() > 0) {
      dog.rotation.y = Math.atan2(dog.userData.velocity.x, dog.userData.velocity.z);
    }
    
    // アニメーション
    animateDog(dog, time, true);
    
    // ランダムに方向転換
    if (Math.random() < 0.01) {
      dog.userData.velocity.set(
        (Math.random() - 0.5) * 0.05,
        0,
        (Math.random() - 0.5) * 0.05
      );
    }
  });
}

// ==========================================
// アニメーションループ
// ==========================================
function animate() {
  requestAnimationFrame(animate);
  
  const time = Date.now() * 0.001;
  
  // プレイヤー更新
  updatePlayer();
  
  // アバターアニメーション
  const isMoving = moveVector.length() > 0 || Object.values(keys).some(k => k);
  if (isDogMode) {
    animateDog(playerAvatar, time, isMoving);
    applyThrowAnimation(playerAvatar, false);
  } else {
    animateHuman(playerAvatar, time, isMoving);
    applyThrowAnimation(playerAvatar, true);
  }
  
  // 豆更新
  updateBeans();
  
  // ターゲット更新
  updateTargets();
  
  // NPC犬更新
  updateNPCDogs();
  
  // ダストパーティクル
  if (dustParticles) {
    dustParticles.rotation.y += 0.0005;
  }
  
  // コントロール更新
  controls.update();
  
  // レンダリング
  renderer.render(scene, camera);
}

// ==========================================
// 初期化実行
// ==========================================
init();

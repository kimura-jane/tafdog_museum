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
let joystickActive = false;

// カラー選択用
let currentHumanColorIndex = 0;
let currentDogColorIndex = 0;

// 投げるアニメーション用
let isThrowingAnimation = false;
let throwAnimationTime = 0;

const ALCHEMY_API_KEY = "NzzY5_VyMSoXXD0XqZpDL";

// ==========================================
// 初期化
// ==========================================
async function init() {
  allNFTs = generateNFTData();
  
  await fetchOwners();
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('root').appendChild(renderer.domElement);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.enablePan = false;
  
  setupLighting();
  createRoom();
  createPlayer();
  createNPCDogs();
  createTargets();
  
  dustParticles = createDustParticles(100);
  scene.add(dustParticles);
  
  createUI();
  setupEventListeners();
  
  document.getElementById('loading').style.display = 'none';
  
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
            if (tokenId.startsWith('0x')) {
              tokenId = parseInt(tokenId, 16).toString();
            }
            ownerMap[tokenId] = ownerData.ownerAddress;
          });
        }
      });
    }
    
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
  const ambient = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambient);
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(10, 30, 10);
  mainLight.castShadow = true;
  scene.add(mainLight);
  
  const subLight = new THREE.DirectionalLight(0xffffff, 0.8);
  subLight.position.set(-10, 25, -10);
  scene.add(subLight);
  
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(0, -10, 0);
  scene.add(fillLight);
}

// ==========================================
// 部屋作成
// ==========================================
function createRoom() {
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
  
  const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.6 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.isRoom = true;
  scene.add(floor);
  
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 });
  
  const northWallGeo = new THREE.BoxGeometry(ROOM_SIZE, WALL_HEIGHT, 0.3);
  const northWall = new THREE.Mesh(northWallGeo, wallMat);
  northWall.position.set(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2);
  northWall.userData.isRoom = true;
  scene.add(northWall);
  
  const southWall = new THREE.Mesh(northWallGeo, wallMat);
  southWall.position.set(0, WALL_HEIGHT / 2, ROOM_SIZE / 2);
  southWall.userData.isRoom = true;
  scene.add(southWall);
  
  const eastWallGeo = new THREE.BoxGeometry(0.3, WALL_HEIGHT, ROOM_SIZE);
  const eastWall = new THREE.Mesh(eastWallGeo, wallMat);
  eastWall.position.set(ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
  eastWall.userData.isRoom = true;
  scene.add(eastWall);
  
  const westWall = new THREE.Mesh(eastWallGeo, wallMat);
  westWall.position.set(-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
  westWall.userData.isRoom = true;
  scene.add(westWall);
  
  const ceilingGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x606060 });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  ceiling.userData.isRoom = true;
  scene.add(ceiling);
  
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
  
  for (let i = 0; i < nftsPerWall && nftIndex < nftsToShow.length; i++) {
    const x = -wallLength / 2 + i * SPACING + SPACING / 2;
    const position = new THREE.Vector3(x, START_HEIGHT, -ROOM_SIZE / 2 + WALL_OFFSET);
    const rotation = new THREE.Euler(0, 0, 0);
    createArtFrame(nftsToShow[nftIndex], position, rotation);
    nftIndex++;
  }
  
  for (let i = 0; i < nftsPerWall && nftIndex < nftsToShow.length; i++) {
    const x = wallLength / 2 - i * SPACING - SPACING / 2;
    const position = new THREE.Vector3(x, START_HEIGHT, ROOM_SIZE / 2 - WALL_OFFSET);
    const rotation = new THREE.Euler(0, Math.PI, 0);
    createArtFrame(nftsToShow[nftIndex], position, rotation);
    nftIndex++;
  }
  
  for (let i = 0; i < nftsPerWall && nftIndex < nftsToShow.length; i++) {
    const z = -wallLength / 2 + i * SPACING + SPACING / 2;
    const position = new THREE.Vector3(ROOM_SIZE / 2 - WALL_OFFSET, START_HEIGHT, z);
    const rotation = new THREE.Euler(0, -Math.PI / 2, 0);
    createArtFrame(nftsToShow[nftIndex], position, rotation);
    nftIndex++;
  }
  
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
  
  const frameGeo = new THREE.BoxGeometry(3.2, 3.2, 0.1);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.3 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.castShadow = true;
  group.add(frame);
  
  const matGeo = new THREE.BoxGeometry(2.8, 2.8, 0.05);
  const matMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const mat = new THREE.Mesh(matGeo, matMat);
  mat.position.z = 0.05;
  group.add(mat);
  
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
  
  const railGeo = new THREE.BoxGeometry(0.8, 0.05, 0.05);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.set(0, 2.0, 0.3);
  group.add(rail);
  
  const lightGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const lightBody = new THREE.Mesh(lightGeo, lightMat);
  lightBody.position.set(0, 1.85, 0.3);
  lightBody.rotation.x = Math.PI / 6;
  group.add(lightBody);
  
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
    playerAvatar = createDogAvatar(DOG_COLORS[currentDogColorIndex]);
  } else {
    playerAvatar = createHumanAvatar(HUMAN_COLORS[currentHumanColorIndex]);
  }
  
  player.add(playerAvatar);
  player.position.set(0, 0, 0);
  scene.add(player);
}

// ==========================================
// アバター再作成
// ==========================================
function recreateAvatar() {
  player.remove(playerAvatar);
  
  if (isDogMode) {
    playerAvatar = createDogAvatar(DOG_COLORS[currentDogColorIndex]);
  } else {
    playerAvatar = createHumanAvatar(HUMAN_COLORS[currentHumanColorIndex]);
  }
  
  player.add(playerAvatar);
}

// ==========================================
// NPC犬作成
// ==========================================
function createNPCDogs() {
  for (let i = 0; i < 3; i++) {
    const dog = createDogAvatar(DOG_COLORS[i % DOG_COLORS.length]);
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
// ターゲット作成（端のキャラ）
// ==========================================
function createTargets() {
  targets.forEach(t => scene.remove(t));
  targets = [];
  
  const baseUrl = "https://raw.githubusercontent.com/kimura-jane/tafdog_museum/main/";
  const targetFiles = ["IMG_1822.png", "IMG_1889.png"];
  
  targetFiles.forEach((file, index) => {
    const group = new THREE.Group();
    
    const loader = new THREE.TextureLoader();
    const url = baseUrl + file;
    
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const geo = new THREE.PlaneGeometry(2.5, 3.5);
        const mat = new THREE.MeshBasicMaterial({ 
          map: texture, 
          transparent: true, 
          side: THREE.DoubleSide 
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 1.75;
        group.add(mesh);
      },
      undefined,
      (err) => {
        console.warn('Target image load failed:', url, err);
        const geo = new THREE.PlaneGeometry(2.5, 3.5);
        const mat = new THREE.MeshBasicMaterial({ 
          color: 0xff0000, 
          side: THREE.DoubleSide 
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 1.75;
        group.add(mesh);
      }
    );
    
    const angle = (index / targetFiles.length) * Math.PI * 2 + Math.PI / 4;
    const radius = ROOM_SIZE / 2.5;
    group.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    
    group.userData.hitCount = 0;
    group.userData.isFlyingAway = false;
    
    scene.add(group);
    targets.push(group);
  });
  
  console.log('Targets created:', targets.length);
}

// ==========================================
// UI作成
// ==========================================
function createUI() {
  // タイトル
  const title = document.createElement('div');
  title.id = 'museum-title';
  title.textContent = 'TAF DOG MUSEUM';
  title.style.cssText = `
    position: fixed;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 16px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    z-index: 1000;
    pointer-events: none;
  `;
  document.body.appendChild(title);
  
  // 上部ボタン
  const header = document.createElement('div');
  header.style.cssText = `
    position: fixed;
    top: 32px;
    left: 8px;
    z-index: 1000;
    display: flex;
    gap: 6px;
  `;
  document.body.appendChild(header);
  
  // HUMANボタン
  const humanBtn = document.createElement('button');
  humanBtn.id = 'btn-human';
  humanBtn.textContent = 'HUMAN';
  humanBtn.style.cssText = `
    padding: 8px 10px;
    background: #4a90d9;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 11px;
    cursor: pointer;
  `;
  humanBtn.onclick = () => {
    if (isDogMode) {
      isDogMode = false;
      isFlyMode = false;
    } else {
      currentHumanColorIndex = (currentHumanColorIndex + 1) % HUMAN_COLORS.length;
    }
    recreateAvatar();
    updateButtons();
  };
  header.appendChild(humanBtn);
  
  // DOGボタン
  const dogBtn = document.createElement('button');
  dogBtn.id = 'btn-dog';
  dogBtn.textContent = 'DOG';
  dogBtn.style.cssText = `
    padding: 8px 10px;
    background: #666;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 11px;
    cursor: pointer;
  `;
  dogBtn.onclick = () => {
    if (!isDogMode) {
      isDogMode = true;
    } else {
      currentDogColorIndex = (currentDogColorIndex + 1) % DOG_COLORS.length;
    }
    recreateAvatar();
    updateButtons();
  };
  header.appendChild(dogBtn);
  
  // AUTOボタン
  const autoBtn = document.createElement('button');
  autoBtn.id = 'btn-auto';
  autoBtn.textContent = 'AUTO';
  autoBtn.style.cssText = `
    padding: 8px 10px;
    background: #666;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 11px;
    cursor: pointer;
  `;
  autoBtn.onclick = () => {
    isAutoMode = !isAutoMode;
    autoTarget = null;
    updateButtons();
  };
  header.appendChild(autoBtn);
  
  // 左側ボタン（階層）
  const floorDiv = document.createElement('div');
  floorDiv.style.cssText = `
    position: fixed;
    left: 8px;
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
    padding: 10px 14px;
    background: #666;
    color: white;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 12px;
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
    padding: 10px 14px;
    background: #fff;
    color: black;
    border: none;
    border-radius: 5px;
    font-weight: bold;
    font-size: 12px;
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
  
  // 右側ボタン
  const rightDiv = document.createElement('div');
  rightDiv.id = 'right-buttons';
  rightDiv.style.cssText = `
    position: fixed;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
  `;
  document.body.appendChild(rightDiv);
  
  // FLYボタン（常に作成、DOGモード時のみ表示）
  const flyBtn = document.createElement('button');
  flyBtn.id = 'btn-fly';
  flyBtn.textContent = 'FLY';
  flyBtn.style.cssText = `
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #333;
    color: white;
    border: 2px solid #555;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    display: none;
  `;
  flyBtn.onclick = () => {
    if (isDogMode) {
      isFlyMode = !isFlyMode;
      updateButtons();
    }
  };
  rightDiv.appendChild(flyBtn);
  
  // THROWボタン
  const throwBtn = document.createElement('button');
  throwBtn.id = 'btn-throw';
  throwBtn.textContent = 'THROW';
  throwBtn.style.cssText = `
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #d9534f;
    color: white;
    border: none;
    font-size: 9px;
    font-weight: bold;
    cursor: pointer;
  `;
  throwBtn.onclick = throwBean;
  rightDiv.appendChild(throwBtn);
  
  // ジョイスティック
  const joystickContainer = document.createElement('div');
  joystickContainer.id = 'joystick-container';
  joystickContainer.style.cssText = `
    position: fixed;
    bottom: 25px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1001;
    text-align: center;
    touch-action: none;
  `;
  document.body.appendChild(joystickContainer);
  
  const joystick = document.createElement('div');
  joystick.id = 'joystick';
  joystick.style.cssText = `
    width: 90px;
    height: 90px;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    position: relative;
    touch-action: none;
    border: 2px solid rgba(255,255,255,0.3);
  `;
  joystickContainer.appendChild(joystick);
  
  const joystickKnob = document.createElement('div');
  joystickKnob.id = 'joystick-knob';
  joystickKnob.style.cssText = `
    width: 36px;
    height: 36px;
    background: rgba(255,255,255,0.7);
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  `;
  joystick.appendChild(joystickKnob);
  
  const joystickLabel = document.createElement('div');
  joystickLabel.textContent = 'DRAG TO WALK';
  joystickLabel.style.cssText = `
    color: rgba(255,255,255,0.5);
    font-size: 10px;
    margin-top: 6px;
  `;
  joystickContainer.appendChild(joystickLabel);
  
  setupJoystick(joystick, joystickKnob);
  updateButtons();
}

// ==========================================
// ジョイスティック設定
// ==========================================
function setupJoystick(joystick, knob) {
  const size = 90;
  const center = size / 2;
  const maxDist = 30;
  
  function getPos(e) {
    const rect = joystick.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left - center,
      y: clientY - rect.top - center
    };
  }
  
  function onStart(e) {
    e.preventDefault();
    e.stopPropagation();
    joystickActive = true;
    controls.enabled = false;
    onMove(e);
  }
  
  function onMove(e) {
    if (!joystickActive) return;
    e.preventDefault();
    
    const pos = getPos(e);
    let x = pos.x;
    let y = pos.y;
    
    const dist = Math.sqrt(x * x + y * y);
    if (dist > maxDist) {
      x = (x / dist) * maxDist;
      y = (y / dist) * maxDist;
    }
    
    knob.style.left = (center + x) + 'px';
    knob.style.top = (center + y) + 'px';
    knob.style.transform = 'translate(-50%, -50%)';
    
    moveVector.x = x / maxDist;
    moveVector.z = y / maxDist;
  }
  
  function onEnd(e) {
    if (!joystickActive) return;
    e.preventDefault();
    
    joystickActive = false;
    controls.enabled = true;
    
    knob.style.left = '50%';
    knob.style.top = '50%';
    moveVector.x = 0;
    moveVector.z = 0;
  }
  
  joystick.addEventListener('mousedown', onStart);
  joystick.addEventListener('touchstart', onStart, { passive: false });
  
  window.addEventListener('mousemove', (e) => {
    if (joystickActive) onMove(e);
  });
  window.addEventListener('touchmove', (e) => {
    if (joystickActive) onMove(e);
  }, { passive: false });
  
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
  window.addEventListener('touchcancel', onEnd);
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
    if (isDogMode) {
      flyBtn.style.display = 'block';
      flyBtn.style.background = isFlyMode ? '#4a90d9' : '#333';
    } else {
      flyBtn.style.display = 'none';
    }
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
// 豆を投げる
// ==========================================
function throwBean() {
  if (isThrowingAnimation) return;
  
  isThrowingAnimation = true;
  throwAnimationTime = 0;
  
  setTimeout(() => {
    const beanGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const beanMat = new THREE.MeshStandardMaterial({ 
      color: 0xd4a574,
      emissive: 0x442200,
      emissiveIntensity: 0.3
    });
    const bean = new THREE.Mesh(beanGeo, beanMat);
    
    const throwPos = player.position.clone();
    throwPos.y += 2.0;
    
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(player.quaternion);
    throwPos.add(forward.multiplyScalar(0.5));
    
    bean.position.copy(throwPos);
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    bean.userData.velocity = direction.multiplyScalar(0.8);
    bean.userData.velocity.y += 0.3;
    bean.userData.gravity = -0.02;
    bean.userData.life = 180;
    
    scene.add(bean);
    beans.push(bean);
  }, 300);
  
  setTimeout(() => {
    isThrowingAnimation = false;
  }, 600);
}

// ==========================================
// 投げるアニメーション
// ==========================================
function applyThrowAnimation(avatar, isHuman) {
  if (!isThrowingAnimation) return;
  
  throwAnimationTime += 0.15;
  
  if (isHuman) {
    const rightArm = avatar.getObjectByName('rightArm');
    if (rightArm) {
      if (throwAnimationTime < 3) {
        rightArm.rotation.x = -Math.PI * 0.8 * (throwAnimationTime / 3);
      } else if (throwAnimationTime < 6) {
        const t = (throwAnimationTime - 3) / 3;
        rightArm.rotation.x = -Math.PI * 0.8 + Math.PI * 1.2 * t;
      } else {
        rightArm.rotation.x = 0;
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
    padding: 8px 12px;
    border-radius: 15px;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 2000;
    pointer-events: none;
  `;
  
  const vector = position.clone();
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  
  bubble.style.left = x + 'px';
  bubble.style.top = (y - 40) + 'px';
  bubble.style.transform = 'translateX(-50%)';
  
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), duration);
}

// ==========================================
// イベントリスナー
// ==========================================
function setupEventListeners() {
  window.addEventListener('keydown', (e) => keys[e.code] = true);
  window.addEventListener('keyup', (e) => keys[e.code] = false);
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  renderer.domElement.addEventListener('click', onCanvasClick);
}

// ==========================================
// クリック処理
// ==========================================
function onCanvasClick(event) {
  if (joystickActive) return;
  
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  for (const intersect of intersects) {
    let obj = intersect.object;
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
// NFTモーダル表示（変化前後の画像表示対応）
// ==========================================
function showNFTModal(nft) {
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
    background: rgba(0,0,0,0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 16px;
    border-radius: 12px;
    max-width: 380px;
    width: 92%;
    max-height: 88vh;
    overflow-y: auto;
    text-align: center;
  `;
  
  // 変化条件があれば前後画像を並べて表示
  const changeRule = CHANGE_RULES[nft.tokenId];
  let imagesHtml = '';
  
  if (changeRule && nft.stateImageUrl) {
    imagesHtml = `
      <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 10px;">
        <div style="flex: 1;">
          <img src="${nft.imageUrl}" style="width: 100%; border-radius: 6px;">
          <div style="font-size: 10px; color: #888; margin-top: 4px;">通常</div>
        </div>
        <div style="flex: 1;">
          <img src="${nft.stateImageUrl}" style="width: 100%; border-radius: 6px;">
          <div style="font-size: 10px; color: #888; margin-top: 4px;">変化後</div>
        </div>
      </div>
    `;
  } else {
    imagesHtml = `
      <img src="${nft.imageUrl}" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-bottom: 10px;">
    `;
  }
  
  const changeRuleHtml = changeRule ? `
    <p style="color: #e74c3c; margin: 8px 0; font-size: 12px; background: #fff5f5; padding: 8px; border-radius: 6px;">
      <strong>変化条件:</strong><br>${changeRule}
    </p>
  ` : '';
  
  content.innerHTML = `
    ${imagesHtml}
    <h3 style="margin: 8px 0 6px; font-size: 16px;">TAF DOG #${nft.tokenId}</h3>
    <p style="color: #888; margin: 4px 0; font-size: 11px;"><strong>Token ID:</strong> ${nft.tokenId}</p>
    <p style="color: #666; margin: 4px 0; font-size: 11px;"><strong>Owner:</strong> ${nft.ownerShort || 'Unknown'}</p>
    ${changeRuleHtml}
    <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" 
       target="_blank" 
       style="display: inline-block; margin-top: 10px; padding: 10px 18px; background: #2081e2; color: white; text-decoration: none; border-radius: 8px; font-size: 13px;">
      OpenSeaで見る
    </a>
    <button id="modal-close-btn" style="display: block; margin: 10px auto 0; padding: 10px 22px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
      閉じる
    </button>
  `;
  
  modal.appendChild(content);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
  
  document.getElementById('modal-close-btn').onclick = () => modal.remove();
}

// ==========================================
// プレイヤー更新
// ==========================================
function updatePlayer() {
  const speed = isDogMode ? 0.15 : 0.12;
  
  let keyMove = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp']) keyMove.z = -1;
  if (keys['KeyS'] || keys['ArrowDown']) keyMove.z = 1;
  if (keys['KeyA'] || keys['ArrowLeft']) keyMove.x = -1;
  if (keys['KeyD'] || keys['ArrowRight']) keyMove.x = 1;
  
  let finalMove = new THREE.Vector3();
  if (keyMove.length() > 0) {
    finalMove.copy(keyMove);
  } else if (moveVector.length() > 0.05) {
    finalMove.copy(moveVector);
  }
  
  if (isAutoMode) {
    if (!autoTarget || player.position.distanceTo(autoTarget) < 2) {
      autoTarget = new THREE.Vector3(
        (Math.random() - 0.5) * (ROOM_SIZE - 10),
        0,
        (Math.random() - 0.5) * (ROOM_SIZE - 10)
      );
    }
    const dir = autoTarget.clone().sub(player.position).normalize();
    finalMove.x = dir.x;
    finalMove.z = dir.z;
  }
  
  if (finalMove.length() > 0) {
    const movement = finalMove.clone().normalize().multiplyScalar(speed);
    
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(camDir, new THREE.Vector3(0, 1, 0));
    
    const mx = right.x * movement.x + camDir.x * -movement.z;
    const mz = right.z * movement.x + camDir.z * -movement.z;
    
    player.position.x += mx;
    player.position.z += mz;
    
    const limit = ROOM_SIZE / 2 - 2;
    player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
    player.position.z = Math.max(-limit, Math.min(limit, player.position.z));
    
    if (mx !== 0 || mz !== 0) {
      player.rotation.y = Math.atan2(mx, mz);
    }
  }
  
  if (isFlyMode && isDogMode) {
    if (keys['Space']) {
      player.position.y += 0.1;
    } else if (player.position.y > 0) {
      player.position.y = Math.max(0, player.position.y - 0.05);
    }
  } else {
    player.position.y = 0;
  }
  
  const offset = new THREE.Vector3(0, 5, 10);
  camera.position.lerp(player.position.clone().add(offset), 0.05);
  controls.target.lerp(player.position, 0.05);
}

// ==========================================
// 豆更新
// ==========================================
function updateBeans() {
  for (let i = beans.length - 1; i >= 0; i--) {
    const bean = beans[i];
    
    bean.userData.velocity.y += bean.userData.gravity;
    bean.position.add(bean.userData.velocity);
    bean.userData.life--;
    
    for (const target of targets) {
      if (target.userData.isFlyingAway) continue;
      
      const dist = bean.position.distanceTo(target.position);
      if (dist < 2.0) {
        target.userData.hitCount++;
        showSpeechBubble(target.position.clone().add(new THREE.Vector3(0, 3, 0)), '痛いっ！');
        
        if (target.userData.hitCount >= 3) {
          target.userData.isFlyingAway = true;
          target.userData.flyVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            0.2,
            (Math.random() - 0.5) * 0.3
          );
          showSpeechBubble(target.position.clone().add(new THREE.Vector3(0, 3, 0)), 'あーれー！', 3000);
        }
        
        scene.remove(bean);
        beans.splice(i, 1);
        break;
      }
    }
    
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
        targets.splice(targets.indexOf(target), 1);
      }
    } else {
      target.lookAt(player.position.x, target.position.y, player.position.z);
    }
  });
}

// ==========================================
// NPC犬更新
// ==========================================
function updateNPCDogs() {
  const time = Date.now() * 0.001;
  
  npcDogs.forEach(dog => {
    dog.position.add(dog.userData.velocity);
    
    const limit = ROOM_SIZE / 2 - 3;
    if (Math.abs(dog.position.x) > limit) dog.userData.velocity.x *= -1;
    if (Math.abs(dog.position.z) > limit) dog.userData.velocity.z *= -1;
    
    dog.rotation.y = Math.atan2(dog.userData.velocity.x, dog.userData.velocity.z);
    animateDog(dog, time, true);
    
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
  
  updatePlayer();
  
  const isMoving = moveVector.length() > 0.05 || Object.values(keys).some(k => k);
  if (isDogMode) {
    animateDog(playerAvatar, time, isMoving);
  } else {
    animateHuman(playerAvatar, time, isMoving);
    applyThrowAnimation(playerAvatar, true);
  }
  
  updateBeans();
  updateTargets();
  updateNPCDogs();
  
  if (dustParticles) dustParticles.rotation.y += 0.0005;
  
  controls.update();
  renderer.render(scene, camera);
}

// ==========================================
// 初期化実行
// ==========================================
init();

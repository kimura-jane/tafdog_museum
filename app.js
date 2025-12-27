// ==========================================
// app.js - TAF DOG MUSEUM メインアプリケーション
// ==========================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NFT_CONFIG, ROOM_SIZE, WALL_HEIGHT, TARGET_IMAGES, HUMAN_COLORS, DOG_COLORS, generateNFTData, CHANGE_RULES } from './data.js';
import { getLighting, createHumanAvatar, createDogAvatar, animateHuman, animateDog, createDustParticles } from './functions.js';

// ==========================================
// グローバル変数
// ==========================================
const ALCHEMY_API_KEY = "NzzY5_VyMSoXXD0XqZpDL";

let scene, camera, renderer, controls;
let player, playerAvatar;
let isHuman = true;
let isDog = false;
let isAutoMode = false;
let isFlyMode = false;
let humanColorIndex = 0;
let dogColorIndex = 0;
let moveVector = new THREE.Vector3();
let velocity = new THREE.Vector3();
let nftData = [];
let nftMeshes = [];
let nftPositions = [];
let targets = [];
let beans = [];
let dustParticles;
let joystickActive = false;
let userControllingCamera = false;
let cameraControlTimeout = null;

// AUTOモード用
let autoTargetIndex = 0;
let autoWaitTime = 0;

// ターゲットキャラの画像URL
const baseUrl = "https://raw.githubusercontent.com/kimura-jane/tafdog_museum/main/";
const targetFiles = ["IMG_1822.png", "IMG_1889.png", "IMG_2958.png"];

// ==========================================
// 初期化
// ==========================================
async function init() {
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 30, 100);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('root').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    
    controls.addEventListener('start', () => {
      userControllingCamera = true;
      if (cameraControlTimeout) clearTimeout(cameraControlTimeout);
    });
    
    controls.addEventListener('end', () => {
      cameraControlTimeout = setTimeout(() => {
        userControllingCamera = false;
      }, 3000);
    });

    setupLighting();
    createRoom();
    createPlayer();

    nftData = generateNFTData();
    placeNFTsOnWalls();
    fetchOwnerData();

    createTargets();

    dustParticles = createDustParticles(100);
    scene.add(dustParticles);

    createUI();
    createJoystick();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loading = document.getElementById('loading');
    if (loading) loading.remove();

    animate();

  } catch (error) {
    console.error('初期化エラー:', error);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `<div style="color:red;">エラー: ${error.message}</div>`;
    }
  }
}

// ==========================================
// 照明設定
// ==========================================
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(0, 20, 0);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);

  const subLight1 = new THREE.DirectionalLight(0xfff5e6, 0.4);
  subLight1.position.set(20, 15, 20);
  scene.add(subLight1);

  const subLight2 = new THREE.DirectionalLight(0xe6f0ff, 0.3);
  subLight2.position.set(-20, 15, -20);
  scene.add(subLight2);

  const floorLight = new THREE.PointLight(0xffffff, 0.3, 100);
  floorLight.position.set(0, 8, 0);
  scene.add(floorLight);
}

// ==========================================
// 部屋作成
// ==========================================
function createRoom() {
  const halfSize = ROOM_SIZE / 2;

  const floorGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d2b1f,
    roughness: 0.4,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceilingGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9
  });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0ebe0,
    roughness: 0.7,
    metalness: 0
  });

  const walls = [
    { pos: [0, WALL_HEIGHT / 2, -halfSize], rot: [0, 0, 0] },
    { pos: [0, WALL_HEIGHT / 2, halfSize], rot: [0, Math.PI, 0] },
    { pos: [-halfSize, WALL_HEIGHT / 2, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [halfSize, WALL_HEIGHT / 2, 0], rot: [0, -Math.PI / 2, 0] }
  ];

  walls.forEach(w => {
    const wallGeometry = new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT);
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(...w.pos);
    wall.rotation.set(...w.rot);
    wall.receiveShadow = true;
    scene.add(wall);
  });

  const baseboardMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const baseboardHeight = 0.2;

  const baseboards = [
    { pos: [0, baseboardHeight / 2, -halfSize + 0.05], size: [ROOM_SIZE, baseboardHeight, 0.1] },
    { pos: [0, baseboardHeight / 2, halfSize - 0.05], size: [ROOM_SIZE, baseboardHeight, 0.1] },
    { pos: [-halfSize + 0.05, baseboardHeight / 2, 0], size: [0.1, baseboardHeight, ROOM_SIZE] },
    { pos: [halfSize - 0.05, baseboardHeight / 2, 0], size: [0.1, baseboardHeight, ROOM_SIZE] }
  ];

  baseboards.forEach(b => {
    const geo = new THREE.BoxGeometry(...b.size);
    const mesh = new THREE.Mesh(geo, baseboardMaterial);
    mesh.position.set(...b.pos);
    scene.add(mesh);
  });

  createCeilingRails();
  createFootprints();
}

// ==========================================
// 天井照明レール
// ==========================================
function createCeilingRails() {
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const railHeight = WALL_HEIGHT - 0.1;

  const rail1 = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE * 0.8, 0.1, 0.3),
    railMaterial
  );
  rail1.position.set(0, railHeight, 0);
  scene.add(rail1);

  const rail2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.1, ROOM_SIZE * 0.8),
    railMaterial
  );
  rail2.position.set(0, railHeight, 0);
  scene.add(rail2);
}

// ==========================================
// 足跡作成
// ==========================================
function createFootprints() {
  const footprintMaterial = new THREE.MeshBasicMaterial({
    color: 0x2a2a2a,
    transparent: true,
    opacity: 0.15
  });

  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * (ROOM_SIZE - 10);
    const z = (Math.random() - 0.5) * (ROOM_SIZE - 10);
    const rotation = Math.random() * Math.PI * 2;

    const leftFoot = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 16),
      footprintMaterial
    );
    leftFoot.rotation.x = -Math.PI / 2;
    leftFoot.position.set(x - 0.15, 0.01, z);
    leftFoot.rotation.z = rotation;
    scene.add(leftFoot);

    const rightFoot = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 16),
      footprintMaterial
    );
    rightFoot.rotation.x = -Math.PI / 2;
    rightFoot.position.set(x + 0.15, 0.01, z + 0.3);
    rightFoot.rotation.z = rotation;
    scene.add(rightFoot);
  }
}

// ==========================================
// プレイヤー作成
// ==========================================
function createPlayer() {
  player = new THREE.Group();
  player.position.set(0, 0, 0);
  scene.add(player);

  playerAvatar = createHumanAvatar(HUMAN_COLORS[humanColorIndex]);
  player.add(playerAvatar);
}

// ==========================================
// NFTオーナー取得
// ==========================================
async function fetchOwnerData() {
  console.log('=== オーナーデータ取得開始 ===');
  
  try {
    const url = `https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getOwnersForContract?contractAddress=${NFT_CONFIG.contractAddress}&withTokenBalances=true`;
    
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.owners && data.owners.length > 0) {
        data.owners.forEach(ownerInfo => {
          const wallet = ownerInfo.ownerAddress;
          
          if (ownerInfo.tokenBalances) {
            ownerInfo.tokenBalances.forEach(tb => {
              let tokenId = String(tb.tokenId);
              if (tokenId.startsWith('0x')) {
                tokenId = String(parseInt(tokenId, 16));
              }
              
              const nft = nftData.find(n => n.tokenId === tokenId);
              if (nft) {
                nft.owner = wallet;
                nft.ownerShort = wallet.slice(0, 6) + '...' + wallet.slice(-4);
              }
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
  
  nftData.forEach(nft => {
    if (nft.ownerShort === 'Loading...') {
      nft.ownerShort = 'Unknown';
    }
  });
  
  console.log('=== オーナーデータ取得完了 ===');
}

// ==========================================
// NFT配置
// ==========================================
function placeNFTsOnWalls() {
  nftMeshes.forEach(mesh => scene.remove(mesh));
  nftMeshes = [];
  nftPositions = [];

  const halfSize = ROOM_SIZE / 2;
  const wallOffset = 0.5;
  const viewDistance = 6;
  const nftHeight = 4;
  const nftWidth = 3;
  const totalNFTs = nftData.length;

  const wallConfigs = [
    {
      count: 13,
      getPosition: (i, spacing) => new THREE.Vector3(
        -halfSize + spacing * (i + 1),
        WALL_HEIGHT / 2,
        -halfSize + wallOffset
      ),
      getViewPosition: (i, spacing) => new THREE.Vector3(
        -halfSize + spacing * (i + 1),
        0,
        -halfSize + wallOffset + viewDistance
      ),
      rotation: 0
    },
    {
      count: 13,
      getPosition: (i, spacing) => new THREE.Vector3(
        halfSize - spacing * (i + 1),
        WALL_HEIGHT / 2,
        halfSize - wallOffset
      ),
      getViewPosition: (i, spacing) => new THREE.Vector3(
        halfSize - spacing * (i + 1),
        0,
        halfSize - wallOffset - viewDistance
      ),
      rotation: Math.PI
    },
    {
      count: 12,
      getPosition: (i, spacing) => new THREE.Vector3(
        -halfSize + wallOffset,
        WALL_HEIGHT / 2,
        halfSize - spacing * (i + 1)
      ),
      getViewPosition: (i, spacing) => new THREE.Vector3(
        -halfSize + wallOffset + viewDistance,
        0,
        halfSize - spacing * (i + 1)
      ),
      rotation: Math.PI / 2
    },
    {
      count: 12,
      getPosition: (i, spacing) => new THREE.Vector3(
        halfSize - wallOffset,
        WALL_HEIGHT / 2,
        -halfSize + spacing * (i + 1)
      ),
      getViewPosition: (i, spacing) => new THREE.Vector3(
        halfSize - wallOffset - viewDistance,
        0,
        -halfSize + spacing * (i + 1)
      ),
      rotation: -Math.PI / 2
    }
  ];

  const frameStyles = [
    { color: 0xd4af37, width: 0.15 },
    { color: 0x1a1a1a, width: 0.12 },
    { color: 0xf5f5f5, width: 0.1 },
    { color: 0x8b4513, width: 0.15 },
    { color: 0xc0c0c0, width: 0.12 }
  ];

  let nftIndex = 0;

  wallConfigs.forEach((config, wallIndex) => {
    const spacing = ROOM_SIZE / (config.count + 1);

    for (let i = 0; i < config.count && nftIndex < totalNFTs; i++) {
      const nft = nftData[nftIndex];
      const position = config.getPosition(i, spacing);
      const viewPosition = config.getViewPosition(i, spacing);
      const frameStyle = frameStyles[nftIndex % frameStyles.length];

      nftPositions.push({
        viewPos: viewPosition,
        lookAt: position.clone()
      });

      createNFTDisplay(nft, position, config.rotation, frameStyle, nftWidth, nftHeight);
      nftIndex++;
    }
  });
}

// ==========================================
// NFT表示作成
// ==========================================
function createNFTDisplay(nft, position, rotation, frameStyle, width, height) {
  const group = new THREE.Group();

  const frameGeometry = new THREE.BoxGeometry(
    width + frameStyle.width * 2,
    height + frameStyle.width * 2,
    0.12
  );
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: frameStyle.color,
    roughness: 0.3,
    metalness: 0.5
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.z = 0;
  group.add(frame);

  const loader = new THREE.TextureLoader();
  loader.load(
    nft.imageUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      mesh.position.z = 0.07;
      mesh.userData.nftData = nft;
      group.add(mesh);
      nftMeshes.push(mesh);
      group.userData.nftData = nft;
    },
    undefined,
    (error) => {
      const material = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      mesh.position.z = 0.07;
      mesh.userData.nftData = nft;
      group.add(mesh);
      nftMeshes.push(mesh);
    }
  );

  const lightFixture = new THREE.Group();

  const fixtureBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.15, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.2 })
  );
  lightFixture.add(fixtureBody);

  const lightBulb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.1, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffee })
  );
  lightBulb.position.y = -0.1;
  lightBulb.rotation.x = Math.PI * 0.1;
  lightFixture.add(lightBulb);

  lightFixture.position.set(0, height / 2 + 0.8, 0.5);
  group.add(lightFixture);

  const spotlight = new THREE.SpotLight(0xfff5e0, 2, 12, Math.PI / 5, 0.3);
  spotlight.position.set(0, height / 2 + 0.7, 0.5);
  spotlight.target.position.set(0, 0, 0.07);
  group.add(spotlight);
  group.add(spotlight.target);

  group.position.copy(position);
  group.rotation.y = rotation;
  scene.add(group);
}

// ==========================================
// ターゲットキャラ作成（ランダム配置、各キャラ2体ずつ）
// ==========================================
function createTargets() {
  const halfSize = ROOM_SIZE / 2;
  const margin = 10;
  const loader = new THREE.TextureLoader();
  
  targetFiles.forEach(file => {
    for (let i = 0; i < 2; i++) {
      const x = (Math.random() - 0.5) * (ROOM_SIZE - margin * 2);
      const z = (Math.random() - 0.5) * (ROOM_SIZE - margin * 2);
      
      const url = baseUrl + file;
      loader.load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide
        });
        const geometry = new THREE.PlaneGeometry(4, 6);
        const mesh = new THREE.Mesh(geometry, material);

        const group = new THREE.Group();
        group.add(mesh);
        group.position.set(x, 3, z);
        group.userData.hitCount = 0;
        group.userData.isFlyingAway = false;
        group.userData.velocity = new THREE.Vector3();
        group.userData.originalPosition = new THREE.Vector3(x, 3, z);

        targets.push(group);
        scene.add(group);
      });
    }
  });
}

// ==========================================
// UI作成（下部配置）
// ==========================================
function createUI() {
  const titleContainer = document.createElement('div');
  titleContainer.style.cssText = `
    position: fixed;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.4);
    border-top: 1px solid rgba(212, 175, 55, 0.6);
    border-bottom: 1px solid rgba(212, 175, 55, 0.6);
    padding: 10px 25px;
  `;
  
  const title = document.createElement('span');
  title.style.cssText = `
    color: #d4af37;
    font-size: 16px;
    font-weight: 300;
    letter-spacing: 8px;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    font-family: 'Times New Roman', 'Georgia', serif;
    text-transform: uppercase;
    white-space: nowrap;
  `;
  title.textContent = 'TAF DOG MUSEUM';
  titleContainer.appendChild(title);
  document.body.appendChild(titleContainer);

  const buttonStyle = `
    padding: 14px 20px;
    border: none;
    border-radius: 25px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
    user-select: none;
    -webkit-user-select: none;
    min-width: 80px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  `;

  const leftBar = document.createElement('div');
  leftBar.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
  `;
  document.body.appendChild(leftBar);

  const humanBtn = document.createElement('button');
  humanBtn.textContent = 'HUMAN';
  humanBtn.style.cssText = buttonStyle + 'background: linear-gradient(135deg, #4a90d9, #357abd); color: white;';
  humanBtn.onclick = () => switchToHuman();
  leftBar.appendChild(humanBtn);

  const autoBtn = document.createElement('button');
  autoBtn.textContent = 'AUTO';
  autoBtn.id = 'autoBtn';
  autoBtn.style.cssText = buttonStyle + 'background: linear-gradient(135deg, #666, #444); color: white;';
  autoBtn.onclick = () => toggleAutoMode();
  leftBar.appendChild(autoBtn);

  const dogBtn = document.createElement('button');
  dogBtn.textContent = 'DOG';
  dogBtn.style.cssText = buttonStyle + 'background: linear-gradient(135deg, #d4a574, #b8956a); color: white;';
  dogBtn.onclick = () => switchToDog();
  leftBar.appendChild(dogBtn);

  const rightBar = document.createElement('div');
  rightBar.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
  `;
  document.body.appendChild(rightBar);

  const flyBtn = document.createElement('button');
  flyBtn.textContent = 'FLY';
  flyBtn.id = 'flyBtn';
  flyBtn.style.cssText = buttonStyle + 'background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white;';
  flyBtn.onclick = () => toggleFlyMode();
  rightBar.appendChild(flyBtn);

  const throwBtn = document.createElement('button');
  throwBtn.textContent = '豆まき';
  throwBtn.style.cssText = buttonStyle + 'background: linear-gradient(135deg, #e74c3c, #c0392b); color: white;';
  throwBtn.onclick = () => throwBean();
  rightBar.appendChild(throwBtn);

  renderer.domElement.addEventListener('click', onNFTClick);
  renderer.domElement.addEventListener('touchend', onNFTTouch);
}

// ==========================================
// FLYモードトグル
// ==========================================
function toggleFlyMode() {
  isFlyMode = !isFlyMode;
  const btn = document.getElementById('flyBtn');
  
  if (isFlyMode) {
    btn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
    player.position.y = 4;
  } else {
    btn.style.background = 'linear-gradient(135deg, #9b59b6, #8e44ad)';
  }
}

// ==========================================
// ジョイスティック（中央下）
// ==========================================
function createJoystick() {
  const container = document.createElement('div');
  container.id = 'joystick';
  container.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 100px;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.4);
    z-index: 1000;
    touch-action: none;
  `;
  document.body.appendChild(container);

  const knob = document.createElement('div');
  knob.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 45px;
    height: 45px;
    background: rgba(255,255,255,0.6);
    border-radius: 50%;
    pointer-events: none;
  `;
  container.appendChild(knob);

  let startX, startY;
  const maxDistance = 30;

  container.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
    isAutoMode = false;
    const btn = document.getElementById('autoBtn');
    if (btn) btn.style.background = 'linear-gradient(135deg, #666, #444)';
    
    const touch = e.touches[0];
    const rect = container.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  });

  container.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joystickActive) return;

    const touch = e.touches[0];
    let dx = touch.clientX - startX;
    let dy = touch.clientY - startY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    moveVector.x = dx / maxDistance;
    moveVector.z = dy / maxDistance;
  });

  const resetJoystick = () => {
    joystickActive = false;
    knob.style.transform = 'translate(-50%, -50%)';
    moveVector.set(0, 0, 0);
  };

  container.addEventListener('touchend', resetJoystick);
  container.addEventListener('touchcancel', resetJoystick);
}

// ==========================================
// モード切り替え
// ==========================================
function switchToHuman() {
  if (isHuman) {
    humanColorIndex = (humanColorIndex + 1) % HUMAN_COLORS.length;
  }
  isHuman = true;
  isDog = false;

  player.remove(playerAvatar);
  playerAvatar = createHumanAvatar(HUMAN_COLORS[humanColorIndex]);
  player.add(playerAvatar);
}

function switchToDog() {
  if (isDog) {
    dogColorIndex = (dogColorIndex + 1) % DOG_COLORS.length;
  }
  isHuman = false;
  isDog = true;

  player.remove(playerAvatar);
  playerAvatar = createDogAvatar(DOG_COLORS[dogColorIndex]);
  player.add(playerAvatar);
}

function toggleAutoMode() {
  isAutoMode = !isAutoMode;
  const btn = document.getElementById('autoBtn');
  if (btn) {
    btn.style.background = isAutoMode ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'linear-gradient(135deg, #666, #444)';
  }
  if (isAutoMode) {
    autoTargetIndex = 0;
    autoWaitTime = 0;
  }
}

// ==========================================
// 豆を投げる
// ==========================================
function throwBean() {
  const beanGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const beanMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const bean = new THREE.Mesh(beanGeometry, beanMaterial);

  bean.position.copy(player.position);
  bean.position.y += 1.2;

  const direction = new THREE.Vector3();
  direction.subVectors(controls.target, camera.position);
  direction.y = 0;
  direction.normalize();

  bean.userData.velocity = direction.clone().multiplyScalar(0.6);
  bean.userData.velocity.y = 0.2;
  bean.userData.life = 150;

  beans.push(bean);
  scene.add(bean);
}

// ==========================================
// NFTクリック処理
// ==========================================
function onNFTClick(event) {
  if (joystickActive) return;
  handleNFTInteraction(event.clientX, event.clientY);
}

function onNFTTouch(event) {
  if (joystickActive) return;
  if (event.changedTouches.length > 0) {
    const touch = event.changedTouches[0];
    handleNFTInteraction(touch.clientX, touch.clientY);
  }
}

function handleNFTInteraction(clientX, clientY) {
  const mouse = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(nftMeshes, true);
  if (intersects.length > 0) {
    let nftDataFound = null;
    let obj = intersects[0].object;

    while (obj && !nftDataFound) {
      if (obj.userData && obj.userData.nftData) {
        nftDataFound = obj.userData.nftData;
      }
      obj = obj.parent;
    }

    if (nftDataFound) {
      showNFTModal(nftDataFound);
    }
  }
}

// ==========================================
// NFTモーダル
// ==========================================
function showNFTModal(nft) {
  const existing = document.getElementById('nftModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'nftModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2000;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px 40px 20px;
    min-height: min-content;
  `;

  const imageContainer = document.createElement('div');
  imageContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    align-items: center;
    max-width: 90%;
  `;

  const mainImg = document.createElement('img');
  mainImg.src = nft.imageUrl;
  mainImg.style.cssText = `
    max-width: 280px;
    max-height: 350px;
    border-radius: 10px;
    box-shadow: 0 0 30px rgba(255,255,255,0.2);
  `;
  imageContainer.appendChild(mainImg);

  if (nft.stateImageUrl) {
    const stateImg = document.createElement('img');
    stateImg.src = nft.stateImageUrl;
    stateImg.style.cssText = mainImg.style.cssText;
    imageContainer.appendChild(stateImg);
  }

  content.appendChild(imageContainer);

  const info = document.createElement('div');
  info.style.cssText = `
    color: white;
    text-align: center;
    margin-top: 20px;
    font-size: 14px;
  `;
  info.innerHTML = `
    <p style="margin: 5px 0;">Token ID: ${nft.tokenId}</p>
    <p style="margin: 5px 0;">Owner: ${nft.ownerShort || 'Unknown'}</p>
    ${nft.changeRule ? `<p style="margin: 5px 0; color: #ffd700;">${nft.changeRule}</p>` : ''}
  `;
  content.appendChild(info);

  const link = document.createElement('a');
  link.href = `https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}`;
  link.target = '_blank';
  link.style.cssText = `
    display: inline-block;
    margin-top: 15px;
    margin-bottom: 20px;
    padding: 12px 30px;
    background: #2081e2;
    color: white;
    text-decoration: none;
    border-radius: 25px;
    font-weight: bold;
  `;
  link.textContent = 'View on OpenSea';
  content.appendChild(link);

  modal.appendChild(content);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: fixed;
    top: 15px;
    right: 15px;
    background: rgba(0,0,0,0.5);
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    z-index: 2001;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.onclick = () => modal.remove();
  modal.appendChild(closeBtn);

  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);
}

// ==========================================
// キーボード入力
// ==========================================
function onKeyDown(event) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
    isAutoMode = false;
    const btn = document.getElementById('autoBtn');
    if (btn) btn.style.background = 'linear-gradient(135deg, #666, #444)';
  }

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveVector.z = -1;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveVector.z = 1;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveVector.x = -1;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveVector.x = 1;
      break;
    case 'Space':
      toggleFlyMode();
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
    case 'ArrowDown':
    case 'KeyS':
      moveVector.z = 0;
      break;
    case 'ArrowLeft':
    case 'KeyA':
    case 'ArrowRight':
    case 'KeyD':
      moveVector.x = 0;
      break;
  }
}

// ==========================================
// ウィンドウリサイズ
// ==========================================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================
// AUTOモード更新
// ==========================================
function updateAutoMode() {
  if (!isAutoMode || nftPositions.length === 0) return;

  const target = nftPositions[autoTargetIndex];
  const targetPos = target.viewPos;
  const lookAtPos = target.lookAt;

  const dx = targetPos.x - player.position.x;
  const dz = targetPos.z - player.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  if (distance > 1.0) {
    const speed = 0.3;
    player.position.x += (dx / distance) * speed;
    player.position.z += (dz / distance) * speed;

    const angle = Math.atan2(
      lookAtPos.x - player.position.x,
      lookAtPos.z - player.position.z
    );
    player.rotation.y = angle;
    
    autoWaitTime = 0;
  } else {
    autoWaitTime++;
    
    const angle = Math.atan2(
      lookAtPos.x - player.position.x,
      lookAtPos.z - player.position.z
    );
    player.rotation.y = angle;

    if (autoWaitTime > 120) {
      autoTargetIndex = (autoTargetIndex + 1) % nftPositions.length;
      autoWaitTime = 0;
    }
  }
}

// ==========================================
// プレイヤー更新
// ==========================================
function updatePlayer() {
  const speed = 0.35;
  const boundary = ROOM_SIZE / 2 - 2;

  if (isAutoMode) {
    updateAutoMode();
  } else if (moveVector.length() > 0.1) {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    velocity.x = (forward.x * -moveVector.z + right.x * moveVector.x) * speed;
    velocity.z = (forward.z * -moveVector.z + right.z * moveVector.x) * speed;

    player.position.x += velocity.x;
    player.position.z += velocity.z;

    if (velocity.length() > 0.01) {
      const angle = Math.atan2(velocity.x, velocity.z);
      player.rotation.y = angle;
    }
  }

  player.position.x = Math.max(-boundary, Math.min(boundary, player.position.x));
  player.position.z = Math.max(-boundary, Math.min(boundary, player.position.z));

  if (isFlyMode) {
    if (player.position.y < 4) {
      player.position.y += 0.2;
    }
  } else {
    if (player.position.y > 0) {
      player.position.y -= 0.15;
      if (player.position.y < 0) player.position.y = 0;
    }
  }
  player.position.y = Math.min(player.position.y, WALL_HEIGHT - 2);

  if (!userControllingCamera) {
    const cameraHeight = isDog ? 3 : 5;
    const cameraDistance = 10;

    const targetCameraPos = new THREE.Vector3(
      player.position.x - Math.sin(player.rotation.y) * cameraDistance,
      player.position.y + cameraHeight,
      player.position.z - Math.cos(player.rotation.y) * cameraDistance
    );

    camera.position.lerp(targetCameraPos, 0.08);
  }
  
  controls.target.set(player.position.x, player.position.y + 1.5, player.position.z);
}

// ==========================================
// 豆更新
// ==========================================
function updateBeans() {
  for (let i = beans.length - 1; i >= 0; i--) {
    const bean = beans[i];
    bean.userData.velocity.y -= 0.015;
    bean.position.add(bean.userData.velocity);
    bean.userData.life--;

    targets.forEach(target => {
      if (!target.userData.isFlyingAway) {
        const dist = bean.position.distanceTo(target.position);
        if (dist < 1.5) {
          target.userData.hitCount++;
          if (target.userData.hitCount >= 3) {
            target.userData.isFlyingAway = true;
            target.userData.velocity.set(
              (Math.random() - 0.5) * 0.5,
              0.3,
              (Math.random() - 0.5) * 0.5
            );
          }
          scene.remove(bean);
          beans.splice(i, 1);
          return;
        }
      }
    });

    if (bean.position.y < 0 || bean.userData.life <= 0) {
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
      target.position.add(target.userData.velocity);
      target.userData.velocity.y -= 0.01;
      target.rotation.x += 0.1;
      target.rotation.z += 0.05;

      if (target.position.y < -10) {
        target.userData.isFlyingAway = false;
        target.userData.hitCount = 0;
        if (target.userData.originalPosition) {
          target.position.copy(target.userData.originalPosition);
        } else {
          target.position.y = 3;
        }
        target.rotation.set(0, 0, 0);
      }
    } else {
      target.lookAt(player.position.x, target.position.y, player.position.z);
    }
  });
}

// ==========================================
// アニメーションループ
// ==========================================
function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.001;
  const isMoving = moveVector.length() > 0.1 || isAutoMode;

  updatePlayer();
  updateBeans();
  updateTargets();

  if (isHuman) {
    animateHuman(playerAvatar, time, isMoving);
  } else {
    animateDog(playerAvatar, time, isMoving);
  }

  if (dustParticles) {
    dustParticles.rotation.y += 0.0001;
  }

  controls.update();
  renderer.render(scene, camera);
}

// ==========================================
// 起動
// ==========================================
init();

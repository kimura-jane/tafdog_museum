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
const ALCHEMY_API_KEY = "GvZn0mlz0Gh9RI6C-Wl5xl9fLjs8QmaQ";

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
let targets = [];
let beans = [];
let dustParticles;
let joystickActive = false;
let lastUserInteraction = 0;

// ターゲットキャラの画像URL
const baseUrl = "https://raw.githubusercontent.com/kimura-jane/tafdog_museum/main/";
const targetFiles = ["IMG_1822.png", "IMG_1889.png"];

// ==========================================
// 初期化
// ==========================================
async function init() {
  try {
    // シーン作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 30, 100);

    // カメラ
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    // レンダラー
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('root').appendChild(renderer.domElement);

    // コントロール
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    // 照明
    setupLighting();

    // 部屋作成
    createRoom();

    // プレイヤー作成
    createPlayer();

    // NFTデータ取得・配置
    nftData = generateNFTData();
    await fetchOwnerData();
    placeNFTsOnWalls();

    // ターゲットキャラ作成
    createTargets();

    // ダストパーティクル
    dustParticles = createDustParticles(100);
    scene.add(dustParticles);

    // UI作成
    createUI();
    createJoystick();

    // イベントリスナー
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);

    // ローディング画面を削除
    const loading = document.getElementById('loading');
    if (loading) loading.remove();

    // アニメーション開始
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
  // 環境光（明るめ）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // メインライト（上から）
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(0, 20, 0);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);

  // 補助ライト（斜め前から）
  const subLight1 = new THREE.DirectionalLight(0xfff5e6, 0.4);
  subLight1.position.set(20, 15, 20);
  scene.add(subLight1);

  // 補助ライト（反対側から）
  const subLight2 = new THREE.DirectionalLight(0xe6f0ff, 0.3);
  subLight2.position.set(-20, 15, -20);
  scene.add(subLight2);

  // 床を照らすライト
  const floorLight = new THREE.PointLight(0xffffff, 0.3, 100);
  floorLight.position.set(0, 8, 0);
  scene.add(floorLight);
}

// ==========================================
// 部屋作成
// ==========================================
function createRoom() {
  const halfSize = ROOM_SIZE / 2;

  // 床（ダークウッド調）
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

  // 天井
  const ceilingGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9
  });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  scene.add(ceiling);

  // 壁（オフホワイト）
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0ebe0,
    roughness: 0.7,
    metalness: 0
  });

  // 壁の位置と回転
  const walls = [
    { pos: [0, WALL_HEIGHT / 2, -halfSize], rot: [0, 0, 0] },      // 北壁
    { pos: [0, WALL_HEIGHT / 2, halfSize], rot: [0, Math.PI, 0] }, // 南壁
    { pos: [-halfSize, WALL_HEIGHT / 2, 0], rot: [0, Math.PI / 2, 0] },  // 西壁
    { pos: [halfSize, WALL_HEIGHT / 2, 0], rot: [0, -Math.PI / 2, 0] }   // 東壁
  ];

  walls.forEach(w => {
    const wallGeometry = new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT);
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(...w.pos);
    wall.rotation.set(...w.rot);
    wall.receiveShadow = true;
    scene.add(wall);
  });

  // 巾木（床と壁の境目）
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

  // 天井照明レール
  createCeilingRails();

  // 足跡
  createFootprints();
}

// ==========================================
// 天井照明レール
// ==========================================
function createCeilingRails() {
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const railHeight = WALL_HEIGHT - 0.1;

  // 中央レール（東西方向）
  const rail1 = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_SIZE * 0.8, 0.1, 0.3),
    railMaterial
  );
  rail1.position.set(0, railHeight, 0);
  scene.add(rail1);

  // 中央レール（南北方向）
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

  // ランダムな位置に足跡を配置
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * (ROOM_SIZE - 10);
    const z = (Math.random() - 0.5) * (ROOM_SIZE - 10);
    const rotation = Math.random() * Math.PI * 2;

    // 左足
    const leftFoot = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 16),
      footprintMaterial
    );
    leftFoot.rotation.x = -Math.PI / 2;
    leftFoot.position.set(x - 0.15, 0.01, z);
    leftFoot.rotation.z = rotation;
    scene.add(leftFoot);

    // 右足
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
  try {
    const url = `https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getOwnersForContract?contractAddress=${NFT_CONFIG.contractAddress}&withTokenBalances=true`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.owners) {
      data.owners.forEach(ownerInfo => {
        const wallet = ownerInfo.ownerAddress;
        if (ownerInfo.tokenBalances) {
          ownerInfo.tokenBalances.forEach(tb => {
            const tokenId = String(parseInt(tb.tokenId, 16));
            const nft = nftData.find(n => n.tokenId === tokenId);
            if (nft) {
              nft.owner = wallet;
              nft.ownerShort = wallet.slice(0, 6) + '...' + wallet.slice(-4);
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('オーナーデータ取得エラー:', error);
  }
}

// ==========================================
// NFT配置
// ==========================================
function placeNFTsOnWalls() {
  // 既存のNFTメッシュをクリア
  nftMeshes.forEach(mesh => scene.remove(mesh));
  nftMeshes = [];

  const halfSize = ROOM_SIZE / 2;
  const wallOffset = 0.5;
  const nftHeight = 4;
  const nftWidth = 3;
  const totalNFTs = nftData.length; // 50枚

  // 壁ごとのNFT配置設定
  // 50枚を4壁に分配: 13, 13, 12, 12
  const wallConfigs = [
    { // 北壁 (13枚)
      count: 13,
      getPosition: (i, spacing) => new THREE.Vector3(
        -halfSize + spacing * (i + 1),
        WALL_HEIGHT / 2,
        -halfSize + wallOffset
      ),
      rotation: 0
    },
    { // 南壁 (13枚)
      count: 13,
      getPosition: (i, spacing) => new THREE.Vector3(
        halfSize - spacing * (i + 1),
        WALL_HEIGHT / 2,
        halfSize - wallOffset
      ),
      rotation: Math.PI
    },
    { // 西壁 (12枚)
      count: 12,
      getPosition: (i, spacing) => new THREE.Vector3(
        -halfSize + wallOffset,
        WALL_HEIGHT / 2,
        halfSize - spacing * (i + 1)
      ),
      rotation: Math.PI / 2
    },
    { // 東壁 (12枚)
      count: 12,
      getPosition: (i, spacing) => new THREE.Vector3(
        halfSize - wallOffset,
        WALL_HEIGHT / 2,
        -halfSize + spacing * (i + 1)
      ),
      rotation: -Math.PI / 2
    }
  ];

  // 額縁スタイル
  const frameStyles = [
    { color: 0xd4af37, width: 0.15 }, // ゴールド
    { color: 0x1a1a1a, width: 0.12 }, // ブラック
    { color: 0xf5f5f5, width: 0.1 },  // ホワイト
    { color: 0x8b4513, width: 0.15 }, // ウッド
    { color: 0xc0c0c0, width: 0.12 }  // シルバー
  ];

  let nftIndex = 0;

  wallConfigs.forEach((config, wallIndex) => {
    const spacing = ROOM_SIZE / (config.count + 1);

    for (let i = 0; i < config.count && nftIndex < totalNFTs; i++) {
      const nft = nftData[nftIndex];
      const position = config.getPosition(i, spacing);
      const frameStyle = frameStyles[nftIndex % frameStyles.length];

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

  // 額縁
  const frameGeometry = new THREE.BoxGeometry(
    width + frameStyle.width * 2,
    height + frameStyle.width * 2,
    0.1
  );
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: frameStyle.color,
    roughness: 0.3,
    metalness: 0.5
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.z = -0.05;
  group.add(frame);

  // NFT画像
  const loader = new THREE.TextureLoader();
  loader.load(
    nft.imageUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      mesh.userData.nftData = nft;
      group.add(mesh);
      nftMeshes.push(mesh);

      // クリックイベント用にグループにもデータを保存
      group.userData.nftData = nft;
    },
    undefined,
    (error) => {
      console.error('テクスチャ読み込みエラー:', nft.imageUrl, error);
      // エラー時はプレースホルダーを表示
      const material = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
      mesh.userData.nftData = nft;
      group.add(mesh);
      nftMeshes.push(mesh);
    }
  );

  // スポットライト
  const spotlight = new THREE.SpotLight(0xffffff, 1.5, 15, Math.PI / 6, 0.5);
  spotlight.position.set(0, 3, 2);
  spotlight.target.position.set(0, 0, 0);
  group.add(spotlight);
  group.add(spotlight.target);

  group.position.copy(position);
  group.rotation.y = rotation;
  scene.add(group);
}

// ==========================================
// ターゲットキャラ作成
// ==========================================
function createTargets() {
  const halfSize = ROOM_SIZE / 2;
  const cornerOffset = 8;

  const corners = [
    { x: -halfSize + cornerOffset, z: -halfSize + cornerOffset, file: targetFiles[0] },
    { x: halfSize - cornerOffset, z: -halfSize + cornerOffset, file: targetFiles[1] },
    { x: -halfSize + cornerOffset, z: halfSize - cornerOffset, file: targetFiles[1] },
    { x: halfSize - cornerOffset, z: halfSize - cornerOffset, file: targetFiles[0] }
  ];

  const loader = new THREE.TextureLoader();

  corners.forEach(corner => {
    const url = baseUrl + corner.file;
    loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const geometry = new THREE.PlaneGeometry(2, 3);
      const mesh = new THREE.Mesh(geometry, material);

      const group = new THREE.Group();
      group.add(mesh);
      group.position.set(corner.x, 1.5, corner.z);
      group.userData.hitCount = 0;
      group.userData.isFlyingAway = false;
      group.userData.velocity = new THREE.Vector3();

      targets.push(group);
      scene.add(group);
    });
  });
}

// ==========================================
// UI作成
// ==========================================
function createUI() {
  // タイトル
  const title = document.createElement('div');
  title.style.cssText = `
    position: fixed;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(0,0,0,0.5);
    z-index: 1000;
    pointer-events: none;
  `;
  title.textContent = 'TAF DOG Museum';
  document.body.appendChild(title);

  // 上部ボタンバー
  const topBar = document.createElement('div');
  topBar.style.cssText = `
    position: fixed;
    top: 35px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 1000;
  `;
  document.body.appendChild(topBar);

  const buttonStyle = `
    padding: 8px 16px;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
  `;

  // HUMANボタン
  const humanBtn = document.createElement('button');
  humanBtn.textContent = 'HUMAN';
  humanBtn.style.cssText = buttonStyle + 'background: #4a90d9; color: white;';
  humanBtn.onclick = () => switchToHuman();
  topBar.appendChild(humanBtn);

  // AUTOボタン
  const autoBtn = document.createElement('button');
  autoBtn.textContent = 'AUTO';
  autoBtn.id = 'autoBtn';
  autoBtn.style.cssText = buttonStyle + 'background: #666; color: white;';
  autoBtn.onclick = () => toggleAutoMode();
  topBar.appendChild(autoBtn);

  // DOGボタン
  const dogBtn = document.createElement('button');
  dogBtn.textContent = 'DOG';
  dogBtn.style.cssText = buttonStyle + 'background: #d4a574; color: white;';
  dogBtn.onclick = () => switchToDog();
  topBar.appendChild(dogBtn);

  // 右側ボタン
  const rightBar = document.createElement('div');
  rightBar.style.cssText = `
    position: fixed;
    top: 100px;
    right: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
  `;
  document.body.appendChild(rightBar);

  // FLYボタン
  const flyBtn = document.createElement('button');
  flyBtn.textContent = 'FLY';
  flyBtn.id = 'flyBtn';
  flyBtn.style.cssText = buttonStyle + 'background: #9b59b6; color: white;';
  flyBtn.onclick = () => toggleFlyMode();
  rightBar.appendChild(flyBtn);

  // THROWボタン
  const throwBtn = document.createElement('button');
  throwBtn.textContent = 'THROW';
  throwBtn.style.cssText = buttonStyle + 'background: #e74c3c; color: white;';
  throwBtn.onclick = () => throwBean();
  rightBar.appendChild(throwBtn);

  // NFTクリックイベント
  renderer.domElement.addEventListener('click', onNFTClick);
  renderer.domElement.addEventListener('touchend', onNFTTouch);
}

// ==========================================
// ジョイスティック
// ==========================================
function createJoystick() {
  const container = document.createElement('div');
  container.id = 'joystick';
  container.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 30px;
    width: 120px;
    height: 120px;
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
    width: 50px;
    height: 50px;
    background: rgba(255,255,255,0.6);
    border-radius: 50%;
    pointer-events: none;
  `;
  container.appendChild(knob);

  let startX, startY;
  const maxDistance = 35;

  container.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
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
    lastUserInteraction = Date.now();
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
    btn.style.background = isAutoMode ? '#2ecc71' : '#666';
  }
}

function toggleFlyMode() {
  isFlyMode = !isFlyMode;
  const btn = document.getElementById('flyBtn');
  if (btn) {
    btn.style.background = isFlyMode ? '#2ecc71' : '#9b59b6';
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
  bean.position.y += 1;

  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(player.quaternion);

  bean.userData.velocity = direction.multiplyScalar(0.5);
  bean.userData.velocity.y = 0.2;
  bean.userData.life = 100;

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
    let nftData = null;
    let obj = intersects[0].object;

    while (obj && !nftData) {
      if (obj.userData && obj.userData.nftData) {
        nftData = obj.userData.nftData;
      }
      obj = obj.parent;
    }

    if (nftData) {
      showNFTModal(nftData);
    }
  }
}

// ==========================================
// NFTモーダル
// ==========================================
function showNFTModal(nft) {
  // 既存モーダルを削除
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
    justify-content: center;
    z-index: 2000;
    padding: 20px;
    box-sizing: border-box;
  `;

  // 画像コンテナ
  const imageContainer = document.createElement('div');
  imageContainer.style.cssText = `
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
    max-width: 90%;
  `;

  // メイン画像
  const mainImg = document.createElement('img');
  mainImg.src = nft.imageUrl;
  mainImg.style.cssText = `
    max-width: 300px;
    max-height: 400px;
    border-radius: 10px;
    box-shadow: 0 0 30px rgba(255,255,255,0.2);
  `;
  imageContainer.appendChild(mainImg);

  // 変化画像がある場合
  if (nft.stateImageUrl) {
    const stateImg = document.createElement('img');
    stateImg.src = nft.stateImageUrl;
    stateImg.style.cssText = mainImg.style.cssText;
    imageContainer.appendChild(stateImg);
  }

  modal.appendChild(imageContainer);

  // 情報
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
  modal.appendChild(info);

  // OpenSeaリンク
  const link = document.createElement('a');
  link.href = `https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}`;
  link.target = '_blank';
  link.style.cssText = `
    display: inline-block;
    margin-top: 15px;
    padding: 10px 25px;
    background: #2081e2;
    color: white;
    text-decoration: none;
    border-radius: 25px;
    font-weight: bold;
  `;
  link.textContent = 'View on OpenSea';
  modal.appendChild(link);

  // 閉じるボタン
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: none;
    border: none;
    color: white;
    font-size: 30px;
    cursor: pointer;
  `;
  closeBtn.onclick = () => modal.remove();
  modal.appendChild(closeBtn);

  // 背景クリックで閉じる
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  document.body.appendChild(modal);
}

// ==========================================
// キーボード入力
// ==========================================
function onKeyDown(event) {
  lastUserInteraction = Date.now();

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
      if (isFlyMode) {
        player.position.y += 0.5;
      }
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
// プレイヤー更新
// ==========================================
function updatePlayer() {
  const speed = 0.15;
  const boundary = ROOM_SIZE / 2 - 2;

  // オートモード
  if (isAutoMode) {
    const time = Date.now() * 0.0005;
    moveVector.x = Math.sin(time) * 0.3;
    moveVector.z = Math.cos(time * 0.7) * 0.3;
  }

  // 移動
  if (moveVector.length() > 0.1) {
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

    // 向きを更新
    if (velocity.length() > 0.01) {
      const angle = Math.atan2(velocity.x, velocity.z);
      player.rotation.y = angle;
    }
  }

  // 境界制限
  player.position.x = Math.max(-boundary, Math.min(boundary, player.position.x));
  player.position.z = Math.max(-boundary, Math.min(boundary, player.position.z));

  // 高さ制限（飛行モード）
  if (!isFlyMode && player.position.y > 0) {
    player.position.y -= 0.1;
    if (player.position.y < 0) player.position.y = 0;
  }
  player.position.y = Math.min(player.position.y, WALL_HEIGHT - 2);

  // カメラ追従
  const cameraHeight = isDog ? 3 : 5;
  const cameraDistance = 12;

  const targetCameraPos = new THREE.Vector3(
    player.position.x - Math.sin(player.rotation.y) * cameraDistance,
    player.position.y + cameraHeight,
    player.position.z - Math.cos(player.rotation.y) * cameraDistance
  );

  // ユーザー操作中は追従を緩める
  const timeSinceInteraction = Date.now() - lastUserInteraction;
  if (timeSinceInteraction > 1500) {
    camera.position.lerp(targetCameraPos, 0.03);
  }

  controls.target.set(player.position.x, player.position.y + 1, player.position.z);
}

// ==========================================
// 豆更新
// ==========================================
function updateBeans() {
  for (let i = beans.length - 1; i >= 0; i--) {
    const bean = beans[i];
    bean.userData.velocity.y -= 0.01;
    bean.position.add(bean.userData.velocity);
    bean.userData.life--;

    // ターゲットとの衝突判定
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
        }
      }
    });

    // 床に落ちたら削除
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
        target.position.y = 1.5;
        target.rotation.set(0, 0, 0);
      }
    } else {
      // プレイヤーの方を向く
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
  const isMoving = moveVector.length() > 0.1;

  updatePlayer();
  updateBeans();
  updateTargets();

  // アバターアニメーション
  if (isHuman) {
    animateHuman(playerAvatar, time, isMoving);
  } else {
    animateDog(playerAvatar, time, isMoving);
  }

  // ダストパーティクル
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

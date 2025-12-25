// ==========================================
// app.js - メインアプリケーション（完全版）
// ==========================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  NFT_CONFIG,
  CHANGE_RULES,
  generateNFTData,
  ROOM_SIZE,
  WALL_HEIGHT,
  TARGET_IMAGES,
  HUMAN_COLORS,
  DOG_COLORS
} from "./data.js";
import {
  getLighting,
  createHumanAvatar,
  createDogAvatar,
  animateHuman,
  animateDog,
  createBean,
  createTargetCharacter,
  createDustParticles
} from "./functions.js";

// ==========================================
// グローバル変数
// ==========================================
let scene, camera, renderer, controls;
let player, playerAvatar;
let isDogMode = false;
let isFlying = false;
let isAutoMode = false;
let autoTarget = null;
let currentFloor = 1;
let humanColorIndex = 0;
let dogColorIndex = 0;

const playerPosition = new THREE.Vector3(0, 0, 5);
const playerVelocity = new THREE.Vector3();
let playerRotation = 0;
let isMoving = false;

const moveVector = { x: 0, y: 0 };
const allNFTs = generateNFTData();
const artFrames = [];
const npcDogs = [];
const targetCharacters = [];
const beans = [];

let dustParticles = null;
let clock = new THREE.Clock();

// ==========================================
// 吹き出し表示
// ==========================================
function showSpeechBubble(text, position, duration = 1500) {
  const bubble = document.createElement("div");
  bubble.className = "fixed z-50 bg-white text-black px-4 py-2 rounded-full font-bold text-lg shadow-lg pointer-events-none";
  bubble.style.transition = "all 0.3s ease-out";
  bubble.textContent = text;
  document.body.appendChild(bubble);

  const vector = position.clone();
  vector.project(camera);
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;
  bubble.style.transform = "translate(-50%, -100%)";

  setTimeout(() => {
    bubble.style.opacity = "0";
    bubble.style.transform = "translate(-50%, -150%)";
  }, duration - 300);

  setTimeout(() => {
    bubble.remove();
  }, duration);
}

// ==========================================
// Alchemy API でオーナー情報取得
// ==========================================
async function fetchOwners() {
  const ALCHEMY_API_KEY = "NzzY5_VyMSoXXD0XqZpDL";
  
  try {
    const url = `https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getOwnersForContract?contractAddress=${NFT_CONFIG.contractAddress}&withTokenBalances=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.owners) {
      const ownerMap = {};
      
      data.owners.forEach(item => {
        item.tokenBalances.forEach(token => {
          let tokenId;
          if (token.tokenId.startsWith("0x")) {
            tokenId = parseInt(token.tokenId, 16).toString();
          } else {
            tokenId = token.tokenId;
          }
          ownerMap[tokenId] = item.ownerAddress;
        });
      });
      
      allNFTs.forEach(nft => {
        const owner = ownerMap[nft.tokenId];
        if (owner) {
          nft.owner = owner;
          nft.ownerShort = `${owner.slice(0, 6)}...${owner.slice(-4)}`;
        } else {
          nft.ownerShort = "Not minted";
        }
      });
      
      console.log("Owners loaded:", Object.keys(ownerMap).length);
    }
  } catch (error) {
    console.warn("Owner fetch failed:", error);
    allNFTs.forEach(nft => {
      nft.ownerShort = "N/A";
    });
  }
}

// ==========================================
// 初期化
// ==========================================
async function init() {
  await fetchOwners();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  scene.fog = new THREE.Fog(0x1a1a1a, 60, 150);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  document.getElementById("root").appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.target.set(0, 1, 0);

  setupLighting();
  createRoom();
  createPlayer();
  createNPCDogs();
  createTargets();

  dustParticles = createDustParticles(150);
  scene.add(dustParticles);

  createUI();
  setupEvents();

  document.getElementById("loading").style.display = "none";
  animate();
}

// ==========================================
// 照明
// ==========================================
function setupLighting() {
  const lighting = getLighting();

  const ambient = new THREE.AmbientLight(lighting.ambient, lighting.ambientIntensity * 0.8);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(lighting.dir, lighting.dirIntensity * 0.5);
  directional.position.set(10, 20, 10);
  directional.castShadow = true;
  scene.add(directional);
}

// ==========================================
// 部屋作成
// ==========================================
function createRoom() {
  const isMuseum = currentFloor === 1;
  const floorColor = isMuseum ? 0x2a2a2a : 0x3a3020;
  const wallColor = isMuseum ? 0x3a3a3a : 0x4a4030;

  // 床（美術館っぽい暗めの色）
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.isRoom = true;
  scene.add(floor);

  // 壁
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.95 });
  const walls = [
    { pos: [0, WALL_HEIGHT / 2, -ROOM_SIZE / 2], size: [ROOM_SIZE, WALL_HEIGHT, 0.5] },
    { pos: [0, WALL_HEIGHT / 2, ROOM_SIZE / 2], size: [ROOM_SIZE, WALL_HEIGHT, 0.5] },
    { pos: [-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0], size: [0.5, WALL_HEIGHT, ROOM_SIZE] },
    { pos: [ROOM_SIZE / 2, WALL_HEIGHT / 2, 0], size: [0.5, WALL_HEIGHT, ROOM_SIZE] }
  ];
  walls.forEach(w => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...w.size), wallMat);
    wall.position.set(...w.pos);
    wall.receiveShadow = true;
    wall.userData.isRoom = true;
    scene.add(wall);
  });

  // 天井
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  ceiling.userData.isRoom = true;
  scene.add(ceiling);

  placeNFTsOnWalls();
}

// ==========================================
// スポットライト照明器具を作成
// ==========================================
function createSpotlightFixture(position) {
  const group = new THREE.Group();
  group.position.copy(position);

  // レール
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
  );
  rail.position.y = 0;
  group.add(rail);

  // アーム
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
  );
  arm.position.y = -0.15;
  group.add(arm);

  // ライト本体（円筒形）
  const lightBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
  );
  lightBody.position.y = -0.4;
  lightBody.rotation.x = Math.PI;
  group.add(lightBody);

  // 実際のスポットライト
  const spotlight = new THREE.SpotLight(0xfff5e0, 2, 15, Math.PI / 6, 0.5, 1);
  spotlight.position.y = -0.4;
  spotlight.target.position.set(position.x, 0, position.z);
  group.add(spotlight);
  scene.add(spotlight.target);

  group.userData.isRoom = true;
  return group;
}

// ==========================================
// NFTを4つの壁に均等配置（美術館風）
// ==========================================
function placeNFTsOnWalls() {
  const nfts = currentFloor === 1 ? allNFTs.slice(0, 80) : allNFTs.slice(80, 100);
  
  const WALL_OFFSET = 0.5;  // 壁にぴったり
  const MARGIN = 8;  // 端からのマージン
  const usableLength = ROOM_SIZE - MARGIN * 2;
  const NFT_SPACING = 8;  // 絵の間隔
  
  // 各壁に配置できる枚数
  const perWall = Math.floor(usableLength / NFT_SPACING);
  
  let nftIndex = 0;

  // 北壁（Z=-）- 絵は部屋の内側（Z+方向）を向く
  const northCount = Math.min(perWall, nfts.length - nftIndex);
  for (let i = 0; i < northCount; i++) {
    const nft = nfts[nftIndex++];
    const x = -usableLength / 2 + NFT_SPACING / 2 + i * NFT_SPACING;
    const pos = new THREE.Vector3(x, 4, -ROOM_SIZE / 2 + WALL_OFFSET);
    const rot = new THREE.Euler(0, 0, 0);  // Z+方向を向く
    createArtFrame(nft, pos, rot);
    
    // スポットライト
    const lightPos = new THREE.Vector3(x, WALL_HEIGHT - 0.5, -ROOM_SIZE / 2 + 2);
    scene.add(createSpotlightFixture(lightPos));
  }

  // 南壁（Z=+）- 絵は部屋の内側（Z-方向）を向く
  const southCount = Math.min(perWall, nfts.length - nftIndex);
  for (let i = 0; i < southCount; i++) {
    const nft = nfts[nftIndex++];
    const x = usableLength / 2 - NFT_SPACING / 2 - i * NFT_SPACING;
    const pos = new THREE.Vector3(x, 4, ROOM_SIZE / 2 - WALL_OFFSET);
    const rot = new THREE.Euler(0, Math.PI, 0);  // Z-方向を向く
    createArtFrame(nft, pos, rot);
    
    // スポットライト
    const lightPos = new THREE.Vector3(x, WALL_HEIGHT - 0.5, ROOM_SIZE / 2 - 2);
    scene.add(createSpotlightFixture(lightPos));
  }

  // 東壁（X=+）- 絵は部屋の内側（X-方向）を向く
  const eastCount = Math.min(perWall, nfts.length - nftIndex);
  for (let i = 0; i < eastCount; i++) {
    const nft = nfts[nftIndex++];
    const z = -usableLength / 2 + NFT_SPACING / 2 + i * NFT_SPACING;
    const pos = new THREE.Vector3(ROOM_SIZE / 2 - WALL_OFFSET, 4, z);
    const rot = new THREE.Euler(0, -Math.PI / 2, 0);  // X-方向を向く
    createArtFrame(nft, pos, rot);
    
    // スポットライト
    const lightPos = new THREE.Vector3(ROOM_SIZE / 2 - 2, WALL_HEIGHT - 0.5, z);
    scene.add(createSpotlightFixture(lightPos));
  }

  // 西壁（X=-）- 絵は部屋の内側（X+方向）を向く
  const westCount = Math.min(perWall, nfts.length - nftIndex);
  for (let i = 0; i < westCount; i++) {
    const nft = nfts[nftIndex++];
    const z = usableLength / 2 - NFT_SPACING / 2 - i * NFT_SPACING;
    const pos = new THREE.Vector3(-ROOM_SIZE / 2 + WALL_OFFSET, 4, z);
    const rot = new THREE.Euler(0, Math.PI / 2, 0);  // X+方向を向く
    createArtFrame(nft, pos, rot);
    
    // スポットライト
    const lightPos = new THREE.Vector3(-ROOM_SIZE / 2 + 2, WALL_HEIGHT - 0.5, z);
    scene.add(createSpotlightFixture(lightPos));
  }
}

// ==========================================
// NFTフレーム作成
// ==========================================
function createArtFrame(nft, position, rotation) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.copy(rotation);
  group.userData.nft = nft;

  // フレーム（黒い額縁）
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 3.5, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
  );
  frame.position.z = 0.05;
  group.add(frame);

  // マット（白い縁取り）
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 3.2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  mat.position.z = 0.11;
  group.add(mat);

  // 画像
  const loader = new THREE.TextureLoader();
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(nft.imageUrl)}&w=512`;

  loader.load(proxyUrl, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 2.8),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    art.position.z = 0.13;
    group.add(art);
  }, undefined, () => {
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    art.position.z = 0.13;
    group.add(art);
  });

  scene.add(group);
  artFrames.push(group);
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
  player.remove(playerAvatar);
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
  for (let i = 0; i < 5; i++) {
    const dog = createDogAvatar(DOG_COLORS[i % DOG_COLORS.length]);
    dog.position.set((Math.random() - 0.5) * 50, 0, (Math.random() - 0.5) * 50);
    dog.userData.targetPos = dog.position.clone();
    dog.userData.waitTime = Math.random() * 3;
    scene.add(dog);
    npcDogs.push(dog);
  }
}

function updateNPCDogs(delta, time) {
  npcDogs.forEach(dog => {
    if (dog.userData.waitTime > 0) {
      dog.userData.waitTime -= delta;
      animateDog(dog, time, false);
      return;
    }

    const target = dog.userData.targetPos;
    const dist = dog.position.distanceTo(target);

    if (dist > 0.5) {
      const dir = new THREE.Vector3().subVectors(target, dog.position).normalize();
      dog.position.add(dir.multiplyScalar(delta * 1.5));
      dog.rotation.y = Math.atan2(dir.x, dir.z);
      animateDog(dog, time, true);
    } else {
      dog.userData.targetPos = new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        0,
        (Math.random() - 0.5) * 50
      );
      dog.userData.waitTime = 2 + Math.random() * 4;
    }
  });
}

// ==========================================
// ターゲットキャラ
// ==========================================
function createTargets() {
  const positions = [
    [ROOM_SIZE / 2 - 5, 0, ROOM_SIZE / 2 - 5],
    [-ROOM_SIZE / 2 + 5, 0, ROOM_SIZE / 2 - 5],
    [ROOM_SIZE / 2 - 5, 0, -ROOM_SIZE / 2 + 5],
    [-ROOM_SIZE / 2 + 5, 0, -ROOM_SIZE / 2 + 5]
  ];

  positions.forEach((pos, i) => {
    const imgUrl = TARGET_IMAGES[i % TARGET_IMAGES.length];
    const character = createTargetCharacter(imgUrl);
    character.position.set(...pos);
    character.userData.rotationSpeed = (Math.random() - 0.5) * 2;
    scene.add(character);
    targetCharacters.push(character);
  });
}

function updateTargets(delta) {
  targetCharacters.forEach(char => {
    if (char.userData.isFlyingAway) {
      char.position.y += delta * 8;
      char.rotation.z += delta * 5;
      char.scale.multiplyScalar(0.97);
      if (char.position.y > 30) {
        char.visible = false;
      }
    } else {
      char.rotation.y += char.userData.rotationSpeed * delta;
    }
  });
}

// ==========================================
// 豆投げ
// ==========================================
function throwBean() {
  const bean = createBean();
  bean.position.copy(playerPosition);
  bean.position.y = 1.2;

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.normalize();

  bean.userData.velocity = direction.clone().multiplyScalar(0.8);
  bean.userData.gravity = -0.02;
  bean.userData.lifetime = 0;

  scene.add(bean);
  beans.push(bean);
}

function updateBeans(delta) {
  const toRemove = [];

  beans.forEach((bean, idx) => {
    bean.userData.velocity.y += bean.userData.gravity;
    bean.position.add(bean.userData.velocity);

    bean.rotation.x += 0.3;
    bean.rotation.y += 0.2;

    bean.userData.lifetime += delta;

    if (bean.position.y < 0 || bean.userData.lifetime > 3) {
      toRemove.push(idx);
      return;
    }

    for (const char of targetCharacters) {
      if (!char.visible || char.userData.isFlyingAway) continue;
      const dist = bean.position.distanceTo(char.position);
      if (dist < 1.5) {
        char.userData.hitCount++;

        if (char.userData.mesh) {
          char.userData.mesh.material.color.setHex(0xff0000);
          setTimeout(() => {
            if (char.userData.mesh) char.userData.mesh.material.color.setHex(0xffffff);
          }, 200);
        }

        const bubblePos = char.position.clone();
        bubblePos.y += 3;
        showSpeechBubble("痛いっ！", bubblePos, 1000);

        if (char.userData.hitCount >= 10) {
          char.userData.isFlyingAway = true;
          showSpeechBubble("あーーれーーー！！", bubblePos, 2000);
        }

        toRemove.push(idx);
        break;
      }
    }
  });

  toRemove.reverse().forEach(idx => {
    scene.remove(beans[idx]);
    beans.splice(idx, 1);
  });
}

// ==========================================
// プレイヤー更新
// ==========================================
function updatePlayer(delta, time) {
  if (isAutoMode) {
    if (!autoTarget || playerPosition.distanceTo(autoTarget) < 2) {
      autoTarget = new THREE.Vector3(
        (Math.random() - 0.5) * (ROOM_SIZE - 15),
        0,
        (Math.random() - 0.5) * (ROOM_SIZE - 15)
      );
    }
    const dir = new THREE.Vector3().subVectors(autoTarget, playerPosition).normalize();
    moveVector.x = dir.x;
    moveVector.y = dir.z;
  }

  isMoving = Math.abs(moveVector.x) > 0.01 || Math.abs(moveVector.y) > 0.01;

  if (isMoving) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
    
    let moveDir;
    if (isAutoMode) {
      moveDir = new THREE.Vector3(moveVector.x, 0, moveVector.y).normalize();
    } else {
      moveDir = new THREE.Vector3()
        .addScaledVector(forward, moveVector.y)
        .addScaledVector(right, moveVector.x)
        .normalize();
    }

    const speed = isDogMode ? 0.15 : 0.12;
    playerVelocity.lerp(moveDir.multiplyScalar(speed), 0.15);

    if (moveDir.length() > 0.01) {
      playerRotation = Math.atan2(moveDir.x, moveDir.z);
    }
  } else {
    playerVelocity.lerp(new THREE.Vector3(), 0.15);
  }

  playerPosition.add(playerVelocity);

  const limit = ROOM_SIZE / 2 - 3;
  playerPosition.x = Math.max(-limit, Math.min(limit, playerPosition.x));
  playerPosition.z = Math.max(-limit, Math.min(limit, playerPosition.z));

  const targetY = isFlying ? 6 : 0;
  playerPosition.y = THREE.MathUtils.lerp(playerPosition.y, targetY, 0.05);

  player.position.copy(playerPosition);
  player.rotation.y = playerRotation;

  if (isDogMode) {
    animateDog(playerAvatar, time, isMoving);
  } else {
    animateHuman(playerAvatar, time, isMoving);
  }

  const camY = isDogMode ? playerPosition.y + 0.5 : playerPosition.y + 1.2;
  controls.target.lerp(new THREE.Vector3(playerPosition.x, camY, playerPosition.z), 0.1);
  controls.update();
}

// ==========================================
// UI
// ==========================================
function createUI() {
  const ui = document.createElement("div");
  ui.innerHTML = `
    <div class="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
      <h1 class="text-white text-xl font-bold tracking-wider">TAF DOG MUSEUM</h1>
      <div class="flex gap-2">
        <button id="btn-human" class="px-4 py-2 rounded-full bg-white text-black font-bold text-sm">HUMAN</button>
        <button id="btn-dog" class="px-4 py-2 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-sm">DOG</button>
        <button id="btn-auto" class="px-4 py-2 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-sm">AUTO</button>
      </div>
    </div>
    <div class="fixed top-1/2 left-4 -translate-y-1/2 flex flex-col gap-2 z-10">
      <button id="btn-floor-2" class="w-12 h-12 rounded-lg bg-black/50 text-white/70 border border-white/20 font-bold text-sm">2F</button>
      <button id="btn-floor-1" class="w-12 h-12 rounded-lg bg-white text-black font-bold text-sm">1F</button>
    </div>
    <div class="fixed bottom-32 right-4 flex flex-col gap-3 z-10">
      <button id="btn-fly" class="w-14 h-14 rounded-full bg-black/50 text-white/70 border border-white/20 font-bold text-xs">FLY</button>
      <button id="btn-throw" class="w-14 h-14 rounded-full bg-red-500/80 text-white border border-red-300 font-bold text-xs">THROW</button>
    </div>
    <div class="fixed bottom-12 left-1/2 -translate-x-1/2 z-20">
      <div id="joystick-base" class="w-32 h-32 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center cursor-pointer">
        <div id="joystick-stick" class="w-12 h-12 rounded-full bg-white shadow-lg"></div>
      </div>
      <div class="text-white/30 text-xs text-center mt-4 tracking-widest">DRAG TO WALK</div>
    </div>
  `;
  document.body.appendChild(ui);

  document.getElementById("btn-human").onclick = () => {
    if (isDogMode) {
      isDogMode = false;
      isFlying = false;
      switchAvatar();
      updateButtons();
    } else {
      humanColorIndex = (humanColorIndex + 1) % HUMAN_COLORS.length;
      switchAvatar();
    }
  };

  document.getElementById("btn-dog").onclick = () => {
    if (!isDogMode) {
      isDogMode = true;
      isFlying = false;
      switchAvatar();
      updateButtons();
    } else {
      dogColorIndex = (dogColorIndex + 1) % DOG_COLORS.length;
      switchAvatar();
    }
  };

  document.getElementById("btn-auto").onclick = () => {
    isAutoMode = !isAutoMode;
    if (!isAutoMode) {
      moveVector.x = 0;
      moveVector.y = 0;
    }
    updateButtons();
  };

  document.getElementById("btn-fly").onclick = () => {
    if (!isDogMode) {
      isFlying = !isFlying;
      updateButtons();
    }
  };

  document.getElementById("btn-throw").onclick = () => {
    throwBean();
  };

  document.getElementById("btn-floor-1").onclick = () => {
    if (currentFloor !== 1) {
      currentFloor = 1;
      rebuildRoom();
      updateButtons();
    }
  };

  document.getElementById("btn-floor-2").onclick = () => {
    if (currentFloor !== 2) {
      currentFloor = 2;
      rebuildRoom();
      updateButtons();
    }
  };

  setupJoystick();
}

function updateButtons() {
  const humanBtn = document.getElementById("btn-human");
  const dogBtn = document.getElementById("btn-dog");
  const autoBtn = document.getElementById("btn-auto");
  const flyBtn = document.getElementById("btn-fly");
  const floor1Btn = document.getElementById("btn-floor-1");
  const floor2Btn = document.getElementById("btn-floor-2");

  humanBtn.className = `px-4 py-2 rounded-full font-bold text-sm ${!isDogMode ? "bg-white text-black" : "bg-black/50 text-white/70 border border-white/20"}`;
  dogBtn.className = `px-4 py-2 rounded-full font-bold text-sm ${isDogMode ? "bg-white text-black" : "bg-black/50 text-white/70 border border-white/20"}`;
  autoBtn.className = `px-4 py-2 rounded-full font-bold text-sm ${isAutoMode ? "bg-green-500 text-white" : "bg-black/50 text-white/70 border border-white/20"}`;
  flyBtn.className = `w-14 h-14 rounded-full font-bold text-xs ${isFlying ? "bg-blue-500 text-white" : "bg-black/50 text-white/70 border border-white/20"}`;
  flyBtn.style.display = isDogMode ? "none" : "flex";
  floor1Btn.className = `w-12 h-12 rounded-lg font-bold text-sm ${currentFloor === 1 ? "bg-white text-black" : "bg-black/50 text-white/70 border border-white/20"}`;
  floor2Btn.className = `w-12 h-12 rounded-lg font-bold text-sm ${currentFloor === 2 ? "bg-white text-black" : "bg-black/50 text-white/70 border border-white/20"}`;
}

function rebuildRoom() {
  const toRemove = [];
  scene.traverse(obj => {
    if (obj.userData.isRoom || obj.userData.nft) toRemove.push(obj);
  });
  toRemove.forEach(obj => scene.remove(obj));
  artFrames.length = 0;

  createRoom();
  playerPosition.set(0, 0, 5);
}

function setupJoystick() {
  const base = document.getElementById("joystick-base");
  const stick = document.getElementById("joystick-stick");
  let active = false;
  const maxDist = 40;

  function handleMove(x, y) {
    if (isAutoMode) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = x - cx;
    let dy = y - cy;
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
    if (isAutoMode) return;
    active = false;
    stick.style.transform = "translate(0,0)";
    moveVector.x = 0;
    moveVector.y = 0;
  }

  base.addEventListener("mousedown", e => { active = true; handleMove(e.clientX, e.clientY); });
  base.addEventListener("touchstart", e => { active = true; handleMove(e.touches[0].clientX, e.touches[0].clientY); });
  window.addEventListener("mousemove", e => { if (active) handleMove(e.clientX, e.clientY); });
  window.addEventListener("touchmove", e => { if (active) handleMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener("mouseup", handleEnd);
  window.addEventListener("touchend", handleEnd);
}

// ==========================================
// イベント
// ==========================================
function setupEvents() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener("keydown", e => {
    if (isAutoMode) return;
    switch (e.key.toLowerCase()) {
      case "w": moveVector.y = 1; break;
      case "s": moveVector.y = -1; break;
      case "a": moveVector.x = -1; break;
      case "d": moveVector.x = 1; break;
      case " ": throwBean(); break;
    }
  });
  window.addEventListener("keyup", e => {
    if (isAutoMode) return;
    switch (e.key.toLowerCase()) {
      case "w": case "s": moveVector.y = 0; break;
      case "a": case "d": moveVector.x = 0; break;
    }
  });

  renderer.domElement.addEventListener("click", onCanvasClick);
}

function onCanvasClick(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  for (const frame of artFrames) {
    const intersects = raycaster.intersectObject(frame, true);
    if (intersects.length > 0) {
      showNFTModal(frame.userData.nft);
      return;
    }
  }
}

function showNFTModal(nft) {
  const existing = document.getElementById("nft-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "nft-modal";
  modal.className = "fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4";
  modal.innerHTML = `
    <div class="bg-zinc-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex flex-col md:flex-row">
        <div class="w-full md:w-1/2 bg-black p-8 flex flex-col items-center justify-center gap-4">
          <img src="https://wsrv.nl/?url=${encodeURIComponent(nft.imageUrl)}" alt="TAF DOG #${nft.tokenId}" class="max-w-full max-h-[40vh] object-contain" />
          ${nft.stateImageUrl ? `
            <div class="text-white/50 text-sm">↓ 変化後 ↓</div>
            <img src="https://wsrv.nl/?url=${encodeURIComponent(nft.stateImageUrl)}" alt="変化後" class="max-w-full max-h-[30vh] object-contain opacity-80" />
          ` : ""}
        </div>
        <div class="w-full md:w-1/2 p-8">
          <h2 class="text-3xl font-bold text-white mb-4">TAF DOG #${nft.tokenId}</h2>
          <div class="space-y-4">
            <div>
              <div class="text-white/50 text-sm mb-1">Owner</div>
              <div class="text-white font-mono text-sm">${nft.ownerShort}</div>
            </div>
            ${nft.changeRule ? `
              <div>
                <div class="text-white/50 text-sm mb-1">変化条件</div>
                <div class="text-yellow-400">${nft.changeRule}</div>
              </div>
            ` : ""}
            <div class="text-white/60 text-sm">TAF DOGコレクションのユニークな作品。</div>
          </div>
          <div class="mt-8 flex gap-4">
            <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" target="_blank" class="bg-white text-black px-6 py-3 rounded-full font-bold text-sm">OpenSea</a>
            <button onclick="document.getElementById('nft-modal').remove()" class="bg-zinc-700 text-white px-6 py-3 rounded-full font-bold text-sm">閉じる</button>
          </div>
        </div>
      </div>
    </div>
  `;
  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
}

// ==========================================
// アニメーションループ
// ==========================================
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const time = clock.getElapsedTime();

  updatePlayer(delta, time);
  updateNPCDogs(delta, time);
  updateBeans(delta);
  updateTargets(delta);

  renderer.render(scene, camera);
}

// ==========================================
// 起動
// ==========================================
init();

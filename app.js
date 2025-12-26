// ==========================================
// app.js - TAF DOG MUSEUM メインアプリケーション
// ==========================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// data.jsからインポート
import { NFT_CONFIG, ROOM_SIZE, WALL_HEIGHT, TARGET_IMAGES, HUMAN_COLORS, DOG_COLORS, generateNFTData } from './data.js';

// functions.jsからインポート
import { getLighting, createHumanAvatar, createDogAvatar, animateHuman, animateDog, createBean, createTargetCharacter, createDustParticles } from './functions.js';

// ==========================================
// グローバル変数
// ==========================================
let scene, camera, renderer, controls;
let player, avatar;
let isDogMode = false;
let isFlyMode = false;
let isAutoMode = false;
let currentColorIndex = 0;
let moveVector = new THREE.Vector3();
let joystickActive = false;
let beans = [];
let targets = [];
let npcDogs = [];
let dustParticles;
let nftData = [];
let currentFloor = 1;
let isThrowingAnimation = false;
let throwAnimationTime = 0;
let cameraOffset = new THREE.Vector3(0, 5, 10);
let lastManualCameraAngle = 0;
let isUserRotating = false;
let userRotationTimeout = null;

// UI要素
let flyBtn, throwBtn, humanBtn, dogBtn, autoBtn, floorBtn;

// キー入力
const keys = { w: false, a: false, s: false, d: false, space: false };

// Alchemy API
const ALCHEMY_API_KEY = "NzzY5_VyMSoXXD0XqZpDL";

// ==========================================
// 初期化
// ==========================================
async function init() {
    // シーン作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

    // カメラ作成
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // レンダラー作成
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enablePan = false;

    // ユーザー操作検知
    controls.addEventListener('start', () => {
        isUserRotating = true;
        if (userRotationTimeout) clearTimeout(userRotationTimeout);
    });
    controls.addEventListener('end', () => {
        userRotationTimeout = setTimeout(() => {
            isUserRotating = false;
        }, 2000);
    });

    // 照明設定
    setupLighting();

    // 部屋作成
    createRoom();

    // プレイヤー作成
    createPlayer();

    // NFTデータ取得と配置
    nftData = generateNFTData();
    await fetchOwnerData();
    placeNFTsOnWalls();

    // ターゲット作成（四隅）
    createTargets();

    // ダストパーティクル
    dustParticles = createDustParticles(100);
    scene.add(dustParticles);

    // UI作成
    createUI();

    // ジョイスティック設定
    setupJoystick();

    // イベントリスナー
    setupEventListeners();

    // アニメーション開始
    animate();
}

// ==========================================
// 照明設定
// ==========================================
function setupLighting() {
    const lighting = getLighting();

    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // メインライト
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 30, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // サブライト
    const subLight = new THREE.DirectionalLight(0xffffff, 0.8);
    subLight.position.set(-10, 25, -10);
    scene.add(subLight);

    // フィルライト
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(0, -10, 0);
    scene.add(fillLight);
}

// ==========================================
// 部屋作成
// ==========================================
function createRoom() {
    const isMuseum = true;

    // 床
    const floorGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: isMuseum ? 0xb0b0b0 : 0xa08060,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 天井
    const ceilingGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x606060,
        side: THREE.DoubleSide
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    scene.add(ceiling);

    // 壁
    const wallColor = isMuseum ? 0xe8e8e8 : 0xd0c0a0;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: wallColor, side: THREE.DoubleSide });

    // 前壁
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMaterial);
    frontWall.position.set(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2);
    scene.add(frontWall);

    // 後壁
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMaterial);
    backWall.position.set(0, WALL_HEIGHT / 2, ROOM_SIZE / 2);
    backWall.rotation.y = Math.PI;
    scene.add(backWall);

    // 左壁
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMaterial);
    leftWall.position.set(-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // 右壁
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMaterial);
    rightWall.position.set(ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
}

// ==========================================
// プレイヤー作成
// ==========================================
function createPlayer() {
    player = new THREE.Group();
    player.position.set(0, 0, 0);
    scene.add(player);

    avatar = createHumanAvatar(HUMAN_COLORS[currentColorIndex]);
    player.add(avatar);
}

// ==========================================
// アバター切り替え
// ==========================================
function switchAvatar() {
    if (avatar) {
        player.remove(avatar);
    }

    if (isDogMode) {
        avatar = createDogAvatar(DOG_COLORS[currentColorIndex % DOG_COLORS.length]);
    } else {
        avatar = createHumanAvatar(HUMAN_COLORS[currentColorIndex % HUMAN_COLORS.length]);
    }
    player.add(avatar);
}

// ==========================================
// NFTオーナー情報取得
// ==========================================
async function fetchOwnerData() {
    try {
        const response = await fetch(
            `https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract?contractAddress=${NFT_CONFIG.contractAddress}&withMetadata=false`
        );
        const data = await response.json();

        if (data.nfts) {
            data.nfts.forEach(nft => {
                const tokenId = parseInt(nft.tokenId);
                const nftItem = nftData.find(n => n.tokenId === tokenId);
                if (nftItem && nft.owners && nft.owners[0]) {
                    nftItem.owner = nft.owners[0];
                    nftItem.ownerShort = nft.owners[0].slice(0, 6) + '...' + nft.owners[0].slice(-4);
                }
            });
        }
    } catch (error) {
        console.error('Owner data fetch error:', error);
    }
}

// ==========================================
// NFTを壁に配置
// ==========================================
function placeNFTsOnWalls() {
    // 既存のNFTを削除
    scene.children.filter(child => child.userData && child.userData.isNFT).forEach(child => {
        scene.remove(child);
    });

    const nftsPerWall = 5;
    const startIndex = (currentFloor - 1) * 20;
    const endIndex = Math.min(startIndex + 20, nftData.length);
    const nftsToShow = nftData.slice(startIndex, endIndex);

    const walls = [
        { pos: new THREE.Vector3(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2 + 0.1), rot: 0 },
        { pos: new THREE.Vector3(0, WALL_HEIGHT / 2, ROOM_SIZE / 2 - 0.1), rot: Math.PI },
        { pos: new THREE.Vector3(-ROOM_SIZE / 2 + 0.1, WALL_HEIGHT / 2, 0), rot: Math.PI / 2 },
        { pos: new THREE.Vector3(ROOM_SIZE / 2 - 0.1, WALL_HEIGHT / 2, 0), rot: -Math.PI / 2 }
    ];

    const spacing = ROOM_SIZE / (nftsPerWall + 1);

    nftsToShow.forEach((nft, index) => {
        const wallIndex = Math.floor(index / nftsPerWall);
        const posInWall = index % nftsPerWall;

        if (wallIndex >= walls.length) return;

        const wall = walls[wallIndex];
        const offset = (posInWall - (nftsPerWall - 1) / 2) * spacing;

        const loader = new THREE.TextureLoader();
        loader.load(nft.imageUrl, (texture) => {
            const geometry = new THREE.PlaneGeometry(4, 4);
            const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
            const mesh = new THREE.Mesh(geometry, material);

            if (wallIndex === 0 || wallIndex === 1) {
                mesh.position.set(wall.pos.x + offset, wall.pos.y, wall.pos.z);
            } else {
                mesh.position.set(wall.pos.x, wall.pos.y, wall.pos.z + offset);
            }
            mesh.rotation.y = wall.rot;
            mesh.userData.isNFT = true;
            mesh.userData.nftData = nft;

            scene.add(mesh);

            // スポットライト追加
            const spotlight = new THREE.SpotLight(0xffffff, 0.5);
            spotlight.position.set(mesh.position.x, mesh.position.y + 3, mesh.position.z + (wallIndex < 2 ? 2 : 0));
            spotlight.target = mesh;
            spotlight.angle = Math.PI / 6;
            spotlight.penumbra = 0.3;
            scene.add(spotlight);
        });
    });
}

// ==========================================
// ターゲット作成（四隅）
// ==========================================
function createTargets() {
    const baseUrl = 'https://raw.githubusercontent.com/kimura-jane/tafdog_museum/main/';
    const targetFiles = ['IMG_1822.png', 'IMG_1889.png'];

    // 四隅の位置
    const corners = [
        { x: ROOM_SIZE / 2 - 5, z: -ROOM_SIZE / 2 + 5 },   // 右奥
        { x: -ROOM_SIZE / 2 + 5, z: -ROOM_SIZE / 2 + 5 }, // 左奥
        { x: ROOM_SIZE / 2 - 5, z: ROOM_SIZE / 2 - 5 },   // 右手前
        { x: -ROOM_SIZE / 2 + 5, z: ROOM_SIZE / 2 - 5 }   // 左手前
    ];

    corners.forEach((corner, index) => {
        const fileIndex = index % targetFiles.length;
        const url = baseUrl + targetFiles[fileIndex];

        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            const geometry = new THREE.PlaneGeometry(2.5, 3.5);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true
            });
            const mesh = new THREE.Mesh(geometry, material);

            const group = new THREE.Group();
            group.add(mesh);
            group.position.set(corner.x, 1.75, corner.z);
            group.userData.hitCount = 0;
            group.userData.isFlyingAway = false;

            scene.add(group);
            targets.push(group);
        });
    });
}

// ==========================================
// UI作成
// ==========================================
function createUI() {
    // タイトル
    const title = document.createElement('div');
    title.innerHTML = 'TAF DOG MUSEUM';
    title.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        z-index: 1000;
        pointer-events: none;
    `;
    document.body.appendChild(title);

    // ボタンコンテナ（上部中央）
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        z-index: 1000;
    `;
    document.body.appendChild(buttonContainer);

    // HUMANボタン
    humanBtn = document.createElement('button');
    humanBtn.textContent = 'HUMAN';
    humanBtn.style.cssText = getButtonStyle(true);
    humanBtn.onclick = () => {
        isDogMode = false;
        currentColorIndex = (currentColorIndex + 1) % HUMAN_COLORS.length;
        switchAvatar();
        updateButtons();
    };
    buttonContainer.appendChild(humanBtn);

    // AUTOボタン
    autoBtn = document.createElement('button');
    autoBtn.textContent = 'AUTO';
    autoBtn.style.cssText = getButtonStyle(false);
    autoBtn.onclick = () => {
        isAutoMode = !isAutoMode;
        updateButtons();
    };
    buttonContainer.appendChild(autoBtn);

    // DOGボタン
    dogBtn = document.createElement('button');
    dogBtn.textContent = 'DOG';
    dogBtn.style.cssText = getButtonStyle(false);
    dogBtn.onclick = () => {
        isDogMode = true;
        currentColorIndex = (currentColorIndex + 1) % DOG_COLORS.length;
        switchAvatar();
        updateButtons();
    };
    buttonContainer.appendChild(dogBtn);

    // FLYボタン（右側）
    flyBtn = document.createElement('button');
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
        border: 2px solid #666;
        color: white;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1000;
        display: block;
    `;
    flyBtn.onclick = () => {
        isFlyMode = !isFlyMode;
        flyBtn.style.background = isFlyMode ? '#4a90d9' : '#333';
    };
    document.body.appendChild(flyBtn);

    // THROWボタン（右下）
    throwBtn = document.createElement('button');
    throwBtn.textContent = 'THROW';
    throwBtn.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 100px;
        width: 70px;
        height: 70px;
        border-radius: 50%;
        background: #8B4513;
        border: 2px solid #A0522D;
        color: white;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        z-index: 1000;
    `;
    throwBtn.onclick = () => throwBean();
    document.body.appendChild(throwBtn);

    // フロアボタン
    floorBtn = document.createElement('button');
    floorBtn.textContent = `${currentFloor}F`;
    floorBtn.style.cssText = `
        position: fixed;
        left: 20px;
        top: 50px;
        padding: 10px 20px;
        background: #333;
        border: 2px solid #666;
        color: white;
        font-size: 16px;
        font-weight: bold;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    `;
    floorBtn.onclick = () => {
        currentFloor = currentFloor >= 5 ? 1 : currentFloor + 1;
        floorBtn.textContent = `${currentFloor}F`;
        placeNFTsOnWalls();
    };
    document.body.appendChild(floorBtn);
}

function getButtonStyle(active) {
    return `
        padding: 10px 20px;
        background: ${active ? '#4a90d9' : '#333'};
        border: 2px solid ${active ? '#357abd' : '#666'};
        color: white;
        font-size: 14px;
        font-weight: bold;
        border-radius: 5px;
        cursor: pointer;
    `;
}

function updateButtons() {
    humanBtn.style.cssText = getButtonStyle(!isDogMode);
    dogBtn.style.cssText = getButtonStyle(isDogMode);
    autoBtn.style.background = isAutoMode ? '#4a90d9' : '#333';
    autoBtn.style.border = isAutoMode ? '2px solid #357abd' : '2px solid #666';
}

// ==========================================
// ジョイスティック設定
// ==========================================
function setupJoystick() {
    const joystickContainer = document.createElement('div');
    joystickContainer.style.cssText = `
        position: fixed;
        left: 20px;
        bottom: 20px;
        width: 120px;
        height: 120px;
        background: rgba(0,0,0,0.3);
        border-radius: 50%;
        z-index: 1000;
        touch-action: none;
    `;
    document.body.appendChild(joystickContainer);

    const knob = document.createElement('div');
    knob.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 50px;
        height: 50px;
        background: rgba(255,255,255,0.8);
        border-radius: 50%;
        touch-action: none;
    `;
    joystickContainer.appendChild(knob);

    const maxDist = 35;
    let centerX = 60;
    let centerY = 60;

    function onStart(e) {
        e.preventDefault();
        e.stopPropagation();
        joystickActive = true;
        controls.enabled = false;
        controls.enableRotate = false;
        controls.enableZoom = false;
        controls.enablePan = false;
    }

    function onMove(e) {
        if (!joystickActive) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = joystickContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let x = clientX - rect.left - centerX;
        let y = clientY - rect.top - centerY;

        const dist = Math.sqrt(x * x + y * y);
        if (dist > maxDist) {
            x = (x / dist) * maxDist;
            y = (y / dist) * maxDist;
        }

        knob.style.left = (centerX + x) + 'px';
        knob.style.top = (centerY + y) + 'px';

        moveVector.x = x / maxDist;
        moveVector.z = y / maxDist;
    }

    function onEnd(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        joystickActive = false;
        controls.enabled = true;
        controls.enableRotate = true;
        controls.enableZoom = true;

        knob.style.left = '50%';
        knob.style.top = '50%';
        moveVector.x = 0;
        moveVector.z = 0;
    }

    joystickContainer.addEventListener('mousedown', onStart);
    joystickContainer.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
}

// ==========================================
// イベントリスナー設定
// ==========================================
function setupEventListeners() {
    // キーボード
    document.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key.toLowerCase())) {
            keys[e.key.toLowerCase()] = true;
        }
    });

    document.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key.toLowerCase())) {
            keys[e.key.toLowerCase()] = false;
        }
    });

    // リサイズ
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // NFTクリック
    renderer.domElement.addEventListener('click', onCanvasClick);
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

function onCanvasClick(event) {
    event.preventDefault();

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    for (let intersect of intersects) {
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
// NFTモーダル表示
// ==========================================
function showNFTModal(nft) {
    const modal = document.createElement('div');
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
        z-index: 2000;
    `;

    let imagesHtml;
    if (nft.stateImageUrl) {
        imagesHtml = `
            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <p style="color: #888; margin-bottom: 5px;">通常</p>
                    <img src="${nft.imageUrl}" style="max-width: 150px; max-height: 150px; border-radius: 5px;">
                </div>
                <div style="text-align: center;">
                    <p style="color: #888; margin-bottom: 5px;">変化後</p>
                    <img src="${nft.stateImageUrl}" style="max-width: 150px; max-height: 150px; border-radius: 5px;">
                </div>
            </div>
        `;
    } else {
        imagesHtml = `
            <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                <img src="${nft.imageUrl}" style="max-width: 200px; max-height: 200px; border-radius: 5px;">
            </div>
        `;
    }

    modal.innerHTML = `
        <div style="background: #1a1a2e; padding: 30px; border-radius: 15px; max-width: 400px; text-align: center; color: white;">
            <h2 style="margin-bottom: 15px;">TAF DOG #${nft.tokenId}</h2>
            ${imagesHtml}
            ${nft.changeRule ? `<p style="color: #ffd700; margin-bottom: 15px;">${nft.changeRule}</p>` : ''}
            <p style="margin-bottom: 10px;">Owner: ${nft.ownerShort || 'Unknown'}</p>
            <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" 
               target="_blank" 
               style="display: inline-block; padding: 10px 20px; background: #4a90d9; color: white; text-decoration: none; border-radius: 5px; margin-bottom: 15px;">
                OpenSeaで見る
            </a>
            <br>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="padding: 10px 30px; background: #333; border: none; color: white; border-radius: 5px; cursor: pointer;">
                閉じる
            </button>
        </div>
    `;

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
}

// ==========================================
// 豆投げ
// ==========================================
function throwBean() {
    if (isThrowingAnimation) return;

    isThrowingAnimation = true;
    throwAnimationTime = 0;

    setTimeout(() => {
        const bean = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xd4a574,
                emissive: 0x442200,
                emissiveIntensity: 0.3
            })
        );

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        bean.position.copy(player.position);
        bean.position.y += isDogMode ? 1.0 : 2.0;
        bean.position.add(direction.clone().multiplyScalar(0.5));

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
// プレイヤー更新
// ==========================================
function updatePlayer() {
    const speed = isDogMode ? 0.3 : 0.2;
    let moved = false;

    // キーボード入力
    if (keys.w) { player.position.z -= speed; moved = true; }
    if (keys.s) { player.position.z += speed; moved = true; }
    if (keys.a) { player.position.x -= speed; moved = true; }
    if (keys.d) { player.position.x += speed; moved = true; }

    // ジョイスティック入力
    if (moveVector.length() > 0.1) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));

        const moveDirection = new THREE.Vector3();
        moveDirection.addScaledVector(cameraRight, moveVector.x);
        moveDirection.addScaledVector(cameraDirection, -moveVector.z);
        moveDirection.normalize();

        player.position.add(moveDirection.multiplyScalar(speed));

        // プレイヤーの向きを移動方向に
        if (moveDirection.length() > 0) {
            const angle = Math.atan2(moveDirection.x, moveDirection.z);
            player.rotation.y = angle;
        }

        moved = true;
    }

    // FLYモード
    if (isFlyMode) {
        if (keys.space) player.position.y += 0.2;
        player.position.y = Math.max(0, player.position.y);
    } else {
        player.position.y = 0;
    }

    // 部屋の境界制限
    const limit = ROOM_SIZE / 2 - 2;
    player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
    player.position.z = Math.max(-limit, Math.min(limit, player.position.z));

    // カメラ追従（ユーザーが操作中でない場合）
    if (!isUserRotating) {
        const targetPosition = new THREE.Vector3();
        targetPosition.copy(player.position);

        // カメラをプレイヤーの後方に配置
        const offset = new THREE.Vector3(0, 5, 10);
        offset.applyQuaternion(player.quaternion);

        const desiredCameraPos = player.position.clone().add(offset);
        camera.position.lerp(desiredCameraPos, 0.05);
    }

    // OrbitControlsのターゲットは常にプレイヤー
    controls.target.lerp(player.position, 0.1);

    return moved;
}

// ==========================================
// 豆更新
// ==========================================
function updateBeans() {
    for (let i = beans.length - 1; i >= 0; i--) {
        const bean = beans[i];

        bean.position.add(bean.userData.velocity);
        bean.userData.velocity.y += bean.userData.gravity;
        bean.userData.life--;

        // ターゲットとの衝突判定
        for (let target of targets) {
            if (target.userData.isFlyingAway) continue;

            const dist = bean.position.distanceTo(target.position);
            if (dist < 2) {
                target.userData.hitCount++;

                // 吹き出し表示
                showSpeechBubble(target.position, target.userData.hitCount > 2 ? 'あーれー！' : '痛いっ！');

                if (target.userData.hitCount >= 3) {
                    target.userData.isFlyingAway = true;
                }

                scene.remove(bean);
                beans.splice(i, 1);
                break;
            }
        }

        // 寿命切れまたは地面に落ちた
        if (bean.userData.life <= 0 || bean.position.y < 0) {
            scene.remove(bean);
            beans.splice(i, 1);
        }
    }
}

// ==========================================
// 吹き出し表示
// ==========================================
function showSpeechBubble(position, text) {
    const bubble = document.createElement('div');
    bubble.textContent = text;
    bubble.style.cssText = `
        position: fixed;
        background: white;
        padding: 5px 10px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: bold;
        z-index: 1500;
        pointer-events: none;
    `;

    const screenPos = position.clone().project(camera);
    bubble.style.left = ((screenPos.x + 1) / 2 * window.innerWidth) + 'px';
    bubble.style.top = ((-screenPos.y + 1) / 2 * window.innerHeight) + 'px';

    document.body.appendChild(bubble);

    setTimeout(() => bubble.remove(), 1000);
}

// ==========================================
// ターゲット更新
// ==========================================
function updateTargets() {
    for (let target of targets) {
        if (target.userData.isFlyingAway) {
            target.position.y += 0.1;
            target.rotation.z += 0.1;

            if (target.position.y > 50) {
                scene.remove(target);
                const index = targets.indexOf(target);
                if (index > -1) targets.splice(index, 1);
            }
        } else {
            // プレイヤーの方を向く
            target.lookAt(player.position.x, target.position.y, player.position.z);
        }
    }
}

// ==========================================
// 投げアニメーション適用
// ==========================================
function applyThrowAnimation(isHuman) {
    if (!isThrowingAnimation || !avatar) return;

    throwAnimationTime += 0.05;
    const progress = Math.min(throwAnimationTime / 0.3, 1);

    if (isHuman) {
        const rightArm = avatar.getObjectByName('rightArm');
        if (rightArm) {
            if (progress < 0.5) {
                rightArm.rotation.x = -Math.PI * 0.8 * (progress / 0.5);
            } else {
                rightArm.rotation.x = -Math.PI * 0.8 * (1 - (progress - 0.5) / 0.5);
            }
        }
    } else {
        const head = avatar.getObjectByName('head');
        if (head) {
            if (progress < 0.5) {
                head.rotation.x = -0.3 * (progress / 0.5);
            } else {
                head.rotation.x = -0.3 * (1 - (progress - 0.5) / 0.5);
            }
        }
    }
}

// ==========================================
// ダストパーティクル更新
// ==========================================
function updateDustParticles() {
    if (!dustParticles) return;

    const positions = dustParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.01;
        if (positions[i + 1] < 0) {
            positions[i + 1] = WALL_HEIGHT;
        }
    }
    dustParticles.geometry.attributes.position.needsUpdate = true;
}

// ==========================================
// オートモード
// ==========================================
function updateAutoMode() {
    if (!isAutoMode) return;

    const time = Date.now() * 0.001;
    const radius = 15;

    player.position.x = Math.sin(time * 0.3) * radius;
    player.position.z = Math.cos(time * 0.3) * radius;
    player.rotation.y = -time * 0.3 + Math.PI;
}

// ==========================================
// アニメーションループ
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;
    const isMoving = updatePlayer();

    // オートモード
    updateAutoMode();

    // アバターアニメーション
    if (isDogMode) {
        animateDog(avatar, time, isMoving);
        applyThrowAnimation(false);
    } else {
        animateHuman(avatar, time, isMoving);
        applyThrowAnimation(true);
    }

    // 更新処理
    updateBeans();
    updateTargets();
    updateDustParticles();

    controls.update();
    renderer.render(scene, camera);
}

// ==========================================
// 初期化実行
// ==========================================
init();

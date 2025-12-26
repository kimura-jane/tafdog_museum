// ==========================================
// app.js - TAF DOG MUSEUM メインアプリケーション
// ==========================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// data.jsからインポート
import { NFT_CONFIG, ROOM_SIZE, WALL_HEIGHT, HUMAN_COLORS, DOG_COLORS, generateNFTData } from './data.js';

// functions.jsからインポート
import { createHumanAvatar, createDogAvatar, animateHuman, animateDog, createDustParticles } from './functions.js';

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
let dustParticles;
let nftData = [];
let currentFloor = 1;
let isThrowingAnimation = false;
let throwAnimationTime = 0;
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
    try {
        // シーン作成（明るい空色）
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

        // カメラ作成
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 15);

        // レンダラー作成
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // #rootにレンダラーを追加
        const root = document.getElementById('root');
        root.appendChild(renderer.domElement);

        // ローディング画面を削除
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.remove();

        // OrbitControls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 3;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2.1;
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
        fetchOwnerData();
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

        console.log('Museum initialized successfully!');

    } catch (error) {
        console.error('Init error:', error);
        alert('エラー: ' + error.message);
    }
}

// ==========================================
// 照明設定（明るく）
// ==========================================
function setupLighting() {
    // 環境光（とても明るく）
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // メインライト
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(10, 30, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    // サブライト
    const subLight = new THREE.DirectionalLight(0xffffff, 0.8);
    subLight.position.set(-10, 20, -10);
    scene.add(subLight);

    // 下からのフィルライト
    const fillLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(fillLight);

    // 追加の点光源（部屋の中央）
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
    pointLight.position.set(0, WALL_HEIGHT - 1, 0);
    scene.add(pointLight);
}

// ==========================================
// 部屋作成（明るい美術館）
// ==========================================
function createRoom() {
    // 床（明るいグレー）
    const floorGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.8,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 天井（白）
    const ceilingGeometry = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    scene.add(ceiling);

    // 壁（明るいベージュ/白）
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf5f5f0, 
        side: THREE.DoubleSide,
        roughness: 0.9
    });

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
                const tokenId = nft.tokenId;
                const nftItem = nftData.find(n => n.tokenId === tokenId || n.tokenId === String(tokenId));
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
    const toRemove = scene.children.filter(child => child.userData && child.userData.isNFT);
    toRemove.forEach(child => scene.remove(child));

    const nftsPerWall = 5;
    const startIndex = (currentFloor - 1) * 20;
    const endIndex = Math.min(startIndex + 20, nftData.length);
    const nftsToShow = nftData.slice(startIndex, endIndex);

    const walls = [
        { pos: new THREE.Vector3(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2 + 0.5), rot: 0 },
        { pos: new THREE.Vector3(0, WALL_HEIGHT / 2, ROOM_SIZE / 2 - 0.5), rot: Math.PI },
        { pos: new THREE.Vector3(-ROOM_SIZE / 2 + 0.5, WALL_HEIGHT / 2, 0), rot: Math.PI / 2 },
        { pos: new THREE.Vector3(ROOM_SIZE / 2 - 0.5, WALL_HEIGHT / 2, 0), rot: -Math.PI / 2 }
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
            const geometry = new THREE.PlaneGeometry(5, 5);
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
        });
    });
}

// ==========================================
// ターゲット作成（四隅）
// ==========================================
function createTargets() {
    const baseUrl = 'https://raw.githubusercontent.com/kimura-jane/tafdog_museum/main/';
    const targetFiles = ['IMG_1822.png', 'IMG_1889.png'];

    const corners = [
        { x: ROOM_SIZE / 2 - 5, z: -ROOM_SIZE / 2 + 5 },
        { x: -ROOM_SIZE / 2 + 5, z: -ROOM_SIZE / 2 + 5 },
        { x: ROOM_SIZE / 2 - 5, z: ROOM_SIZE / 2 - 5 },
        { x: -ROOM_SIZE / 2 + 5, z: ROOM_SIZE / 2 - 5 }
    ];

    corners.forEach((corner, index) => {
        const fileIndex = index % targetFiles.length;
        const url = baseUrl + targetFiles[fileIndex];

        const loader = new THREE.TextureLoader();
        loader.load(url, (texture) => {
            const geometry = new THREE.PlaneGeometry(3, 4);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true
            });
            const mesh = new THREE.Mesh(geometry, material);

            const group = new THREE.Group();
            group.add(mesh);
            group.position.set(corner.x, 2, corner.z);
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
    title.style.cssText = 'position:fixed;top:15px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:bold;color:white;text-shadow:2px 2px 4px rgba(0,0,0,0.8);z-index:1000;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(title);

    // 左上: フロアボタン
    floorBtn = document.createElement('button');
    floorBtn.textContent = `${currentFloor}F`;
    floorBtn.style.cssText = 'position:fixed;left:15px;top:50px;padding:10px 20px;background:rgba(0,0,0,0.6);border:none;color:white;font-size:16px;font-weight:bold;border-radius:8px;cursor:pointer;z-index:1000;';
    floorBtn.onclick = () => {
        currentFloor = currentFloor >= 5 ? 1 : currentFloor + 1;
        floorBtn.textContent = `${currentFloor}F`;
        placeNFTsOnWalls();
    };
    document.body.appendChild(floorBtn);

    // 上部中央: モード切替ボタン
    const modeContainer = document.createElement('div');
    modeContainer.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:1000;';
    document.body.appendChild(modeContainer);

    humanBtn = document.createElement('button');
    humanBtn.textContent = 'HUMAN';
    humanBtn.style.cssText = 'padding:10px 15px;background:#4a90d9;border:none;color:white;font-size:12px;font-weight:bold;border-radius:6px;cursor:pointer;';
    humanBtn.onclick = () => {
        isDogMode = false;
        currentColorIndex = (currentColorIndex + 1) % HUMAN_COLORS.length;
        switchAvatar();
        updateModeButtons();
    };
    modeContainer.appendChild(humanBtn);

    autoBtn = document.createElement('button');
    autoBtn.textContent = 'AUTO';
    autoBtn.style.cssText = 'padding:10px 15px;background:rgba(0,0,0,0.6);border:none;color:white;font-size:12px;font-weight:bold;border-radius:6px;cursor:pointer;';
    autoBtn.onclick = () => {
        isAutoMode = !isAutoMode;
        updateModeButtons();
    };
    modeContainer.appendChild(autoBtn);

    dogBtn = document.createElement('button');
    dogBtn.textContent = 'DOG';
    dogBtn.style.cssText = 'padding:10px 15px;background:rgba(0,0,0,0.6);border:none;color:white;font-size:12px;font-weight:bold;border-radius:6px;cursor:pointer;';
    dogBtn.onclick = () => {
        isDogMode = true;
        currentColorIndex = (currentColorIndex + 1) % DOG_COLORS.length;
        switchAvatar();
        updateModeButtons();
    };
    modeContainer.appendChild(dogBtn);

    // 右側: FLYボタン
    flyBtn = document.createElement('button');
    flyBtn.textContent = 'FLY';
    flyBtn.style.cssText = 'position:fixed;right:20px;top:50%;transform:translateY(-70px);width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,0.6);border:none;color:white;font-size:14px;font-weight:bold;cursor:pointer;z-index:1000;';
    flyBtn.onclick = () => {
        isFlyMode = !isFlyMode;
        flyBtn.style.background = isFlyMode ? '#4a90d9' : 'rgba(0,0,0,0.6)';
    };
    document.body.appendChild(flyBtn);

    // 右側: THROWボタン
    throwBtn = document.createElement('button');
    throwBtn.textContent = 'THROW';
    throwBtn.style.cssText = 'position:fixed;right:20px;top:50%;transform:translateY(10px);width:60px;height:60px;border-radius:50%;background:#8B4513;border:none;color:white;font-size:11px;font-weight:bold;cursor:pointer;z-index:1000;';
    throwBtn.onclick = () => throwBean();
    document.body.appendChild(throwBtn);
}

function updateModeButtons() {
    humanBtn.style.background = !isDogMode ? '#4a90d9' : 'rgba(0,0,0,0.6)';
    dogBtn.style.background = isDogMode ? '#4a90d9' : 'rgba(0,0,0,0.6)';
    autoBtn.style.background = isAutoMode ? '#4a90d9' : 'rgba(0,0,0,0.6)';
}

// ==========================================
// ジョイスティック設定
// ==========================================
function setupJoystick() {
    const joystickContainer = document.createElement('div');
    joystickContainer.style.cssText = 'position:fixed;left:20px;bottom:30px;width:100px;height:100px;background:rgba(0,0,0,0.3);border-radius:50%;z-index:1000;touch-action:none;';
    document.body.appendChild(joystickContainer);

    const knob = document.createElement('div');
    knob.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:45px;height:45px;background:rgba(255,255,255,0.7);border-radius:50%;touch-action:none;';
    joystickContainer.appendChild(knob);

    const maxDist = 30;
    const centerX = 50;
    const centerY = 50;

    function onStart(e) {
        e.preventDefault();
        e.stopPropagation();
        joystickActive = true;
        controls.enabled = false;
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

    function onEnd() {
        joystickActive = false;
        controls.enabled = true;
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
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (keys.hasOwnProperty(key)) keys[key] = true;
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keys.hasOwnProperty(key)) keys[key] = false;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            onCanvasClick({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} });
        }
    });
}

function onCanvasClick(event) {
    if (event.preventDefault) event.preventDefault();

    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

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
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:2000;';

    let imagesHtml = nft.stateImageUrl
        ? `<div style="display:flex;justify-content:center;gap:15px;margin-bottom:15px;">
            <div style="text-align:center;"><p style="color:#888;font-size:12px;margin-bottom:5px;">通常</p><img src="${nft.imageUrl}" style="max-width:120px;border-radius:5px;"></div>
            <div style="text-align:center;"><p style="color:#888;font-size:12px;margin-bottom:5px;">変化後</p><img src="${nft.stateImageUrl}" style="max-width:120px;border-radius:5px;"></div>
           </div>`
        : `<div style="text-align:center;margin-bottom:15px;"><img src="${nft.imageUrl}" style="max-width:180px;border-radius:5px;"></div>`;

    modal.innerHTML = `
        <div style="background:#1a1a2e;padding:25px;border-radius:15px;max-width:350px;text-align:center;color:white;">
            <h2 style="margin-bottom:12px;font-size:18px;">TAF DOG #${nft.tokenId}</h2>
            ${imagesHtml}
            ${nft.changeRule ? `<p style="color:#ffd700;margin-bottom:12px;font-size:13px;">${nft.changeRule}</p>` : ''}
            <p style="margin-bottom:10px;font-size:12px;">Owner: ${nft.ownerShort || 'Unknown'}</p>
            <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" target="_blank" 
               style="display:inline-block;padding:10px 20px;background:#4a90d9;color:white;text-decoration:none;border-radius:5px;margin-bottom:12px;font-size:13px;">OpenSeaで見る</a>
            <br>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="padding:10px 25px;background:#333;border:none;color:white;border-radius:5px;cursor:pointer;font-size:13px;">閉じる</button>
        </div>
    `;

    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
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
            new THREE.SphereGeometry(0.2, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xd4a574, emissive: 0x442200, emissiveIntensity: 0.3 })
        );

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        bean.position.copy(player.position);
        bean.position.y += isDogMode ? 1.0 : 1.8;
        bean.position.add(direction.clone().multiplyScalar(0.5));

        bean.userData.velocity = direction.clone().multiplyScalar(0.6);
        bean.userData.velocity.y += 0.25;
        bean.userData.gravity = -0.015;
        bean.userData.life = 200;

        scene.add(bean);
        beans.push(bean);
    }, 250);

    setTimeout(() => { isThrowingAnimation = false; }, 500);
}

// ==========================================
// プレイヤー更新
// ==========================================
function updatePlayer() {
    const speed = isDogMode ? 0.25 : 0.18;
    let moved = false;

    if (keys.w) { player.position.z -= speed; moved = true; }
    if (keys.s) { player.position.z += speed; moved = true; }
    if (keys.a) { player.position.x -= speed; moved = true; }
    if (keys.d) { player.position.x += speed; moved = true; }

    if (moveVector.length() > 0.1) {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();

        const camRight = new THREE.Vector3();
        camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0));

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(camRight, moveVector.x);
        moveDir.addScaledVector(camDir, -moveVector.z);
        moveDir.normalize();

        player.position.add(moveDir.multiplyScalar(speed));

        if (moveDir.length() > 0) {
            player.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }
        moved = true;
    }

    if (isFlyMode && keys.space) player.position.y += 0.15;
    if (!isFlyMode) player.position.y = 0;

    const limit = ROOM_SIZE / 2 - 2;
    player.position.x = Math.max(-limit, Math.min(limit, player.position.x));
    player.position.z = Math.max(-limit, Math.min(limit, player.position.z));

    if (!isUserRotating && moved) {
        const offset = new THREE.Vector3(0, 4, 8);
        offset.applyQuaternion(player.quaternion);
        camera.position.lerp(player.position.clone().add(offset), 0.04);
    }
    controls.target.lerp(player.position, 0.08);

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

        for (let target of targets) {
            if (target.userData.isFlyingAway) continue;
            if (bean.position.distanceTo(target.position) < 2.5) {
                target.userData.hitCount++;
                showSpeechBubble(target.position, target.userData.hitCount > 2 ? 'あーれー！' : '痛いっ！');
                if (target.userData.hitCount >= 3) target.userData.isFlyingAway = true;
                scene.remove(bean);
                beans.splice(i, 1);
                break;
            }
        }

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
    bubble.style.cssText = 'position:fixed;background:white;padding:8px 15px;border-radius:15px;font-size:16px;font-weight:bold;z-index:1500;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,0.3);';

    const screenPos = position.clone().project(camera);
    bubble.style.left = ((screenPos.x + 1) / 2 * window.innerWidth) + 'px';
    bubble.style.top = ((-screenPos.y + 1) / 2 * window.innerHeight - 60) + 'px';

    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 1200);
}

// ==========================================
// ターゲット更新
// ==========================================
function updateTargets() {
    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        if (target.userData.isFlyingAway) {
            target.position.y += 0.12;
            target.rotation.z += 0.08;
            if (target.position.y > 50) {
                scene.remove(target);
                targets.splice(i, 1);
            }
        } else {
            target.lookAt(player.position.x, target.position.y, player.position.z);
        }
    }
}

// ==========================================
// 投げアニメーション
// ==========================================
function applyThrowAnimation(isHuman) {
    if (!isThrowingAnimation || !avatar) return;
    throwAnimationTime += 0.06;
    const progress = Math.min(throwAnimationTime / 0.25, 1);

    if (isHuman) {
        const rightArm = avatar.getObjectByName('rightArm');
        if (rightArm) {
            rightArm.rotation.x = progress < 0.5 
                ? -Math.PI * 0.7 * (progress / 0.5) 
                : -Math.PI * 0.7 * (1 - (progress - 0.5) / 0.5);
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
        positions[i + 1] -= 0.008;
        if (positions[i + 1] < 0) positions[i + 1] = WALL_HEIGHT;
    }
    dustParticles.geometry.attributes.position.needsUpdate = true;
}

// ==========================================
// オートモード
// ==========================================
function updateAutoMode() {
    if (!isAutoMode) return;
    const time = Date.now() * 0.001;
    player.position.x = Math.sin(time * 0.3) * 15;
    player.position.z = Math.cos(time * 0.3) * 15;
    player.rotation.y = -time * 0.3 + Math.PI;
}

// ==========================================
// アニメーションループ
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;
    const isMoving = updatePlayer();

    updateAutoMode();

    if (isDogMode) {
        animateDog(avatar, time, isMoving);
    } else {
        animateHuman(avatar, time, isMoving);
        applyThrowAnimation(true);
    }

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

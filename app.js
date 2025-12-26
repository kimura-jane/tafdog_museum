// ==========================================
// app.js - TAF DOG MUSEUM メインアプリケーション
// ==========================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { NFT_CONFIG, ROOM_SIZE, WALL_HEIGHT, HUMAN_COLORS, DOG_COLORS, generateNFTData } from './data.js';
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
let footprints = [];
let lastFootprintTime = 0;
let lastFootprintPos = new THREE.Vector3();

let cameraAngle = 0;
let isUserControlling = false;
let userControlTimeout = null;

let flyBtn, throwBtn, humanBtn, dogBtn, autoBtn, floorBtn;

const keys = { w: false, a: false, s: false, d: false, space: false };
const ALCHEMY_API_KEY = "NzzY5_VyMSoXXD0XqZpDL";

// 額縁のスタイル
const FRAME_STYLES = [
    { color: 0xd4af37, name: 'gold', width: 0.15 },      // ゴールド
    { color: 0x1a1a1a, name: 'black', width: 0.12 },     // ブラック
    { color: 0xffffff, name: 'white', width: 0.1 },      // ホワイト
    { color: 0x5c4033, name: 'wood', width: 0.18 },      // ウッド
    { color: 0xc0c0c0, name: 'silver', width: 0.12 }     // シルバー
];

// ==========================================
// 初期化
// ==========================================
async function init() {
    try {
        // シーン作成（美術館らしい暗めの背景）
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        scene.fog = new THREE.Fog(0x1a1a1a, 30, 80);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 15);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;

        const root = document.getElementById('root');
        root.appendChild(renderer.domElement);

        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.remove();

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = false;
        controls.minDistance = 5;
        controls.maxDistance = 30;
        controls.maxPolarAngle = Math.PI / 2.2;
        controls.minPolarAngle = 0.3;

        controls.addEventListener('start', () => {
            isUserControlling = true;
            if (userControlTimeout) clearTimeout(userControlTimeout);
        });
        controls.addEventListener('end', () => {
            userControlTimeout = setTimeout(() => {
                isUserControlling = false;
            }, 1500);
        });

        setupLighting();
        createRoom();
        createPlayer();

        nftData = generateNFTData();
        fetchOwnerData();
        placeNFTsOnWalls();
        createTargets();

        dustParticles = createDustParticles(50);
        scene.add(dustParticles);

        createUI();
        setupJoystick();
        setupEventListeners();

        animate();

    } catch (error) {
        console.error('Init error:', error);
    }
}

// ==========================================
// 照明設定（美術館スタイル）
// ==========================================
function setupLighting() {
    // 環境光（かなり暗め）
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);

    // 天井からの間接光（弱め）
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
    scene.add(hemi);

    // メインの方向光（影用）
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(0, WALL_HEIGHT, 0);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
}

// ==========================================
// 部屋作成（高級美術館スタイル）
// ==========================================
function createRoom() {
    // 床（ダークウッド調）
    const floorGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x2a1f1a,
        roughness: 0.4,
        metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 床のグリッドライン（木目風）
    const lineColor = 0x3d2b1f;
    const lineMat = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.3 });
    for (let i = -ROOM_SIZE/2; i <= ROOM_SIZE/2; i += 4) {
        const points = [new THREE.Vector3(i, 0.01, -ROOM_SIZE/2), new THREE.Vector3(i, 0.01, ROOM_SIZE/2)];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        scene.add(new THREE.Line(geo, lineMat));
    }

    // 天井（暗め）
    const ceilingGeo = new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    scene.add(ceiling);

    // 壁（くすんだベージュ）
    const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0xf0ebe0, 
        side: THREE.DoubleSide,
        roughness: 0.9
    });

    const walls = [
        { pos: [0, WALL_HEIGHT/2, -ROOM_SIZE/2], rot: [0, 0, 0] },
        { pos: [0, WALL_HEIGHT/2, ROOM_SIZE/2], rot: [0, Math.PI, 0] },
        { pos: [-ROOM_SIZE/2, WALL_HEIGHT/2, 0], rot: [0, Math.PI/2, 0] },
        { pos: [ROOM_SIZE/2, WALL_HEIGHT/2, 0], rot: [0, -Math.PI/2, 0] }
    ];

    walls.forEach(w => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMat);
        wall.position.set(...w.pos);
        wall.rotation.set(...w.rot);
        scene.add(wall);
    });

    // 巾木（壁と床の境目）
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x2a1f1a });
    walls.forEach(w => {
        const baseboard = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, 0.3, 0.1), baseboardMat);
        baseboard.position.set(w.pos[0], 0.15, w.pos[2]);
        baseboard.rotation.y = w.rot[1];
        scene.add(baseboard);
    });

    // 天井の照明レール
    createLightingRails();
}

// ==========================================
// 照明レール作成
// ==========================================
function createLightingRails() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
    
    // 各壁の前にレールを配置
    const railPositions = [
        { x: 0, z: -ROOM_SIZE/2 + 8, rotY: 0 },
        { x: 0, z: ROOM_SIZE/2 - 8, rotY: 0 },
        { x: -ROOM_SIZE/2 + 8, z: 0, rotY: Math.PI/2 },
        { x: ROOM_SIZE/2 - 8, z: 0, rotY: Math.PI/2 }
    ];

    railPositions.forEach(pos => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE * 0.8, 0.1, 0.3), railMat);
        rail.position.set(pos.x, WALL_HEIGHT - 0.5, pos.z);
        rail.rotation.y = pos.rotY;
        scene.add(rail);
    });
}

// ==========================================
// 額縁作成
// ==========================================
function createFrame(width, height, style) {
    const group = new THREE.Group();
    const frameWidth = style.width;
    const depth = 0.08;
    
    const frameMat = new THREE.MeshStandardMaterial({ 
        color: style.color,
        metalness: style.name === 'gold' || style.name === 'silver' ? 0.8 : 0.1,
        roughness: style.name === 'gold' || style.name === 'silver' ? 0.3 : 0.7
    });

    // 上
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + frameWidth * 2, frameWidth, depth), frameMat);
    top.position.set(0, height/2 + frameWidth/2, depth/2);
    group.add(top);

    // 下
    const bottom = new THREE.Mesh(new THREE.BoxGeometry(width + frameWidth * 2, frameWidth, depth), frameMat);
    bottom.position.set(0, -height/2 - frameWidth/2, depth/2);
    group.add(bottom);

    // 左
    const left = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, height, depth), frameMat);
    left.position.set(-width/2 - frameWidth/2, 0, depth/2);
    group.add(left);

    // 右
    const right = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, height, depth), frameMat);
    right.position.set(width/2 + frameWidth/2, 0, depth/2);
    group.add(right);

    // 内側マット（白い余白）
    const matBorder = 0.15;
    const matGeo = new THREE.PlaneGeometry(width + matBorder * 2, height + matBorder * 2);
    const matMat = new THREE.MeshStandardMaterial({ color: 0xfffef8 });
    const mat = new THREE.Mesh(matGeo, matMat);
    mat.position.z = 0.01;
    group.add(mat);

    return group;
}

// ==========================================
// NFTにスポットライトを追加
// ==========================================
function addSpotlightToNFT(position, targetPosition) {
    const spotlight = new THREE.SpotLight(0xfff5e6, 2, 20, Math.PI / 8, 0.5, 1);
    spotlight.position.copy(position);
    spotlight.position.y = WALL_HEIGHT - 1;
    spotlight.target.position.copy(targetPosition);
    spotlight.castShadow = true;
    scene.add(spotlight);
    scene.add(spotlight.target);
    
    // ライトの筐体（見た目用）
    const housingGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
    const housingMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.copy(spotlight.position);
    housing.position.y += 0.15;
    scene.add(housing);
}

// ==========================================
// プレイヤー作成
// ==========================================
function createPlayer() {
    player = new THREE.Group();
    scene.add(player);
    avatar = createHumanAvatar(HUMAN_COLORS[currentColorIndex]);
    player.add(avatar);
}

function switchAvatar() {
    if (avatar) player.remove(avatar);
    avatar = isDogMode
        ? createDogAvatar(DOG_COLORS[currentColorIndex % DOG_COLORS.length])
        : createHumanAvatar(HUMAN_COLORS[currentColorIndex % HUMAN_COLORS.length]);
    player.add(avatar);
}

// ==========================================
// 足跡エフェクト
// ==========================================
function createFootprint(position, isLeft) {
    const group = new THREE.Group();
    
    if (isDogMode) {
        // 肉球（犬用）
        const padMat = new THREE.MeshBasicMaterial({ 
            color: 0xffd700, 
            transparent: true, 
            opacity: 0.6 
        });
        
        // メインパッド
        const mainPad = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), padMat);
        mainPad.rotation.x = -Math.PI / 2;
        mainPad.position.y = 0.01;
        group.add(mainPad);
        
        // 指パッド
        const toePositions = [
            { x: -0.1, z: -0.15 }, { x: 0.1, z: -0.15 },
            { x: -0.15, z: -0.05 }, { x: 0.15, z: -0.05 }
        ];
        toePositions.forEach(pos => {
            const toe = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), padMat);
            toe.rotation.x = -Math.PI / 2;
            toe.position.set(pos.x, 0.01, pos.z);
            group.add(toe);
        });
    } else {
        // 人間の足跡
        const footMat = new THREE.MeshBasicMaterial({ 
            color: 0xffd700, 
            transparent: true, 
            opacity: 0.5 
        });
        
        // 足の形（楕円）
        const footShape = new THREE.Shape();
        footShape.ellipse(0, 0, 0.12, 0.25, 0, Math.PI * 2);
        const footGeo = new THREE.ShapeGeometry(footShape);
        const foot = new THREE.Mesh(footGeo, footMat);
        foot.rotation.x = -Math.PI / 2;
        foot.rotation.z = isLeft ? 0.2 : -0.2;
        foot.position.y = 0.01;
        group.add(foot);
    }
    
    group.position.copy(position);
    group.position.y = 0;
    
    // 左右にずらす
    const offset = isLeft ? -0.2 : 0.2;
    group.position.x += Math.cos(player.rotation.y) * offset;
    group.position.z -= Math.sin(player.rotation.y) * offset;
    
    group.userData = { createdAt: Date.now(), opacity: 0.6 };
    scene.add(group);
    footprints.push(group);
    
    return group;
}

function updateFootprints() {
    const now = Date.now();
    
    for (let i = footprints.length - 1; i >= 0; i--) {
        const fp = footprints[i];
        const age = now - fp.userData.createdAt;
        
        if (age > 3000) {
            scene.remove(fp);
            footprints.splice(i, 1);
        } else if (age > 1500) {
            // フェードアウト
            const opacity = 0.6 * (1 - (age - 1500) / 1500);
            fp.children.forEach(child => {
                if (child.material) child.material.opacity = opacity;
            });
        }
    }
}

// ==========================================
// NFT関連
// ==========================================
async function fetchOwnerData() {
    try {
        const res = await fetch(`https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract?contractAddress=${NFT_CONFIG.contractAddress}&withMetadata=false`);
        const data = await res.json();
        if (data.nfts) {
            data.nfts.forEach(nft => {
                const item = nftData.find(n => String(n.tokenId) === String(nft.tokenId));
                if (item && nft.owners?.[0]) {
                    item.owner = nft.owners[0];
                    item.ownerShort = nft.owners[0].slice(0, 6) + '...' + nft.owners[0].slice(-4);
                }
            });
        }
    } catch (e) { console.error(e); }
}

function placeNFTsOnWalls() {
    // 既存のNFTと照明を削除
    scene.children.filter(c => c.userData?.isNFT || c.userData?.isNFTLight).forEach(c => scene.remove(c));

    const perWall = 4; // 少し減らして間隔を広く
    const start = (currentFloor - 1) * 16;
    const nfts = nftData.slice(start, Math.min(start + 16, nftData.length));
    const spacing = ROOM_SIZE / (perWall + 1);

    const walls = [
        { x: 0, z: -ROOM_SIZE/2 + 0.5, rotY: 0, horiz: true },
        { x: 0, z: ROOM_SIZE/2 - 0.5, rotY: Math.PI, horiz: true },
        { x: -ROOM_SIZE/2 + 0.5, z: 0, rotY: Math.PI/2, horiz: false },
        { x: ROOM_SIZE/2 - 0.5, z: 0, rotY: -Math.PI/2, horiz: false }
    ];

    nfts.forEach((nft, i) => {
        const wallIdx = Math.floor(i / perWall);
        const posIdx = i % perWall;
        if (wallIdx >= walls.length) return;

        const wall = walls[wallIdx];
        const offset = (posIdx - (perWall - 1) / 2) * spacing;
        const frameStyle = FRAME_STYLES[i % FRAME_STYLES.length];

        new THREE.TextureLoader().load(nft.imageUrl, tex => {
            const nftSize = 4.5;
            const group = new THREE.Group();

            // 額縁
            const frame = createFrame(nftSize, nftSize, frameStyle);
            group.add(frame);

            // NFT画像
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(nftSize, nftSize),
                new THREE.MeshBasicMaterial({ map: tex })
            );
            mesh.position.z = 0.02;
            group.add(mesh);

            // 位置設定
            const posX = wall.horiz ? wall.x + offset : wall.x;
            const posZ = wall.horiz ? wall.z : wall.z + offset;
            group.position.set(posX, WALL_HEIGHT / 2, posZ);
            group.rotation.y = wall.rotY;

            group.userData = { isNFT: true, nftData: nft };
            scene.add(group);

            // スポットライト追加
            const lightPos = new THREE.Vector3(posX, WALL_HEIGHT - 1, posZ);
            if (wall.horiz) {
                lightPos.z += wall.z > 0 ? -5 : 5;
            } else {
                lightPos.x += wall.x > 0 ? -5 : 5;
            }
            addSpotlightToNFT(lightPos, group.position);
        });
    });
}

// ==========================================
// ターゲット作成
// ==========================================
function createTargets() {
    const baseUrl = 'https://raw.githubusercontent.com/kimura-jane/tafdog_museum/main/';
    const files = ['IMG_1822.png', 'IMG_1889.png'];
    const corners = [
        { x: ROOM_SIZE/2 - 5, z: -ROOM_SIZE/2 + 5 },
        { x: -ROOM_SIZE/2 + 5, z: -ROOM_SIZE/2 + 5 },
        { x: ROOM_SIZE/2 - 5, z: ROOM_SIZE/2 - 5 },
        { x: -ROOM_SIZE/2 + 5, z: ROOM_SIZE/2 - 5 }
    ];

    corners.forEach((c, i) => {
        new THREE.TextureLoader().load(baseUrl + files[i % 2], tex => {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(3, 4),
                new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true })
            );
            const group = new THREE.Group();
            group.add(mesh);
            group.position.set(c.x, 2, c.z);
            group.userData = { hitCount: 0, isFlyingAway: false };
            scene.add(group);
            targets.push(group);
        });
    });
}

// ==========================================
// UI作成
// ==========================================
function createUI() {
    const title = document.createElement('div');
    title.textContent = 'TAF DOG MUSEUM';
    title.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:bold;color:#fff;text-shadow:1px 1px 3px #000;z-index:1000;pointer-events:none;letter-spacing:2px;';
    document.body.appendChild(title);

    floorBtn = document.createElement('button');
    floorBtn.textContent = currentFloor + 'F';
    floorBtn.style.cssText = 'position:fixed;left:15px;top:50px;padding:12px 20px;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:16px;font-weight:bold;border-radius:10px;z-index:1000;backdrop-filter:blur(5px);';
    floorBtn.onclick = () => {
        currentFloor = currentFloor >= 5 ? 1 : currentFloor + 1;
        floorBtn.textContent = currentFloor + 'F';
        placeNFTsOnWalls();
    };
    document.body.appendChild(floorBtn);

    const modeDiv = document.createElement('div');
    modeDiv.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:1000;';
    document.body.appendChild(modeDiv);

    const btnStyle = (active) => `padding:10px 16px;background:${active ? 'rgba(74,144,217,0.9)' : 'rgba(0,0,0,0.7)'};border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:13px;font-weight:bold;border-radius:8px;cursor:pointer;backdrop-filter:blur(5px);`;

    humanBtn = document.createElement('button');
    humanBtn.textContent = 'HUMAN';
    humanBtn.style.cssText = btnStyle(true);
    humanBtn.onclick = () => {
        isDogMode = false;
        currentColorIndex = (currentColorIndex + 1) % HUMAN_COLORS.length;
        switchAvatar();
        updateBtns();
    };
    modeDiv.appendChild(humanBtn);

    autoBtn = document.createElement('button');
    autoBtn.textContent = 'AUTO';
    autoBtn.style.cssText = btnStyle(false);
    autoBtn.onclick = () => {
        isAutoMode = !isAutoMode;
        updateBtns();
    };
    modeDiv.appendChild(autoBtn);

    dogBtn = document.createElement('button');
    dogBtn.textContent = 'DOG';
    dogBtn.style.cssText = btnStyle(false);
    dogBtn.onclick = () => {
        isDogMode = true;
        currentColorIndex = (currentColorIndex + 1) % DOG_COLORS.length;
        switchAvatar();
        updateBtns();
    };
    modeDiv.appendChild(dogBtn);

    flyBtn = document.createElement('button');
    flyBtn.textContent = 'FLY';
    flyBtn.style.cssText = 'position:fixed;right:20px;top:45%;width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:14px;font-weight:bold;z-index:1000;backdrop-filter:blur(5px);';
    flyBtn.onclick = () => {
        isFlyMode = !isFlyMode;
        flyBtn.style.background = isFlyMode ? 'rgba(74,144,217,0.9)' : 'rgba(0,0,0,0.7)';
    };
    document.body.appendChild(flyBtn);

    throwBtn = document.createElement('button');
    throwBtn.textContent = 'THROW';
    throwBtn.style.cssText = 'position:fixed;right:20px;top:60%;width:60px;height:60px;border-radius:50%;background:rgba(139,69,19,0.9);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:bold;z-index:1000;backdrop-filter:blur(5px);';
    throwBtn.onclick = throwBean;
    document.body.appendChild(throwBtn);

    function updateBtns() {
        humanBtn.style.cssText = btnStyle(!isDogMode);
        dogBtn.style.cssText = btnStyle(isDogMode);
        autoBtn.style.cssText = btnStyle(isAutoMode);
    }
}

// ==========================================
// ジョイスティック
// ==========================================
function setupJoystick() {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:20px;bottom:30px;width:120px;height:120px;background:rgba(255,255,255,0.15);border-radius:50%;z-index:1000;touch-action:none;backdrop-filter:blur(5px);border:1px solid rgba(255,255,255,0.2);';
    document.body.appendChild(container);

    const knob = document.createElement('div');
    knob.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:50px;height:50px;background:rgba(255,255,255,0.8);border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
    container.appendChild(knob);

    const maxDist = 35;
    const center = 60;

    const getPos = (e) => {
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX, y: t.clientY };
    };

    const start = (e) => {
        e.preventDefault();
        joystickActive = true;
    };

    const move = (e) => {
        if (!joystickActive) return;
        e.preventDefault();

        const rect = container.getBoundingClientRect();
        const pos = getPos(e);
        let x = pos.x - rect.left - center;
        let y = pos.y - rect.top - center;

        const dist = Math.hypot(x, y);
        if (dist > maxDist) {
            x = x / dist * maxDist;
            y = y / dist * maxDist;
        }

        knob.style.left = (center + x) + 'px';
        knob.style.top = (center + y) + 'px';

        moveVector.x = x / maxDist;
        moveVector.z = y / maxDist;
    };

    const end = () => {
        joystickActive = false;
        knob.style.left = '50%';
        knob.style.top = '50%';
        moveVector.set(0, 0, 0);
    };

    container.addEventListener('touchstart', start, { passive: false });
    container.addEventListener('mousedown', start);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
    document.addEventListener('mouseup', end);
}

// ==========================================
// イベントリスナー
// ==========================================
function setupEventListeners() {
    document.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (k in keys) keys[k] = true;
    });
    document.addEventListener('keyup', e => {
        const k = e.key.toLowerCase();
        if (k in keys) keys[k] = false;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    renderer.domElement.addEventListener('click', onTap);
    renderer.domElement.addEventListener('touchend', e => {
        if (joystickActive) return;
        const t = e.changedTouches?.[0];
        if (t) onTap({ clientX: t.clientX, clientY: t.clientY });
    });
}

function onTap(e) {
    const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);

    for (const hit of ray.intersectObjects(scene.children, true)) {
        let obj = hit.object;
        while (obj) {
            if (obj.userData?.nftData) {
                showModal(obj.userData.nftData);
                return;
            }
            obj = obj.parent;
        }
    }
}

// ==========================================
// NFTモーダル
// ==========================================
function showModal(nft) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;justify-content:center;align-items:center;z-index:2000;';

    const imgs = nft.stateImageUrl
        ? `<div style="display:flex;gap:15px;justify-content:center;margin-bottom:20px;">
             <div><p style="color:#888;font-size:11px;text-align:center;margin-bottom:5px;">通常</p><img src="${nft.imageUrl}" style="width:120px;border-radius:5px;border:1px solid #333;"></div>
             <div><p style="color:#888;font-size:11px;text-align:center;margin-bottom:5px;">変化後</p><img src="${nft.stateImageUrl}" style="width:120px;border-radius:5px;border:1px solid #333;"></div>
           </div>`
        : `<img src="${nft.imageUrl}" style="width:180px;border-radius:5px;display:block;margin:0 auto 20px;border:1px solid #333;">`;

    modal.innerHTML = `
        <div style="background:linear-gradient(145deg,#1a1a1a,#2a2a2a);padding:30px;border-radius:20px;max-width:350px;text-align:center;color:#fff;border:1px solid #333;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <h2 style="margin-bottom:15px;font-size:18px;letter-spacing:1px;">TAF DOG #${nft.tokenId}</h2>
            ${imgs}
            ${nft.changeRule ? `<p style="color:#ffd700;margin-bottom:15px;font-size:12px;padding:10px;background:rgba(255,215,0,0.1);border-radius:8px;">${nft.changeRule}</p>` : ''}
            <p style="margin-bottom:15px;font-size:11px;color:#888;">Owner: ${nft.ownerShort || 'Unknown'}</p>
            <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" target="_blank" 
               style="display:inline-block;padding:10px 20px;background:linear-gradient(145deg,#4a90d9,#357abd);color:#fff;text-decoration:none;border-radius:8px;font-size:12px;margin-bottom:15px;">OpenSea</a>
            <br><button onclick="this.closest('div[style*=inset]').remove()" 
               style="padding:10px 25px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;border-radius:8px;cursor:pointer;">閉じる</button>
        </div>`;

    modal.onclick = e => { if (e.target === modal) modal.remove(); };
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

        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);

        bean.position.copy(player.position);
        bean.position.y += isDogMode ? 1 : 1.8;
        bean.position.addScaledVector(dir, 0.5);

        bean.userData = {
            velocity: dir.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 0.2, 0)),
            gravity: -0.012,
            life: 200
        };

        scene.add(bean);
        beans.push(bean);
    }, 200);

    setTimeout(() => { isThrowingAnimation = false; }, 400);
}

// ==========================================
// プレイヤー更新
// ==========================================
let isLeftFoot = false;

function updatePlayer() {
    const speed = isDogMode ? 0.3 : 0.2;
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

        const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0));

        const moveDir = new THREE.Vector3()
            .addScaledVector(camRight, moveVector.x)
            .addScaledVector(camDir, -moveVector.z)
            .normalize();

        player.position.addScaledVector(moveDir, speed);
        player.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        moved = true;
    }

    // 足跡を追加
    if (moved) {
        const now = Date.now();
        const dist = player.position.distanceTo(lastFootprintPos);
        if (now - lastFootprintTime > 300 && dist > 0.8) {
            createFootprint(player.position.clone(), isLeftFoot);
            isLeftFoot = !isLeftFoot;
            lastFootprintTime = now;
            lastFootprintPos.copy(player.position);
        }
    }

    if (isFlyMode && keys.space) player.position.y += 0.15;
    if (!isFlyMode) player.position.y = 0;

    const limit = ROOM_SIZE / 2 - 2;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);

    if (!isUserControlling) {
        const cameraHeight = isDogMode ? 3 : 5;
        const cameraDistance = isDogMode ? 8 : 10;
        
        const targetCamPos = new THREE.Vector3(
            player.position.x - Math.sin(player.rotation.y) * cameraDistance,
            player.position.y + cameraHeight,
            player.position.z - Math.cos(player.rotation.y) * cameraDistance
        );
        
        camera.position.lerp(targetCamPos, 0.05);
    }

    controls.target.copy(player.position);
    controls.target.y += isDogMode ? 0.5 : 1.2;

    return moved;
}

// ==========================================
// 更新関数群
// ==========================================
function updateBeans() {
    for (let i = beans.length - 1; i >= 0; i--) {
        const b = beans[i];
        b.position.add(b.userData.velocity);
        b.userData.velocity.y += b.userData.gravity;
        b.userData.life--;

        for (const t of targets) {
            if (t.userData.isFlyingAway) continue;
            if (b.position.distanceTo(t.position) < 2.5) {
                t.userData.hitCount++;
                showBubble(t.position, t.userData.hitCount > 2 ? 'あーれー！' : '痛いっ！');
                if (t.userData.hitCount >= 3) t.userData.isFlyingAway = true;
                scene.remove(b);
                beans.splice(i, 1);
                break;
            }
        }

        if (b.userData.life <= 0 || b.position.y < 0) {
            scene.remove(b);
            beans.splice(i, 1);
        }
    }
}

function showBubble(pos, text) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = 'position:fixed;background:#fff;padding:10px 18px;border-radius:20px;font-size:16px;font-weight:bold;z-index:1500;pointer-events:none;box-shadow:0 4px 15px rgba(0,0,0,0.3);';

    const p = pos.clone().project(camera);
    div.style.left = ((p.x + 1) / 2 * window.innerWidth) + 'px';
    div.style.top = ((-p.y + 1) / 2 * window.innerHeight - 50) + 'px';

    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
}

function updateTargets() {
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        if (t.userData.isFlyingAway) {
            t.position.y += 0.1;
            t.rotation.z += 0.08;
            if (t.position.y > 50) {
                scene.remove(t);
                targets.splice(i, 1);
            }
        } else {
            t.lookAt(player.position.x, t.position.y, player.position.z);
        }
    }
}

function updateDust() {
    if (!dustParticles) return;
    const pos = dustParticles.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
        pos[i] -= 0.005;
        if (pos[i] < 0) pos[i] = WALL_HEIGHT;
    }
    dustParticles.geometry.attributes.position.needsUpdate = true;
}

function updateAuto() {
    if (!isAutoMode) return;
    const t = Date.now() * 0.001;
    player.position.x = Math.sin(t * 0.3) * 15;
    player.position.z = Math.cos(t * 0.3) * 15;
    player.rotation.y = -t * 0.3 + Math.PI;
}

function applyThrow() {
    if (!isThrowingAnimation || !avatar) return;
    throwAnimationTime += 0.06;
    const p = Math.min(throwAnimationTime / 0.2, 1);
    const arm = avatar.getObjectByName('rightArm');
    if (arm) {
        arm.rotation.x = p < 0.5 ? -Math.PI * 0.7 * (p / 0.5) : -Math.PI * 0.7 * (1 - (p - 0.5) / 0.5);
    }
}

// ==========================================
// アニメーションループ
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;
    const moving = updatePlayer();

    updateAuto();
    updateFootprints();

    if (isDogMode) {
        animateDog(avatar, time, moving);
    } else {
        animateHuman(avatar, time, moving);
        applyThrow();
    }

    updateBeans();
    updateTargets();
    updateDust();

    controls.update();
    renderer.render(scene, camera);
}

// ==========================================
// 初期化実行
// ==========================================
init();

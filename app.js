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

// カメラ追従用
let cameraAngle = 0;
let isUserControlling = false;
let userControlTimeout = null;

let flyBtn, throwBtn, humanBtn, dogBtn, autoBtn, floorBtn;

const keys = { w: false, a: false, s: false, d: false, space: false };
const ALCHEMY_API_KEY = "NzzY5_VyMSoXXD0XqZpDL";

// ==========================================
// 初期化
// ==========================================
async function init() {
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 50, 150);

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 5, 15);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;

        const root = document.getElementById('root');
        root.appendChild(renderer.domElement);

        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.remove();

        // OrbitControls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enablePan = false;
        controls.minDistance = 5;
        controls.maxDistance = 30;
        controls.maxPolarAngle = Math.PI / 2.2;
        controls.minPolarAngle = 0.3;

        // ユーザーがカメラ操作中かを検知
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

        dustParticles = createDustParticles(100);
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
// 照明設定
// ==========================================
function setupLighting() {
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(10, 30, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const subLight = new THREE.DirectionalLight(0xffffff, 0.8);
    subLight.position.set(-10, 20, -10);
    scene.add(subLight);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
}

// ==========================================
// 部屋作成
// ==========================================
function createRoom() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_SIZE, ROOM_SIZE),
        new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    scene.add(ceiling);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, side: THREE.DoubleSide });

    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMat);
    frontWall.position.set(0, WALL_HEIGHT / 2, -ROOM_SIZE / 2);
    scene.add(frontWall);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMat);
    backWall.position.set(0, WALL_HEIGHT / 2, ROOM_SIZE / 2);
    backWall.rotation.y = Math.PI;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMat);
    leftWall.position.set(-ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_SIZE, WALL_HEIGHT), wallMat);
    rightWall.position.set(ROOM_SIZE / 2, WALL_HEIGHT / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);
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
    scene.children.filter(c => c.userData?.isNFT).forEach(c => scene.remove(c));

    const perWall = 5;
    const start = (currentFloor - 1) * 20;
    const nfts = nftData.slice(start, Math.min(start + 20, nftData.length));
    const spacing = ROOM_SIZE / (perWall + 1);

    const walls = [
        { x: 0, z: -ROOM_SIZE / 2 + 0.5, rotY: 0, horiz: true },
        { x: 0, z: ROOM_SIZE / 2 - 0.5, rotY: Math.PI, horiz: true },
        { x: -ROOM_SIZE / 2 + 0.5, z: 0, rotY: Math.PI / 2, horiz: false },
        { x: ROOM_SIZE / 2 - 0.5, z: 0, rotY: -Math.PI / 2, horiz: false }
    ];

    nfts.forEach((nft, i) => {
        const wallIdx = Math.floor(i / perWall);
        const pos = i % perWall;
        if (wallIdx >= walls.length) return;

        const wall = walls[wallIdx];
        const offset = (pos - (perWall - 1) / 2) * spacing;

        new THREE.TextureLoader().load(nft.imageUrl, tex => {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(5, 5),
                new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
            );
            mesh.position.set(
                wall.horiz ? wall.x + offset : wall.x,
                WALL_HEIGHT / 2,
                wall.horiz ? wall.z : wall.z + offset
            );
            mesh.rotation.y = wall.rotY;
            mesh.userData = { isNFT: true, nftData: nft };
            scene.add(mesh);
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
        { x: ROOM_SIZE / 2 - 5, z: -ROOM_SIZE / 2 + 5 },
        { x: -ROOM_SIZE / 2 + 5, z: -ROOM_SIZE / 2 + 5 },
        { x: ROOM_SIZE / 2 - 5, z: ROOM_SIZE / 2 - 5 },
        { x: -ROOM_SIZE / 2 + 5, z: ROOM_SIZE / 2 - 5 }
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
    title.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);font-size:18px;font-weight:bold;color:#fff;text-shadow:1px 1px 3px #000;z-index:1000;pointer-events:none;';
    document.body.appendChild(title);

    floorBtn = document.createElement('button');
    floorBtn.textContent = currentFloor + 'F';
    floorBtn.style.cssText = 'position:fixed;left:15px;top:50px;padding:12px 20px;background:rgba(0,0,0,0.5);border:none;color:#fff;font-size:16px;font-weight:bold;border-radius:10px;z-index:1000;';
    floorBtn.onclick = () => {
        currentFloor = currentFloor >= 5 ? 1 : currentFloor + 1;
        floorBtn.textContent = currentFloor + 'F';
        placeNFTsOnWalls();
    };
    document.body.appendChild(floorBtn);

    const modeDiv = document.createElement('div');
    modeDiv.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:1000;';
    document.body.appendChild(modeDiv);

    const btnStyle = (active) => `padding:10px 16px;background:${active ? '#4a90d9' : 'rgba(0,0,0,0.5)'};border:none;color:#fff;font-size:13px;font-weight:bold;border-radius:8px;cursor:pointer;`;

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
    flyBtn.style.cssText = 'position:fixed;right:20px;top:45%;width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,0.5);border:none;color:#fff;font-size:14px;font-weight:bold;z-index:1000;';
    flyBtn.onclick = () => {
        isFlyMode = !isFlyMode;
        flyBtn.style.background = isFlyMode ? '#4a90d9' : 'rgba(0,0,0,0.5)';
    };
    document.body.appendChild(flyBtn);

    throwBtn = document.createElement('button');
    throwBtn.textContent = 'THROW';
    throwBtn.style.cssText = 'position:fixed;right:20px;top:60%;width:60px;height:60px;border-radius:50%;background:#8B4513;border:none;color:#fff;font-size:11px;font-weight:bold;z-index:1000;';
    throwBtn.onclick = throwBean;
    document.body.appendChild(throwBtn);

    function updateBtns() {
        humanBtn.style.background = !isDogMode ? '#4a90d9' : 'rgba(0,0,0,0.5)';
        dogBtn.style.background = isDogMode ? '#4a90d9' : 'rgba(0,0,0,0.5)';
        autoBtn.style.background = isAutoMode ? '#4a90d9' : 'rgba(0,0,0,0.5)';
    }
}

// ==========================================
// ジョイスティック
// ==========================================
function setupJoystick() {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:20px;bottom:30px;width:120px;height:120px;background:rgba(255,255,255,0.2);border-radius:50%;z-index:1000;touch-action:none;';
    document.body.appendChild(container);

    const knob = document.createElement('div');
    knob.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:50px;height:50px;background:rgba(255,255,255,0.8);border-radius:50%;';
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
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;justify-content:center;align-items:center;z-index:2000;';

    const imgs = nft.stateImageUrl
        ? `<div style="display:flex;gap:10px;justify-content:center;margin-bottom:15px;">
             <div><p style="color:#888;font-size:11px;text-align:center;">通常</p><img src="${nft.imageUrl}" style="width:100px;border-radius:5px;"></div>
             <div><p style="color:#888;font-size:11px;text-align:center;">変化後</p><img src="${nft.stateImageUrl}" style="width:100px;border-radius:5px;"></div>
           </div>`
        : `<img src="${nft.imageUrl}" style="width:150px;border-radius:5px;display:block;margin:0 auto 15px;">`;

    modal.innerHTML = `
        <div style="background:#222;padding:25px;border-radius:15px;max-width:320px;text-align:center;color:#fff;">
            <h2 style="margin-bottom:10px;font-size:16px;">TAF DOG #${nft.tokenId}</h2>
            ${imgs}
            ${nft.changeRule ? `<p style="color:#ffd700;margin-bottom:10px;font-size:12px;">${nft.changeRule}</p>` : ''}
            <p style="margin-bottom:10px;font-size:11px;">Owner: ${nft.ownerShort || 'Unknown'}</p>
            <a href="https://opensea.io/ja/assets/matic/${NFT_CONFIG.contractAddress}/${nft.tokenId}" target="_blank" 
               style="display:inline-block;padding:8px 16px;background:#4a90d9;color:#fff;text-decoration:none;border-radius:5px;font-size:12px;margin-bottom:10px;">OpenSea</a>
            <br><button onclick="this.closest('div[style*=inset]').remove()" 
               style="padding:8px 20px;background:#444;border:none;color:#fff;border-radius:5px;cursor:pointer;">閉じる</button>
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
// プレイヤー更新（カメラ追従修正版）
// ==========================================
function updatePlayer() {
    const speed = isDogMode ? 0.3 : 0.2;
    let moved = false;

    // キーボード移動
    if (keys.w) { player.position.z -= speed; moved = true; }
    if (keys.s) { player.position.z += speed; moved = true; }
    if (keys.a) { player.position.x -= speed; moved = true; }
    if (keys.d) { player.position.x += speed; moved = true; }

    // ジョイスティック移動
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

    // FLYモード
    if (isFlyMode && keys.space) player.position.y += 0.15;
    if (!isFlyMode) player.position.y = 0;

    // 境界制限
    const limit = ROOM_SIZE / 2 - 2;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);

    // カメラ追従（ユーザーが操作していない時だけ）
    if (!isUserControlling) {
        // プレイヤーの後ろにカメラを配置
        const cameraHeight = isDogMode ? 3 : 5;
        const cameraDistance = isDogMode ? 8 : 10;
        
        // プレイヤーの向きに基づいてカメラ位置を計算
        const targetCamPos = new THREE.Vector3(
            player.position.x - Math.sin(player.rotation.y) * cameraDistance,
            player.position.y + cameraHeight,
            player.position.z - Math.cos(player.rotation.y) * cameraDistance
        );
        
        // スムーズに追従
        camera.position.lerp(targetCamPos, 0.05);
    }

    // OrbitControlsのターゲットは常にプレイヤー
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
    div.style.cssText = 'position:fixed;background:#fff;padding:8px 15px;border-radius:15px;font-size:16px;font-weight:bold;z-index:1500;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);';

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
        pos[i] -= 0.01;
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

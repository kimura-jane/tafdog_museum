// ==========================================
// data.js - NFTデータ管理・API連携
// ==========================================

// コントラクト情報
export const NFT_CONFIG = {
  contractAddress: "0xDD8aEA78eebc6b444d960A18D282F453195d55A9",
  ownerWallet: "0x8242dae5c6ff90b03d15c54cad95c3ed97ac0571",
  chain: "polygon",
  totalSupply: 100,
  metadataBaseUrl: "https://tafdog.jomonkusama.com/tafdog/",
  imageBaseUrl: "https://raw.githubusercontent.com/kimura-jane/gazo/main/"
};

// Alchemy API設定（無料枠）
const ALCHEMY_API_KEY = "demo"; // 本番では自分のAPIキーに変更
const ALCHEMY_BASE_URL = `https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

// 変化条件の定義
export const CHANGE_RULES = {
  "1": { rule: "埼玉の気温25℃以上で変化", type: "temperature" },
  "4": { rule: "30日ごとに切り替わる", type: "cycle" },
  "7": { rule: "昼(6-18時)と夜で変化", type: "time" },
  "10": { rule: "土日だけ変化", type: "weekend" },
  "13": { rule: "土日だけ変化（別デザイン）", type: "weekend" },
  "16": { rule: "金曜17-24時だけ変化", type: "fridayNight" },
  "19": { rule: "毎日21-23時だけ変化", type: "nightEvent" },
  "22": { rule: "毎日20-21時だけ変化", type: "eveningEvent" },
  "25": { rule: "毎日12-13時だけ変化", type: "lunchTime" },
  "28": { rule: "毎日0-2時だけ変化", type: "lateNight" },
  "35": { rule: "水曜日だけ変化", type: "wednesday" },
  "38": { rule: "金・土・日だけ変化", type: "weekend3" },
  "53": { rule: "平日9-17時だけ変化", type: "workTime" },
  "58": { rule: "火曜19-21時だけ変化", type: "tuesdayEvent" },
  "65": { rule: "埼玉で雨の時だけ変化", type: "rain" },
  "70": { rule: "毎日15-16時だけ変化", type: "afternoonEvent" },
  "75": { rule: "毎日5-7時だけ変化", type: "earlyMorning" },
  "80": { rule: "月末だけ変化", type: "monthEnd" },
  "90": { rule: "第2土曜日だけ変化", type: "secondSaturday" },
  "100": { rule: "毎日2-5時だけ変化", type: "deepNight" }
};

// NFT所有者情報をキャッシュ
let ownersCache = null;
let ownersCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

// 全NFTの所有者を取得
export async function fetchAllOwners() {
  const now = Date.now();
  if (ownersCache && (now - ownersCacheTime) < CACHE_DURATION) {
    return ownersCache;
  }

  try {
    const response = await fetch(
      `${ALCHEMY_BASE_URL}/getOwnersForContract?contractAddress=${NFT_CONFIG.contractAddress}&withTokenBalances=true`
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch owners");
    }

    const data = await response.json();
    const ownerMap = {};

    // トークンIDごとのオーナーをマップ化
    if (data.owners) {
      data.owners.forEach(owner => {
        if (owner.tokenBalances) {
          owner.tokenBalances.forEach(token => {
            ownerMap[token.tokenId] = owner.ownerAddress;
          });
        }
      });
    }

    ownersCache = ownerMap;
    ownersCacheTime = now;
    return ownerMap;
  } catch (error) {
    console.warn("Owner fetch failed, using empty map:", error);
    return {};
  }
}

// 特定NFTのメタデータを取得
export async function fetchMetadata(tokenId) {
  try {
    const response = await fetch(`${NFT_CONFIG.metadataBaseUrl}${tokenId}`);
    if (!response.ok) throw new Error("Metadata fetch failed");
    return await response.json();
  } catch (error) {
    console.warn(`Metadata fetch failed for token ${tokenId}:`, error);
    return null;
  }
}

// NFTを運営/一般に振り分け
export function categorizeNFTs(owners) {
  const ownerNFTs = [];
  const publicNFTs = [];
  const ownerWalletLower = NFT_CONFIG.ownerWallet.toLowerCase();

  for (let i = 1; i <= NFT_CONFIG.totalSupply; i++) {
    const tokenId = String(i);
    const owner = owners[tokenId] || null;
    const isOwnerNFT = owner && owner.toLowerCase() === ownerWalletLower;

    const nftData = {
      tokenId,
      owner,
      ownerShort: owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : "Unknown",
      imageUrl: getImageUrl(tokenId),
      changeRule: CHANGE_RULES[tokenId] || null
    };

    if (isOwnerNFT) {
      ownerNFTs.push(nftData);
    } else {
      publicNFTs.push(nftData);
    }
  }

  return { ownerNFTs, publicNFTs };
}

// 画像URLを生成
export function getImageUrl(tokenId) {
  const paddedId = String(tokenId).padStart(3, "0");
  return `${NFT_CONFIG.imageBaseUrl}tafdog_${paddedId}.png`;
}

// 変化後画像URLを生成
export function getStateImageUrl(tokenId) {
  const paddedId = String(tokenId).padStart(3, "0");
  return `${NFT_CONFIG.imageBaseUrl}tafdog_${paddedId}_state.png`;
}

// 全データを一括取得
export async function fetchAllNFTData() {
  const owners = await fetchAllOwners();
  const { ownerNFTs, publicNFTs } = categorizeNFTs(owners);
  
  return {
    owners,
    ownerNFTs,
    publicNFTs,
    totalOwnerNFTs: ownerNFTs.length,
    totalPublicNFTs: publicNFTs.length
  };
}

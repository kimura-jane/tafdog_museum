// ==========================================
// data.js - NFTデータ・設定
// ==========================================

export const NFT_CONFIG = {
  contractAddress: "0xDD8aEA78eebc6b444d960A18D282F453195d55A9",
  ownerWallet: "0x8242dae5c6ff90b03d15c54cad95c3ed97ac0571",
  totalSupply: 100,
  imageBaseUrl: "https://raw.githubusercontent.com/kimura-jane/gazo/main/"
};

// 変化条件
export const CHANGE_RULES = {
  "1": "埼玉の気温25℃以上で変化",
  "4": "30日ごとに切り替わる",
  "7": "昼(6-18時)と夜で変化",
  "10": "土日だけ変化",
  "13": "土日だけ変化（別デザイン）",
  "16": "金曜17-24時だけ変化",
  "19": "毎日21-23時だけ変化",
  "22": "毎日20-21時だけ変化",
  "25": "毎日12-13時だけ変化",
  "28": "毎日0-2時だけ変化",
  "35": "水曜日だけ変化",
  "38": "金・土・日だけ変化",
  "53": "平日9-17時だけ変化",
  "58": "火曜19-21時だけ変化",
  "65": "埼玉で雨の時だけ変化",
  "70": "毎日15-16時だけ変化",
  "75": "毎日5-7時だけ変化",
  "80": "月末だけ変化",
  "90": "第2土曜日だけ変化",
  "100": "毎日2-5時だけ変化"
};

// NFTデータ生成
export function generateNFTData() {
  const nfts = [];
  for (let i = 1; i <= NFT_CONFIG.totalSupply; i++) {
    const paddedId = String(i).padStart(3, "0");
    nfts.push({
      tokenId: String(i),
      imageUrl: `${NFT_CONFIG.imageBaseUrl}tafdog_${paddedId}.png`,
      stateImageUrl: CHANGE_RULES[String(i)] ? `${NFT_CONFIG.imageBaseUrl}tafdog_${paddedId}_state.png` : null,
      changeRule: CHANGE_RULES[String(i)] || null,
      owner: null,
      ownerShort: "Loading..."
    });
  }
  return nfts;
}

// 部屋サイズ（広くした）
export const ROOM_SIZE = 80;
export const WALL_HEIGHT = 10;

// ターゲットキャラの画像
export const TARGET_IMAGES = [
  "./IMG_1822.png",
  "./IMG_1889.png"
];

// アバターカラー
export const HUMAN_COLORS = [
  { skin: 0xffdbac, shirt: 0x4a90d9, pants: 0x2d3436, hair: 0x3d2314 },
  { skin: 0xf1c27d, shirt: 0xe74c3c, pants: 0x1a1a2e, hair: 0x1a1a1a },
  { skin: 0xffdbac, shirt: 0x2ecc71, pants: 0x2c3e50, hair: 0x5d4e37 },
  { skin: 0xd4a574, shirt: 0x9b59b6, pants: 0x2d3436, hair: 0x1a1a1a }
];

export const DOG_COLORS = [
  { body: 0xd4a574, ear: 0xc49464 },
  { body: 0xf5f5dc, ear: 0xe8e8d0 },
  { body: 0x1a1a1a, ear: 0x0d0d0d },
  { body: 0xffffff, ear: 0xeeeeee }
];

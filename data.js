// ==========================================
// data.js - NFTデータ・設定
// ==========================================

export const NFT_CONFIG = {
  contractAddress: "0xDD8aEA78eebc6b444d960A18D282F453195d55A9",
  ownerWallet: "0x8242dae5c6ff90b03d15c54cad95c3ed97ac0571",
  totalSupply: 50,
  imageBaseUrl: "https://raw.githubusercontent.com/kimura-jane/gazo/main/"
};

// TokenIDと画像ファイルの対応表
const TOKEN_IMAGE_MAP = {
  1: { base: "tafdog_004", state: "tafdog_007_state" },
  2: { base: "tafdog_016", state: null },
  3: { base: "tafdog_019", state: null },
  4: { base: "tafdog_002", state: "tafdog_009_state" },
  5: { base: "tafdog_022", state: null },
  6: { base: "tafdog_025", state: null },
  7: { base: "tafdog_003", state: "tafdog_005_state" },
  8: { base: "tafdog_035", state: null },
  9: { base: "tafdog_038", state: null },
  10: { base: "tafdog_005", state: "tafdog_008_state" },
  11: { base: "tafdog_053", state: null },
  12: { base: "tafdog_058", state: null },
  13: { base: "tafdog_006", state: "tafdog_002_state" },
  14: { base: "tafdog_065", state: null },
  15: { base: "tafdog_015", state: null },
  16: { base: "tafdog_007", state: "tafdog_003_state" },
  17: { base: "tafdog_017", state: null },
  18: { base: "tafdog_018", state: null },
  19: { base: "tafdog_011", state: "tafdog_011_state" },
  20: { base: "tafdog_020", state: null },
  21: { base: "tafdog_021", state: null },
  22: { base: "tafdog_013", state: "tafdog_015_state" },
  23: { base: "tafdog_023", state: null },
  24: { base: "tafdog_024", state: null },
  25: { base: "tafdog_042", state: "tafdog_016_state" },
  26: { base: "tafdog_026", state: null },
  27: { base: "tafdog_027", state: null },
  28: { base: "tafdog_056", state: "tafdog_017_state" },
  29: { base: "tafdog_029", state: null },
  30: { base: "tafdog_030", state: null },
  31: { base: "tafdog_031", state: null },
  32: { base: "tafdog_032", state: null },
  33: { base: "tafdog_033", state: null },
  34: { base: "tafdog_034", state: null },
  35: { base: "tafdog_009", state: "tafdog_004_state" },
  36: { base: "tafdog_036", state: null },
  37: { base: "tafdog_037", state: null },
  38: { base: "tafdog_010", state: "tafdog_010_state" },
  39: { base: "tafdog_039", state: null },
  40: { base: "tafdog_040", state: null },
  41: { base: "tafdog_041", state: null },
  42: { base: "tafdog_075", state: null },
  43: { base: "tafdog_043", state: null },
  44: { base: "tafdog_044", state: null },
  45: { base: "tafdog_045", state: null },
  46: { base: "tafdog_046", state: null },
  47: { base: "tafdog_047", state: null },
  48: { base: "tafdog_048", state: null },
  49: { base: "tafdog_049", state: null },
  50: { base: "tafdog_050", state: null }
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
  "38": "金・土・日だけ変化"
};

// NFTデータ生成
export function generateNFTData() {
  const nfts = [];
  for (let i = 1; i <= NFT_CONFIG.totalSupply; i++) {
    const imageInfo = TOKEN_IMAGE_MAP[i];
    if (!imageInfo) continue;
    
    nfts.push({
      tokenId: String(i),
      imageUrl: `${NFT_CONFIG.imageBaseUrl}${imageInfo.base}.png`,
      stateImageUrl: imageInfo.state ? `${NFT_CONFIG.imageBaseUrl}${imageInfo.state}.png` : null,
      changeRule: CHANGE_RULES[String(i)] || null,
      owner: null,
      ownerShort: "Loading..."
    });
  }
  return nfts;
}

// 部屋サイズ
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

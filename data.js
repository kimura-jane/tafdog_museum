// ==========================================
// data.js - NFTデータ・設定
// ==========================================

export const NFT_CONFIG = {
  contractAddress: "0xDD8aEA78eebc6b444d960A18D282F453195d55A9",
  ownerWallet: "0x8242dae5c6ff90b03d15c54cad95c3ed97ac0571",
  totalSupply: 100,
  imageBaseUrl: "https://raw.githubusercontent.com/kimura-jane/gazo/main/"
};

// TokenIDと画像ファイルの対応表（1-100）
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
  50: { base: "tafdog_050", state: null },
  // 51-60: 一般販売分（1階）
  51: { base: "tafdog_051", state: null },
  52: { base: "tafdog_052", state: null },
  53: { base: "tafdog_012", state: "tafdog_012_state" },
  54: { base: "tafdog_054", state: null },
  55: { base: "tafdog_055", state: null },
  56: { base: "tafdog_080", state: null },
  57: { base: "tafdog_057", state: null },
  58: { base: "tafdog_014", state: "tafdog_014_state" },
  59: { base: "tafdog_059", state: null },
  60: { base: "tafdog_060", state: null },
  // 61-100: 運営保有分（2階）
  61: { base: "tafdog_061", state: null },
  62: { base: "tafdog_062", state: null },
  63: { base: "tafdog_063", state: null },
  64: { base: "tafdog_064", state: null },
  65: { base: "tafdog_001", state: "tafdog_001_state" },
  66: { base: "tafdog_066", state: null },
  67: { base: "tafdog_067", state: null },
  68: { base: "tafdog_068", state: null },
  69: { base: "tafdog_069", state: null },
  70: { base: "tafdog_008", state: "tafdog_006_state" },
  71: { base: "tafdog_071", state: null },
  72: { base: "tafdog_072", state: null },
  73: { base: "tafdog_073", state: null },
  74: { base: "tafdog_074", state: null },
  75: { base: "tafdog_028", state: "tafdog_013_state" },
  76: { base: "tafdog_076", state: null },
  77: { base: "tafdog_077", state: null },
  78: { base: "tafdog_078", state: null },
  79: { base: "tafdog_079", state: null },
  80: { base: "tafdog_070", state: "tafdog_018_state" },
  81: { base: "tafdog_081", state: null },
  82: { base: "tafdog_082", state: null },
  83: { base: "tafdog_083", state: null },
  84: { base: "tafdog_090", state: null },
  85: { base: "tafdog_085", state: null },
  86: { base: "tafdog_086", state: null },
  87: { base: "tafdog_087", state: null },
  88: { base: "tafdog_088", state: null },
  89: { base: "tafdog_089", state: null },
  90: { base: "tafdog_084", state: "tafdog_020_state" },
  91: { base: "tafdog_091", state: null },
  92: { base: "tafdog_092", state: null },
  93: { base: "tafdog_093", state: null },
  94: { base: "tafdog_094", state: null },
  95: { base: "tafdog_095", state: null },
  96: { base: "tafdog_096", state: null },
  97: { base: "tafdog_097", state: null },
  98: { base: "tafdog_100", state: null },
  99: { base: "tafdog_099", state: null },
  100: { base: "tafdog_098", state: "tafdog_019_state" }
};

// 変化条件
export const CHANGE_RULES = {
  "1": "埼玉の気温が25℃以上のときだけ変化",
  "4": "30日ごとの周期が奇数のとき変化",
  "7": "夜(18:00〜翌6:00)だけ変化",
  "10": "土日だけ変化",
  "13": "土日だけ変化（別デザイン）",
  "16": "金曜17:00〜24:00だけ変化",
  "19": "毎日21:00〜23:00だけ変化",
  "22": "毎日20:00〜21:00だけ変化",
  "25": "毎日12:00〜13:00だけ変化",
  "28": "毎日0:00〜2:00だけ変化",
  "35": "水曜日だけ変化",
  "38": "金・土・日だけ変化",
  "53": "平日9:00〜17:00だけ変化",
  "58": "火曜19:00〜21:00だけ変化",
  "65": "埼玉の天気が雨のときだけ変化",
  "70": "毎日15:00〜16:00だけ変化",
  "75": "毎日5:00〜7:00だけ変化",
  "80": "月末だけ変化",
  "90": "第2土曜日だけ変化",
  "100": "毎日2:00〜5:00だけ変化"
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
      ownerShort: "Loading...",
      isSpecial: imageInfo.state !== null // 変化条件付きかどうか
    });
  }
  return nfts;
}

// 部屋サイズ
export const ROOM_SIZE = 80;
export const ROOM_SIZE_2F = 60; // 2階は小さめ
export const WALL_HEIGHT = 10;
export const FLOOR_2F_HEIGHT = 15; // 2階の高さ

// ターゲットキャラの画像（1体ずつに変更）
export const TARGET_IMAGES = [
  "IMG_1822.png",
  "IMG_1889.png",
  "IMG_2958.png"
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

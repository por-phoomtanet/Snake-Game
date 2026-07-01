/* ============================================================
   config.js — ค่าปรับแต่งทั้งหมด + แคตตาล็อกของขวัญ/สกิน/ธีม
   แก้ค่าตรงนี้ที่เดียวเพื่อจูนเกม (ความเร็ว, ด่าน, เวลาของขวัญ ฯลฯ)
   ============================================================ */
(function (SG) {
  SG.CONFIG = {
    // กระดานเกม (960x540 = 16:9 พอดีสำหรับไลฟ์)
    grid: { cols: 32, rows: 18, cell: 30 },

    // ความเร็ว/ความยากของงู
    baseTickMs: 130,        // เวลาต่อ 1 ก้าว ที่ด่าน 1 (ยิ่งน้อยยิ่งเร็ว)
    minTickMs: 55,          // เร็วสุด
    speedUpPerLevel: 6,     // เร็วขึ้นกี่ ms ต่อด่าน
    foodPerLevel: 4,        // กินอาหารกี่ครั้งถึงขึ้นด่าน
    obstaclesPerLevel: 1,   // เพิ่มสิ่งกีดขวางถาวรกี่อันต่อด่าน
    maxObstacles: 26,       // จำกัดสิ่งกีดขวางไม่ให้แน่นเกิน
    deathPenalty: 30,       // ชนแล้วหักคะแนน

    // ===== ของขวัญ: สกิน (ตั้งชื่องู + เปลี่ยนสกินตามคนส่ง) =====
    // เวลาแสดงสกิน (วินาที) = coins * qty * SKIN_SEC_PER_COIN  (มี min/max กันสั้น/ยาวเกิน)
    SKIN_SEC_PER_COIN: 1,
    MIN_SKIN_SEC: 8,
    MAX_SKIN_SEC: 600,
    maxOwnerQueue: 12,      // คิวเจ้าของงู (ทุกคนที่ส่งได้คิวโชว์ชื่อ)

    // ===== ของขวัญ: กำแพง (มีชื่อคนส่ง) =====
    WALL_BASE_LEN: 3,       // ความยาวกำแพงพื้นฐาน (ช่อง)
    WALL_SEC_PER_QTY: 12,   // เวลากำแพงอยู่ (วินาที) = WALL_SEC_PER_QTY * qty
    MAX_WALL_SEC: 300,

    // ===== ของขวัญ: ธีม (นับเวลาแยกของตัวเอง แล้วกลับธีมปกติ) =====
    THEME_SEC_PER_COIN: 0.5,
    MIN_THEME_SEC: 15,
    MAX_THEME_SEC: 300,
  };

  /* ---- แคตตาล็อกของขวัญ ----
     coins  = มูลค่า TikTok (ใช้คำนวณเวลา/ลีดเดอร์บอร์ด)
     effect = 'skin' | 'wall' | 'theme'
     skin   = ชื่อสกินที่งูจะเปลี่ยนเป็น (ทุกของขวัญตั้งชื่องู + มีสกิน)
     ทุกของขวัญจะตั้งชื่องูเป็นชื่อคนส่งเสมอ ส่วน effect พิเศษ = wall/theme
     ↳ ต่อ TikTok จริงในเฟสถัดไป: แค่ map giftId ของ TikTok มาที่คีย์เหล่านี้ */
  SG.GIFTS = {
    rose:         { name: 'Rose',        emoji: '🌹', coins: 1,     effect: 'skin',  skin: 'rose' },
    finger_heart: { name: 'Finger Heart',emoji: '🫰', coins: 5,     effect: 'skin',  skin: 'goldheart' },
    perfume:      { name: 'Perfume',     emoji: '🌸', coins: 20,    effect: 'skin',  skin: 'purple' },
    sunglasses:   { name: 'Sunglasses',  emoji: '🕶️', coins: 199,   effect: 'skin',  skin: 'neon' },
    corgi:        { name: 'Corgi',       emoji: '🐶', coins: 299,   effect: 'skin',  skin: 'gold' },
    lion:         { name: 'Lion',        emoji: '🦁', coins: 29999, effect: 'skin',  skin: 'rainbow', epic: true },

    brick:        { name: 'Brick Wall',  emoji: '🧱', coins: 20,    effect: 'wall' },
    fortress:     { name: 'Fortress',    emoji: '🏰', coins: 100,   effect: 'wall',  big: true },

    galaxy:       { name: 'Galaxy',      emoji: '🌌', coins: 100,   effect: 'theme', theme: 'galaxy' },
    sunset:       { name: 'Sunset',      emoji: '🌅', coins: 50,    effect: 'theme', theme: 'sunset' },
    matrix:       { name: 'Matrix',      emoji: '💚', coins: 80,    effect: 'theme', theme: 'matrix' },
  };

  /* ---- สกินงู (จานสี) ---- */
  SG.SKINS = {
    default: { head: '#8cff5a', body: ['#4caf50', '#1b5e20'] },
    rose:    { head: '#ff5a76', body: ['#ff8fa3', '#b71c3a'] },
    pink:    { head: '#ff77c8', body: ['#ffa6dd', '#ad1457'] },
    purple:  { head: '#c199ff', body: ['#7c4dff', '#311b92'] },
    neon:    { head: '#39ff14', body: ['#00e5ff', '#0077b6'] },
    gold:    { head: '#ffe082', body: ['#ffca28', '#e65100'] },
    stone:   { head: '#cfd8dc', body: ['#90a4ae', '#37474f'] },
    rainbow: { rainbow: true },

    // สกินรูปภาพ (PNG โปร่งใส) — ใส่ tint เพื่อไล่เฉดลำตัว หัวสว่าง→ท้ายเข้ม
    // tint: [สีต้น, สีปลาย] คูณทับรูป (คงลวดลาย/เงาไว้) ถ้าไม่ใส่ = รูปสีเดิม
    goldheart: {
      head: '#f2b705', body: ['#f2b705', '#b8860b'],
      headImg: 'image/snake_head_gold.png',
      bodyImg: 'image/snake_body_gold.png',
      tint: ['#fff2c2', '#9c6b00'],
    },
  };

  /* ---- ธีม ---- */
  SG.THEMES = {
    classic: { bg: '#0e1420', grid: '#1b2536', accent: '#8cff5a' },
    galaxy:  { bg: '#0b0426', grid: '#1c1147', accent: '#c199ff', stars: true },
    sunset:  { bg: '#2a1220', grid: '#3d1a2a', accent: '#ff8f6b' },
    matrix:  { bg: '#00110a', grid: '#0a2a12', accent: '#39ff14', stars: true },
  };
})(window.SG = window.SG || {});

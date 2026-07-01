/* ============================================================
   gifts.js — แปลงของขวัญ → เอฟเฟกต์ในเกม
   ทุกของขวัญ: ตั้งชื่องู = ชื่อคนส่ง + เปลี่ยนสกิน (เวลา = coins*qty)
   effect พิเศษ: wall = สร้างกำแพงมีชื่อคนส่ง | theme = เปลี่ยนธีม
   ============================================================ */
(function (SG) {
  const C = SG.CONFIG;
  const rnd = n => Math.floor(Math.random() * n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function enqueueOwner(s, user, gift, coins, qty) {
    const sec = clamp(coins * qty * C.SKIN_SEC_PER_COIN, C.MIN_SKIN_SEC, C.MAX_SKIN_SEC);
    s.owners.push({ name: user, skin: gift.skin || 'default', remainingMs: sec * 1000, epic: !!gift.epic });
    // จำกัดคิว: เก็บเจ้าของปัจจุบันไว้ ตัดตัวที่รอเก่าสุดทิ้ง
    while (s.owners.length > C.maxOwnerQueue) s.owners.splice(1, 1);
  }

  function spawnWall(s, user, gift, qty) {
    const len = C.WALL_BASE_LEN * (gift.big ? 2 : 1);
    let cells = null, t = 0;
    while (t++ < 80 && !cells) {
      const horiz = Math.random() < 0.5;
      const x = 1 + rnd(s.cols - 2 - (horiz ? len : 0));
      const y = 1 + rnd(s.rows - 2 - (horiz ? 0 : len));
      const h = s.snake[0];
      const c = []; let ok = true;
      for (let i = 0; i < len; i++) {
        const cx = horiz ? x + i : x, cy = horiz ? y : y + i;
        if (SG.Game.occupied(cx, cy, true) || Math.abs(cx - h.x) + Math.abs(cy - h.y) < 3) { ok = false; break; }
        c.push({ x: cx, y: cy });
      }
      if (ok) cells = c;
    }
    if (!cells) return;
    const sec = Math.min(C.WALL_SEC_PER_QTY * qty, C.MAX_WALL_SEC);
    s.walls.push({ cells, name: user, expiresAt: performance.now() + sec * 1000 });
  }

  function apply(payload) {
    const s = SG.Game.state;
    const gift = SG.GIFTS[payload.giftId] || SG.GIFTS.rose;
    const qty = payload.qty || 1;
    const user = payload.user || 'someone';
    const value = gift.coins * qty;

    s.leaderboard.set(user, (s.leaderboard.get(user) || 0) + value);
    s.stats.giftsCount++; s.stats.totalCoins += value;

    enqueueOwner(s, user, gift, gift.coins, qty);          // ตั้งชื่องู + สกิน
    if (gift.effect === 'wall') spawnWall(s, user, gift, qty);
    else if (gift.effect === 'theme') s.theme = gift.theme;

    SG.Bus.emit('toast', { type: 'gift', user, gift, qty, value });
    SG.Bus.emit('giftApplied', { user, gift, qty, value });
    if (gift.epic) SG.Bus.emit('confetti', {});
  }

  SG.Gifts = { apply };
  SG.Bus.on('gift', apply);
})(window.SG = window.SG || {});

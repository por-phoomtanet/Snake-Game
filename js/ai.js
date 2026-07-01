/* ============================================================
   ai.js — สมองของงู (เล่นเองแบบไม่โง่ ไม่ขดตาย ดูสนุก)
   วิธีคิด:
   1) หาเส้นทางสั้นสุดไปหาอาหารด้วย BFS
   2) ก่อนเดิน เช็คด้วย flood-fill ว่าเดินแล้วยังมีที่ว่างพอ (ไม่ขังตัวเอง)
   3) ถ้าไม่ปลอดภัย → โหมดเอาตัวรอด: เดินไปทางที่มีที่ว่างมากสุด
   ============================================================ */
(function (SG) {
  const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const key = (x, y) => x + '_' + y;
  const inB = (s, x, y) => x >= 0 && y >= 0 && x < s.cols && y < s.rows;

  // ช่องที่ชนแล้วตาย (สิ่งกีดขวาง + กำแพง + ตัวงู) — ไม่รวมหางเพราะหางจะขยับ
  function blockedSet(s, includeTail) {
    const b = new Set();
    for (const o of s.obstacles) b.add(key(o.x, o.y));
    for (const w of s.walls) for (const c of w.cells) b.add(key(c.x, c.y));
    const body = s.snake, n = body.length;
    for (let i = 0; i < n; i++) {
      if (!includeTail && i === n - 1) continue;
      b.add(key(body[i].x, body[i].y));
    }
    return b;
  }

  // BFS หาเส้นทางจากหัวไปเป้าหมาย คืน path (รวมหัวที่ index 0)
  function bfs(s, blocked, target) {
    const head = s.snake[0];
    const prev = new Map(); prev.set(key(head.x, head.y), null);
    const q = [head]; let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      if (cur.x === target.x && cur.y === target.y) {
        const path = []; let node = cur;
        while (node) { path.push(node); node = prev.get(key(node.x, node.y)); }
        return path.reverse();
      }
      for (const d of DIRS) {
        const nx = cur.x + d.x, ny = cur.y + d.y, k = key(nx, ny);
        if (!inB(s, nx, ny) || blocked.has(k) || prev.has(k)) continue;
        prev.set(k, cur); q.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // นับช่องว่างที่เดินถึงได้ (flood-fill)
  function floodCount(s, blocked, start) {
    if (!inB(s, start.x, start.y) || blocked.has(key(start.x, start.y))) return 0;
    const seen = new Set([key(start.x, start.y)]);
    const q = [start]; let qi = 0, count = 0;
    while (qi < q.length) {
      const cur = q[qi++]; count++;
      for (const d of DIRS) {
        const nx = cur.x + d.x, ny = cur.y + d.y, k = key(nx, ny);
        if (!inB(s, nx, ny) || blocked.has(k) || seen.has(k)) continue;
        seen.add(k); q.push({ x: nx, y: ny });
      }
    }
    return count;
  }

  // ประเมินความปลอดภัยหลังเดินไป step: ที่ว่างที่ยังเข้าถึงได้จากหัวใหม่
  function spaceAfter(s, step) {
    const eating = step.x === s.food.x && step.y === s.food.y;
    const b = new Set();
    for (const o of s.obstacles) b.add(key(o.x, o.y));
    for (const w of s.walls) for (const c of w.cells) b.add(key(c.x, c.y));
    const body = s.snake, n = body.length;
    const end = eating ? n : n - 1;   // กินอาหาร = หางไม่ขยับ
    for (let i = 0; i < end; i++) b.add(key(body[i].x, body[i].y));
    b.add(key(step.x, step.y));
    let best = 0;
    for (const d of DIRS) {
      const nx = step.x + d.x, ny = step.y + d.y;
      if (!inB(s, nx, ny) || b.has(key(nx, ny))) continue;
      best = Math.max(best, floodCount(s, b, { x: nx, y: ny }));
    }
    return best;
  }

  SG.AI = {
    chooseDir(s) {
      const head = s.snake[0];
      const blocked = blockedSet(s, false);
      const need = Math.max(2, Math.floor(s.snake.length * 0.6));

      // 1) ไปหาอาหารถ้าปลอดภัย
      const path = bfs(s, blocked, s.food);
      s.foodReachable = !!path;
      if (path && path.length >= 2) {
        const step = path[1];
        if (spaceAfter(s, step) >= need) {
          return { x: step.x - head.x, y: step.y - head.y };
        }
      }

      // 2) โหมดเอาตัวรอด: เลือกทางที่มีที่ว่างมากสุด
      let bestDir = null, bestScore = -1;
      for (const d of DIRS) {
        const nx = head.x + d.x, ny = head.y + d.y;
        if (!inB(s, nx, ny) || blocked.has(key(nx, ny))) continue;
        const score = spaceAfter(s, { x: nx, y: ny });
        if (score > bestScore) { bestScore = score; bestDir = d; }
      }
      if (bestDir) return bestDir;

      // 3) จนมุม: หาทางที่ไม่ชนกำแพงไว้ก่อน
      for (const d of DIRS) {
        const nx = head.x + d.x, ny = head.y + d.y;
        if (inB(s, nx, ny) && !blocked.has(key(nx, ny))) return d;
      }
      return s.dir; // ตายแน่ ไปตามทางเดิม
    },
  };
})(window.SG = window.SG || {});

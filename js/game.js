/* ============================================================
   game.js — เครื่องยนต์เกม (สถานะ, การเดิน, ด่าน, กำแพง, คิวเจ้าของงู)
   ============================================================ */
(function (SG) {
  const C = SG.CONFIG;
  const rnd = n => Math.floor(Math.random() * n);

  const Game = {
    state: null,

    init() {
      const s = {
        cols: C.grid.cols, rows: C.grid.rows,
        snake: [], dir: { x: 1, y: 0 },
        food: { x: 5, y: 5 }, obstacles: [], walls: [],
        owners: [],            // คิวเจ้าของงู: {name, skin, remainingMs, epic}
        theme: 'classic', themeLabel: '', themeOwner: '', themeExpiresAt: 0, themeTotalMs: 0,
        score: 0, level: 1, foodEaten: 0,
        tickMs: C.baseTickMs, alive: true,
        leaderboard: new Map(),
        stats: { deaths: 0, giftsCount: 0, totalCoins: 0 },
        foodReachable: true, noPathTicks: 0,
        flash: null,
      };
      this.state = s;
      this.reset(true);
      return s;
    },

    reset(full) {
      const s = this.state;
      const cx = Math.floor(s.cols / 2), cy = Math.floor(s.rows / 2);
      if (full) { s.obstacles = []; s.walls = []; }
      this.clearSpawn(cx, cy);
      s.snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
      s.dir = { x: 1, y: 0 };
      s.alive = true;
      this.spawnFood();
    },

    // เคลียร์ทางเกิดใหม่ไม่ให้เกิดมาชนทันที
    clearSpawn(cx, cy) {
      const s = this.state;
      const minx = cx - 3, maxx = cx + 4;
      s.obstacles = s.obstacles.filter(o => !(o.y === cy && o.x >= minx && o.x <= maxx));
      s.walls.forEach(w => { w.cells = w.cells.filter(c => !(c.y === cy && c.x >= minx && c.x <= maxx)); });
      s.walls = s.walls.filter(w => w.cells.length > 0);
    },

    occupied(x, y, ignoreFood) {
      const s = this.state;
      for (const p of s.snake) if (p.x === x && p.y === y) return true;
      for (const o of s.obstacles) if (o.x === x && o.y === y) return true;
      for (const w of s.walls) for (const c of w.cells) if (c.x === x && c.y === y) return true;
      if (!ignoreFood && s.food.x === x && s.food.y === y) return true;
      return false;
    },

    spawnFood() {
      const s = this.state; let x, y, t = 0;
      do { x = rnd(s.cols); y = rnd(s.rows); t++; } while (this.occupied(x, y, true) && t < 600);
      s.food = { x, y }; s.noPathTicks = 0;
    },

    addObstacle() {
      const s = this.state;
      if (s.obstacles.length >= C.maxObstacles) return;
      const h = s.snake[0]; let x, y, t = 0;
      do {
        x = rnd(s.cols); y = rnd(s.rows); t++;
      } while ((this.occupied(x, y) || (Math.abs(x - h.x) + Math.abs(y - h.y) < 4)) && t < 200);
      if (t < 200) s.obstacles.push({ x, y });
    },

    step() {
      const s = this.state;
      if (!s.alive) { this.reset(false); return; }

      const prevDir = s.dir;
      s.dir = SG.AI.chooseDir(s);
      if (prevDir.x !== s.dir.x || prevDir.y !== s.dir.y) SG.Bus.emit('turn', {}); // เสียงเลี้ยว
      if (!s.foodReachable) { s.noPathTicks++; if (s.noPathTicks > 40) this.spawnFood(); }

      const head = s.snake[0];
      const nx = head.x + s.dir.x, ny = head.y + s.dir.y;

      if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows ||
          this.hitBody(nx, ny) || this.hitSolid(nx, ny)) {
        this.die(); return;
      }

      s.snake.unshift({ x: nx, y: ny });
      if (nx === s.food.x && ny === s.food.y) {
        s.score += 10; s.foodEaten++;
        this.spawnFood();
        this.checkLevel();
        SG.Bus.emit('eat', {});
      } else {
        s.snake.pop();
      }
    },

    hitBody(x, y) {
      const b = this.state.snake;
      for (let i = 0; i < b.length - 1; i++) if (b[i].x === x && b[i].y === y) return true; // ยกเว้นหาง
      return false;
    },
    hitSolid(x, y) {
      const s = this.state;
      for (const o of s.obstacles) if (o.x === x && o.y === y) return true;
      for (const w of s.walls) for (const c of w.cells) if (c.x === x && c.y === y) return true;
      return false;
    },

    checkLevel() {
      const s = this.state;
      const lvl = 1 + Math.floor(s.foodEaten / C.foodPerLevel);
      if (lvl > s.level) {
        s.level = lvl;
        s.tickMs = Math.max(C.minTickMs, C.baseTickMs - (lvl - 1) * C.speedUpPerLevel);
        for (let i = 0; i < C.obstaclesPerLevel; i++) this.addObstacle();
        this.flash('LEVEL ' + lvl + ' ⚡');
        SG.Bus.emit('levelup', { level: lvl });
      }
    },

    die() {
      const s = this.state;
      s.alive = false; s.stats.deaths++;
      s.score = Math.max(0, s.score - C.deathPenalty);
      // ลดสิ่งกีดขวางครึ่งหนึ่งเพื่อให้เกิดใหม่ได้ (คงลีดเดอร์บอร์ด/สกิน/ธีมไว้)
      if (s.obstacles.length > 8) s.obstacles.splice(0, Math.floor(s.obstacles.length / 2));
      this.flash('💥 CRASH!');
      SG.Bus.emit('death', { score: s.score });
    },

    flash(text) { this.state.flash = { text, until: performance.now() + 1400 }; },

    // รีเซ็ตทั้งเกมกลับค่าเริ่มต้น (คะแนน/ด่าน/กำแพง/สกิน/ลีดเดอร์บอร์ด/ธีม)
    hardReset() {
      const s = this.state;
      s.score = 0; s.level = 1; s.foodEaten = 0; s.tickMs = C.baseTickMs;
      s.obstacles = []; s.walls = []; s.owners = [];
      s.theme = 'classic'; s.themeLabel = ''; s.themeOwner = ''; s.themeExpiresAt = 0;
      s.leaderboard = new Map();
      s.stats = { deaths: 0, giftsCount: 0, totalCoins: 0 };
      s.noPathTicks = 0;
      this.reset(true);
      this.flash('🔄 RESET');
      SG.Bus.emit('reset', {});
    },

    // เดินเวลาแบบ real-time: นับถอยหลังสกินเจ้าของ + หมดอายุกำแพง
    updateTimers(dt, now) {
      const s = this.state;
      if (s.owners.length) {
        s.owners[0].remainingMs -= dt;
        if (s.owners[0].remainingMs <= 0) s.owners.shift();
      }
      if (s.walls.length) s.walls = s.walls.filter(w => w.expiresAt > now);
      if (s.themeExpiresAt && now > s.themeExpiresAt) {   // ธีมหมดเวลา → กลับปกติ
        s.theme = 'classic'; s.themeExpiresAt = 0; s.themeLabel = ''; s.themeOwner = '';
      }
      if (s.flash && s.flash.until < now) s.flash = null;
    },

    activeOwner() { return this.state.owners[0] || null; },
  };

  SG.Game = Game;
})(window.SG = window.SG || {});

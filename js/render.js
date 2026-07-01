/* ============================================================
   render.js — วาดเกมลง canvas + อัพเดต HUD/ลีดเดอร์บอร์ด/ทอสต์
   ============================================================ */
(function (SG) {
  const C = SG.CONFIG;
  const cell = C.grid.cell;
  let ctx, canvas, W, H, stars = [];
  const el = {};

  const theme = t => SG.THEMES[t] || SG.THEMES.classic;

  function init() {
    canvas = document.getElementById('game');
    canvas.width = C.grid.cols * cell;
    canvas.height = C.grid.rows * cell;
    W = canvas.width; H = canvas.height;
    ctx = canvas.getContext('2d');

    el.score = document.getElementById('score');
    el.level = document.getElementById('level');
    el.owner = document.getElementById('owner');
    el.lb = document.getElementById('leaderboard');
    el.toasts = document.getElementById('toasts');
    el.chat = document.getElementById('chatfeed');

    for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + 0.3, p: Math.random() * 6.28 });

    SG.Bus.on('toast', showToast);
    SG.Bus.on('chat', showChat);
    SG.Bus.on('confetti', confetti);
  }

  /* ---------- วาดเฟรม ---------- */
  function draw(now) {
    const s = SG.Game.state, th = theme(s.theme);
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    if (th.stars) drawStars(now);

    ctx.strokeStyle = th.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= C.grid.cols; x++) line(x * cell, 0, x * cell, H);
    for (let y = 0; y <= C.grid.rows; y++) line(0, y * cell, W, y * cell);

    for (const o of s.obstacles) roundRect(o.x * cell + 2, o.y * cell + 2, cell - 4, cell - 4, 4, '#4b5563');

    for (const w of s.walls) {
      for (const c of w.cells) {
        roundRect(c.x * cell + 1, c.y * cell + 1, cell - 2, cell - 2, 3, '#8d6e63');
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1;
        ctx.strokeRect(c.x * cell + 1.5, c.y * cell + 1.5, cell - 3, cell - 3);
      }
      const c0 = w.cells[0];
      pill('🧱 ' + w.name, c0.x * cell + cell / 2, c0.y * cell - 6);
    }

    // อาหาร (เต้นได้)
    const f = s.food, pulse = 1 + 0.15 * Math.sin(now / 150);
    ctx.save();
    ctx.shadowColor = th.accent; ctx.shadowBlur = 16; ctx.fillStyle = th.accent;
    ctx.beginPath();
    ctx.arc(f.x * cell + cell / 2, f.y * cell + cell / 2, (cell / 2 - 3) * pulse, 0, 6.2832);
    ctx.fill(); ctx.restore();

    drawSnake(s, now);

    if (s.flash) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (s.flash.until - now) / 1400 + 0.25);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 46px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 14;
      ctx.fillText(s.flash.text, W / 2, H / 2);
      ctx.restore();
    }

    updateHUD(s);
  }

  function drawSnake(s, now) {
    const owner = SG.Game.activeOwner();
    const skin = SG.SKINS[owner ? owner.skin : 'default'] || SG.SKINS.default;
    const n = s.snake.length;
    for (let i = n - 1; i >= 0; i--) {
      const p = s.snake[i];
      let col;
      if (skin.rainbow) col = 'hsl(' + ((i * 12 + now / 8) % 360) + ',90%,55%)';
      else if (i === 0) col = skin.head;
      else col = lerp(skin.body[0], skin.body[1], i / n);
      roundRect(p.x * cell + 1, p.y * cell + 1, cell - 2, cell - 2, i === 0 ? 8 : 5, col);
    }
    // ตา
    const h = s.snake[0], d = s.dir, cx = h.x * cell + cell / 2, cy = h.y * cell + cell / 2;
    const ex = d.y !== 0 ? 5 : 3, ey = d.x !== 0 ? 5 : 3;
    ctx.fillStyle = '#fff';
    dot(cx + d.x * 4 - ex, cy + d.y * 4 - ey, 2.4);
    dot(cx + d.x * 4 + ex, cy + d.y * 4 + ey, 2.4);

    const name = (owner ? owner.name : 'AI Snake') + (owner && owner.epic ? ' 👑' : '');
    pill(name, h.x * cell + cell / 2, h.y * cell - 6);
  }

  /* ---------- HUD ---------- */
  function updateHUD(s) {
    const owner = SG.Game.activeOwner();
    if (el.score) el.score.textContent = s.score;
    if (el.level) el.level.textContent = s.level;
    if (el.owner) el.owner.textContent = owner ? owner.name : 'AI Snake';

    if (el.lb) {
      const top = [...s.leaderboard.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      el.lb.innerHTML = top.length
        ? top.map((e, i) => `<li><span class="rank">${['🥇','🥈','🥉','4','5'][i]}</span> ${escapeHtml(e[0])} <b>${e[1]}</b>🪙</li>`).join('')
        : '<li class="empty">ยังไม่มีของขวัญ…</li>';
    }
  }

  /* ---------- Toast / Chat / Confetti ---------- */
  function showToast(d) {
    if (!el.toasts) return;
    const div = document.createElement('div');
    div.className = 'toast' + (d.gift && d.gift.epic ? ' epic' : '');
    div.innerHTML = `<span class="emoji">${d.gift.emoji}</span>
      <span class="tinfo">
        <span class="tname">${escapeHtml(d.user)}</span>
        <span class="tgift">ส่ง ${escapeHtml(d.gift.name)}${d.qty > 1 ? ' ×' + d.qty : ''} · +${d.value}🪙</span>
      </span>`;
    el.toasts.prepend(div);
    setTimeout(() => div.classList.add('show'), 10);
    setTimeout(() => { div.classList.remove('show'); setTimeout(() => div.remove(), 400); }, 4200);
    while (el.toasts.children.length > 6) el.toasts.lastChild.remove();
  }

  function showChat(d) {
    if (!el.chat) return;
    const div = document.createElement('div');
    div.className = 'chatline';
    div.innerHTML = `<b>${escapeHtml(d.user)}</b> ${escapeHtml(d.message)}`;
    el.chat.append(div);
    while (el.chat.children.length > 8) el.chat.firstChild.remove();
    el.chat.scrollTop = el.chat.scrollHeight;
  }

  function confetti() {
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = `hsl(${Math.random() * 360},90%,60%)`;
      p.style.animationDelay = (Math.random() * 0.3) + 's';
      document.body.append(p);
      setTimeout(() => p.remove(), 2500);
    }
  }

  /* ---------- helpers ---------- */
  function line(a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  function dot(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
  function roundRect(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function pill(text, cx, y) {
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    roundRect(cx - w / 2, y - 9, w, 16, 8, 'rgba(0,0,0,.6)');
    ctx.fillStyle = '#fff'; ctx.fillText(text, cx, y);
  }
  function drawStars(now) {
    ctx.save();
    for (const st of stars) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now / 700 + st.p);
      ctx.fillStyle = '#fff'; dot(st.x, st.y, st.r);
    }
    ctx.restore();
  }
  function lerp(c1, c2, t) {
    const a = hex(c1), b = hex(c2);
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  SG.Render = { init, draw };
})(window.SG = window.SG || {});

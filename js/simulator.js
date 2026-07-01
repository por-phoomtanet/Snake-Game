/* ============================================================
   simulator.js — ตัวจำลองของขวัญ/แชต (ใช้ทดสอบก่อนต่อ TikTok จริง)
   ปุ่มกดส่งของขวัญ + ช่องพิมพ์แชต + โหมดสุ่มอัตโนมัติ (ให้ไลฟ์มีสีสันตลอด)
   เฟสถัดไป: สลับมาใช้ WebSocket จาก TikTok-Live-Connector แทน (emit เข้า Bus เดียวกัน)
   ============================================================ */
(function (SG) {
  const NAMES = ['Ploy', 'TokTik_Fan', 'มะนาว', 'Aomsin', 'บอสใหญ่', 'น้องปลา',
    'Gamer99', 'เจ้านาย', 'มะลิ', 'KittyZ', 'ต้นน้ำ', 'ริว', 'Bank', 'พี่หมี'];
  const MSGS = ['สู้ๆ งู!', 'เลี้ยวสิ!', 'โอ้วววว', 'ระวังกำแพง!', 'เก่งมาก 👏',
    'ด่านต่อไปยากขึ้นแล้ว', '5555', 'ส่งกุหลาบให้จ้า', 'งูชื่ออะไรอะ', 'สกินสวยมาก',
    'เกือบตายละ', 'ขอสกินสีทองงง'];
  const rname = () => NAMES[Math.floor(Math.random() * NAMES.length)];

  function sendGift(giftId, qty) { SG.Bus.emit('gift', { user: rname(), giftId, qty: qty || 1 }); }
  function sendChat(user, message) { SG.Bus.emit('chat', { user: user || rname(), message }); }

  let autoTimer = null, autoRate = 3200;
  function autoTick() {
    if (Math.random() < 0.65) {
      const ids = Object.keys(SG.GIFTS);
      sendGift(ids[Math.floor(Math.random() * ids.length)], 1 + Math.floor(Math.random() * 3));
    } else {
      sendChat(rname(), MSGS[Math.floor(Math.random() * MSGS.length)]);
    }
  }
  function setAuto(on) {
    if (on && !autoTimer) autoTimer = setInterval(autoTick, autoRate);
    else if (!on && autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }
  function isAuto() { return !!autoTimer; }
  function setRate(ms) { autoRate = ms; if (autoTimer) { clearInterval(autoTimer); autoTimer = setInterval(autoTick, ms); } }

  // สลับโหมด: ส่งของขวัญอัตโนมัติ (true) หรือกดเอง (false) + อัพเดตปุ่มบนแผง
  let panelEl = null;
  function setMode(auto) {
    setAuto(auto);
    if (panelEl) {
      const a = panelEl.querySelector('#modeAuto'), m = panelEl.querySelector('#modeManual');
      const r = panelEl.querySelector('#rateRange');
      if (a) a.classList.toggle('active', auto);
      if (m) m.classList.toggle('active', !auto);
      if (r) r.disabled = !auto;
    }
  }

  function buildPanel() {
    const wrap = document.getElementById('simPanel');
    if (!wrap) return;

    const giftBtns = Object.entries(SG.GIFTS).map(([id, g]) =>
      `<button class="giftbtn" data-gift="${id}">${g.emoji} ${g.name}<small>${g.coins}🪙 · ${g.effect}</small></button>`
    ).join('');

    wrap.innerHTML = `
      <div class="sim-head">🎛️ แผงทดสอบ <span class="hint">(กด H ซ่อนตอนไลฟ์)</span></div>
      <div class="gift-grid">${giftBtns}</div>
      <div class="sim-row">
        <input id="chatInput" placeholder="พิมพ์แชตทดสอบ…" />
        <button id="chatSend">ส่ง</button>
      </div>
      <div class="sim-row toggles">
        <span class="mode-label">โหมดของขวัญ:</span>
        <div class="mode-switch">
          <button id="modeAuto" class="mode-btn active">🤖 ส่งอัตโนมัติ</button>
          <button id="modeManual" class="mode-btn">✋ กดเอง</button>
        </div>
        <label class="rate-wrap">เร็ว <input type="range" id="rateRange" min="800" max="6000" step="200" value="${autoRate}"> ช้า</label>
        <button id="resetBtn" class="reset-btn">🔄 รีเซ็ตเกม</button>
      </div>
      <div class="sim-row toggles">
        <span class="mode-label">เสียง:</span>
        <button id="musicBtn" class="snd-btn">🎵 เพลง</button>
        <button id="sfxBtn" class="snd-btn">🔊 เอฟเฟกต์</button>
        <label class="tts-wrap"><input type="checkbox" id="ttsChk"> 🗣️ AI พูดขอบคุณ (เฟส 2)</label>
      </div>`;
    panelEl = wrap;

    wrap.querySelectorAll('.giftbtn').forEach(b =>
      b.addEventListener('click', () => sendGift(b.dataset.gift, 1)));

    const ci = wrap.querySelector('#chatInput');
    const send = () => { if (ci.value.trim()) { sendChat(null, ci.value.trim()); ci.value = ''; } };
    wrap.querySelector('#chatSend').addEventListener('click', send);
    ci.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    wrap.querySelector('#modeAuto').addEventListener('click', () => setMode(true));
    wrap.querySelector('#modeManual').addEventListener('click', () => setMode(false));
    wrap.querySelector('#rateRange').addEventListener('input', e => setRate(+e.target.value));
    wrap.querySelector('#resetBtn').addEventListener('click', () => SG.Game.hardReset());
    wrap.querySelector('#ttsChk').addEventListener('change', e => SG.AIHost.setEnabled(e.target.checked));

    // ปุ่มเสียง (ซิงก์กับสถานะจริง รวมถึงเวลากดปุ่มลัด M/N)
    const musicBtn = wrap.querySelector('#musicBtn'), sfxBtn = wrap.querySelector('#sfxBtn');
    function syncSnd() {
      musicBtn.classList.toggle('on', SG.Audio.isMusic());
      musicBtn.textContent = SG.Audio.isMusic() ? '🎵 เพลง: เปิด' : '🎵 เพลง: ปิด';
      sfxBtn.classList.toggle('on', SG.Audio.isSfx());
      sfxBtn.textContent = SG.Audio.isSfx() ? '🔊 เอฟเฟกต์: เปิด' : '🔊 เอฟเฟกต์: ปิด';
    }
    musicBtn.addEventListener('click', () => SG.Audio.toggleMusic());
    sfxBtn.addEventListener('click', () => SG.Audio.toggleSfx());
    SG.Bus.on('audiochange', syncSnd);
    syncSnd();
  }

  SG.Simulator = { buildPanel, setAuto, setMode, isAuto, setRate, sendGift, sendChat, rname };
})(window.SG = window.SG || {});

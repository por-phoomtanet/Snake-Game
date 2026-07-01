/* ============================================================
   audio.js — ระบบเสียงทั้งหมด (สร้างเสียงเองด้วย Web Audio API ไม่ต้องมีไฟล์)
   - เพลงพื้นหลัง (chiptune วนลูป)
   - เอฟเฟกต์: เลี้ยว / กินอาหาร / ได้ของขวัญ / ตาย
   - เปิด-ปิดแยกกัน (เพลง / เอฟเฟกต์) + ปุ่มลัด M / N
   หมายเหตุ: เบราว์เซอร์บล็อกเสียงอัตโนมัติ เสียงจะเริ่มหลัง "คลิก/กดปุ่มครั้งแรก"
   ============================================================ */
(function (SG) {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let musicOn = true, sfxOn = true, unlocked = false;
  let schedTimer = null, nextNoteTime = 0, step = 0;

  // ----- ทำนอง (เพนทาโทนิก ฟังสบายๆ) -----
  const TEMPO = 112;
  const noteLen = 60 / TEMPO / 2;   // โน้ตเขบ็ต
  const C = 261.63, D = 293.66, E = 329.63, G = 392, A2 = 440, C2 = 523.25;
  const melody = [E, G, A2, G, E, D, C, D, E, G, A2, C2, A2, G, E, 0];
  const bass   = [220 / 2, 0, E / 2, 0, C / 2, 0, G / 2, 0];

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.16 : 0; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.5 : 0; sfxGain.connect(master);
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, start, dur, type, node, peak) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak || 0.3, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(node || sfxGain);
    o.start(start); o.stop(start + dur + 0.02);
  }

  // ----- เพลงพื้นหลัง (ตัวจัดคิวโน้ตล่วงหน้า) -----
  function scheduler() {
    while (nextNoteTime < ctx.currentTime + 0.12) {
      const m = melody[step % melody.length];
      if (m) tone(m, nextNoteTime, noteLen * 0.9, 'square', musicGain, 0.25);
      const b = bass[step % bass.length];
      if (b) tone(b, nextNoteTime, noteLen * 1.6, 'triangle', musicGain, 0.35);
      nextNoteTime += noteLen; step++;
    }
  }
  function startMusic() { if (!ctx || schedTimer) return; nextNoteTime = ctx.currentTime + 0.05; schedTimer = setInterval(scheduler, 25); }
  function stopMusic() { if (schedTimer) { clearInterval(schedTimer); schedTimer = null; } }

  function unlock() {
    if (unlocked) return;
    ensure(); resume(); unlocked = true;
    if (musicOn) startMusic();
  }

  // ----- เอฟเฟกต์ -----
  let lastTurn = 0;
  function sfxTurn() {
    if (!sfxOn || !ctx) return;
    const now = performance.now(); if (now - lastTurn < 70) return; lastTurn = now;
    tone(720, ctx.currentTime, 0.05, 'square', sfxGain, 0.18);
  }
  function sfxEat() {
    if (!sfxOn || !ctx) return; const t = ctx.currentTime;
    tone(520, t, 0.06, 'square', sfxGain, 0.25); tone(780, t + 0.05, 0.08, 'square', sfxGain, 0.25);
  }
  function sfxGift() {
    if (!sfxOn || !ctx) return; const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.05, 0.12, 'triangle', sfxGain, 0.3));
  }
  function sfxDeath() {
    if (!sfxOn || !ctx) return; const t = ctx.currentTime;
    tone(300, t, 0.15, 'sawtooth', sfxGain, 0.3); tone(150, t + 0.12, 0.25, 'sawtooth', sfxGain, 0.3);
  }

  SG.Bus.on('turn', sfxTurn);
  SG.Bus.on('eat', sfxEat);
  SG.Bus.on('gift', sfxGift);
  SG.Bus.on('death', sfxDeath);

  SG.Audio = {
    init() {
      ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
        window.addEventListener(ev, unlock));
    },
    setMusic(on) {
      musicOn = on; ensure(); resume();
      if (musicGain) musicGain.gain.value = on ? 0.16 : 0;
      if (on) { if (unlocked || ctx) { unlocked = true; startMusic(); } } else stopMusic();
      SG.Bus.emit('audiochange', {});
    },
    setSfx(on) {
      sfxOn = on; ensure(); resume();
      if (sfxGain) sfxGain.gain.value = on ? 0.5 : 0;
      SG.Bus.emit('audiochange', {});
    },
    toggleMusic() { this.setMusic(!musicOn); return musicOn; },
    toggleSfx() { this.setSfx(!sfxOn); return sfxOn; },
    isMusic() { return musicOn; },
    isSfx() { return sfxOn; },
  };
})(window.SG = window.SG || {});

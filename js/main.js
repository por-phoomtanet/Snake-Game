/* ============================================================
   main.js — บูตเกม + ลูปหลัก
   พารามิเตอร์ URL:
     ?obs=1   → ซ่อนแผงทดสอบ (โหมด overlay สำหรับ OBS)
     ?auto=0  → ปิดโหมดสุ่มอัตโนมัติ
   ปุ่มลัด: H = ซ่อน/แสดงแผงทดสอบ
   ============================================================ */
(function (SG) {
  function boot() {
    SG.Game.init();
    SG.Render.init();

    const params = new URLSearchParams(location.search);
    const obs = params.get('obs') === '1';
    if (obs) document.body.classList.add('hide-sim');
    SG.Simulator.buildPanel();

    // ค่าเริ่มต้น = โหมดกดเอง (ใส่ ?auto=1 เพื่อเริ่มแบบส่งอัตโนมัติ)
    SG.Simulator.setMode(params.get('auto') === '1');

    // ระบบเสียง (เพลงจะเริ่มหลังคลิก/กดปุ่มครั้งแรก ตามนโยบายเบราว์เซอร์)
    SG.Audio.init();

    let last = performance.now(), acc = 0;
    function frame(now) {
      const dt = Math.min(100, now - last); last = now;
      SG.Game.updateTimers(dt, now);
      acc += dt;
      let steps = 0;
      while (acc >= SG.Game.state.tickMs && steps < 5) {
        SG.Game.step(); acc -= SG.Game.state.tickMs; steps++;
      }
      SG.Render.draw(now);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k === 'h') document.body.classList.toggle('hide-sim'); // ซ่อน/แสดงแผงทดสอบ
      if (k === 'm') SG.Audio.toggleMusic();                     // เปิด/ปิดเพลง
      if (k === 'n') SG.Audio.toggleSfx();                       // เปิด/ปิดเอฟเฟกต์
    });
  }

  window.addEventListener('DOMContentLoaded', boot);
})(window.SG = window.SG || {});

/* ============================================================
   aihost.js — เฟส 2: พิธีกร AI พูดขอบคุณของขวัญ / ตอบแชต
   ตอนนี้: ใช้ Web Speech API (TTS ในเบราว์เซอร์) + ข้อความเทมเพลต
           ทำงานได้ทันทีแบบออฟไลน์ ไม่ต้องมี API key
   เฟสถัดไป: ต่อ Claude API ผ่าน backend (ดู generateReplyWithClaude ด้านล่าง)
   ============================================================ */
(function (SG) {
  let enabled = false;
  let voice = null;

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /th|thai/i.test(v.lang)) || vs.find(v => /en/i.test(v.lang)) || vs[0] || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = 1.05; u.pitch = 1.1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  function thankTemplate(user, gift, qty) {
    const t = [
      `ขอบคุณ ${user} มากเลยนะคะ สำหรับ ${gift.name} ${qty} ชิ้น`,
      `ว้าว ${user} ใจดีจังส่ง ${gift.name} มาให้ ขอบคุณค่าา`,
      `${user} สุดยอดไปเลย รับ ${gift.name} ไปเต็มๆ ขอบคุณนะคะ`,
    ];
    return t[Math.floor(Math.random() * t.length)];
  }

  // พูดขอบคุณเมื่อมีของขวัญ
  SG.Bus.on('gift', p => {
    if (!enabled) return;
    const g = SG.GIFTS[p.giftId] || SG.GIFTS.rose;
    speak(thankTemplate(p.user, g, p.qty || 1));
  });

  SG.AIHost = {
    setEnabled(v) { enabled = v; if (v) speak('พร้อมพูดคุยแล้วค่ะ'); },
    isEnabled() { return enabled; },
    speak,

    /* ---------- เฟส 2: ตอบแชตด้วย Claude (สมองจริง) ----------
       สำคัญ: ห้ามใส่ ANTHROPIC_API_KEY ในเบราว์เซอร์เด็ดขาด
       ให้รันผ่าน backend เล็กๆ (ดู server/tiktok-server.js) ที่เก็บ key ไว้
       แล้วเรียก Claude Messages API เช่น:
         model: 'claude-haiku-4-5-20251001'  // เร็ว+ถูก เหมาะกับตอบแชตสด
       ฝั่ง browser แค่ยิงมาที่ /api/reply */
    async generateReplyWithClaude(userMsg, context) {
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context }),
      });
      if (!res.ok) throw new Error('AI backend error ' + res.status);
      const data = await res.json();
      return data.reply;
    },
  };
})(window.SG = window.SG || {});

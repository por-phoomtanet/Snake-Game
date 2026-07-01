/* ============================================================
   server/tiktok-server.js — โครง backend เฟส 2 (ยังไม่เปิดใช้ใน Phase 1)
   หน้าที่:
   1) เชื่อม TikTok LIVE จริงด้วย TikTok-Live-Connector → ส่ง gift/chat ให้ browser ผ่าน WebSocket
   2) เป็น proxy เรียก Claude API (เก็บ ANTHROPIC_API_KEY ฝั่ง server เท่านั้น)

   วิธีใช้ (เมื่อพร้อมทำเฟส 2):
     cd server
     npm install                      # ติดตั้ง dependency ตาม package.json
     set ANTHROPIC_API_KEY=sk-ant-... # (Windows PowerShell: $env:ANTHROPIC_API_KEY="...")
     node tiktok-server.js @username
   จากนั้นเปิดเกมด้วย ?src=ws เพื่อรับ event จาก WebSocket แทนตัวจำลอง
   (ต้องเพิ่ม WebSocketSource ฝั่ง browser — ดูหมายเหตุท้ายไฟล์)
   ============================================================ */

const http = require('http');
const { WebSocketServer } = require('ws');
// const { WebcastPushConnection } = require('tiktok-live-connector'); // ← เปิดใช้เมื่อ npm install แล้ว
// const Anthropic = require('@anthropic-ai/sdk');

const PORT = 8080;
const username = process.argv[2] || '@your_tiktok_username';

// ---------- HTTP + /api/reply (Claude proxy) ----------
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/reply') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      try {
        const { message, context } = JSON.parse(body || '{}');
        const reply = await generateReply(message, context);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (e) {
        res.writeHead(500); res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }
  res.writeHead(404); res.end();
});

// ---------- WebSocket: ส่ง gift/chat ให้ browser ----------
const wss = new WebSocketServer({ server });
function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(data); });
}

// ---------- Claude (เก็บ key ที่ server เท่านั้น) ----------
async function generateReply(message, context) {
  // ตัวอย่างการเรียก Claude Messages API (เปิดใช้เมื่อพร้อม):
  //
  // const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // const res = await anthropic.messages.create({
  //   model: 'claude-haiku-4-5-20251001',   // เร็ว+ถูก เหมาะกับตอบแชตสด
  //   max_tokens: 120,
  //   system: 'คุณคือพิธีกรเกมงูสด TikTok พูดไทยสั้น เป็นกันเอง สนุก ขอบคุณผู้ส่งของขวัญ',
  //   messages: [{ role: 'user', content: message }],
  // });
  // return res.content[0].text;
  return `ขอบคุณสำหรับข้อความนะคะ: "${message}"`; // placeholder จนกว่าจะต่อจริง
}

// ---------- เชื่อม TikTok LIVE (เปิดใช้เมื่อ npm install แล้ว) ----------
function connectTikTok() {
  // const conn = new WebcastPushConnection(username);
  // conn.connect().then(() => console.log('✅ connected to', username))
  //   .catch(err => console.error('connect failed', err));
  //
  // conn.on('gift', d => {
  //   // ⭐ map giftId ของ TikTok → คีย์ใน SG.GIFTS (ทำตารางแมพเอง)
  //   broadcast({ type: 'gift', user: d.uniqueId, giftId: mapGift(d.giftId), qty: d.repeatCount || 1 });
  // });
  // conn.on('chat', d => broadcast({ type: 'chat', user: d.uniqueId, message: d.comment }));
  console.log('ℹ️ TikTok connector ยังไม่เปิดใช้ — uncomment เมื่อ npm install แล้ว');
}

server.listen(PORT, () => {
  console.log(`🚀 server: http://localhost:${PORT}  (ws + /api/reply)`);
  connectTikTok();
});

/* หมายเหตุ — ฝั่ง browser เพิ่ม source นี้เพื่อรับจาก WebSocket:
   const ws = new WebSocket('ws://localhost:8080');
   ws.onmessage = e => { const m = JSON.parse(e.data);
     if (m.type === 'gift') SG.Bus.emit('gift', m);
     if (m.type === 'chat') SG.Bus.emit('chat', m);
   };
   แล้วเปิดเกมด้วย ?auto=0 เพื่อปิดตัวจำลอง
*/

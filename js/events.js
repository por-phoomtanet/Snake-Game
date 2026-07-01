/* ============================================================
   events.js — Event Bus กลาง (แยกแหล่งข้อมูลออกจากตัวเกม)
   แหล่งข้อมูล (Simulator ตอนนี้ / TikTok-Live-Connector ในเฟสถัดไป)
   แค่ emit('gift') / emit('chat') เข้า Bus เดียวกัน เกมไม่ต้องรู้ว่ามาจากไหน
   ============================================================ */
(function (SG) {
  const listeners = {};
  SG.Bus = {
    on(event, fn) { (listeners[event] = listeners[event] || []).push(fn); },
    off(event, fn) { if (listeners[event]) listeners[event] = listeners[event].filter(f => f !== fn); },
    emit(event, data) {
      (listeners[event] || []).forEach(fn => {
        try { fn(data); } catch (e) { console.error('[Bus]', event, e); }
      });
    },
  };
})(window.SG = window.SG || {});

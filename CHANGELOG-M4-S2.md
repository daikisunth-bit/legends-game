# M4 Sprint 2 — Energy & Ultimate

## เพิ่ม
- Energy เริ่มที่ 0 ทุก Battle และถูกจำกัดด้วย Max Energy
- Normal Attack +15, Skill +10, รับ Direct Hit +8, Kill +25
- Energy Gain คูณด้วยโบนัสจาก INT ที่ถูกคำนวณใน Battle Snapshot
- Ultimate ของ Swordman, Mage, Archer และ Healer ตามข้อมูล Canonical
- AI ตรวจ Ultimate ก่อน Priority Slots
- Ultimate ใช้ Energy 100, ไม่มี Cooldown และไม่พลาด
- Energy/Ultimate Events ใน deterministic replay
- Energy bar และ Battle Log ฝั่ง Client
- Unit tests สำหรับ Energy, Direct Hit และ Healer Ultimate

## ไม่รวมใน Sprint นี้
- Buff, Debuff, DoT, HoT, Cleanse effect จริง
- Passive effects
- Animation asset เฉพาะ Ultimate

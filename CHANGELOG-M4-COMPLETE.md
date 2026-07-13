# M4 Complete — Status Effects & Combat Polish

## Sprint 3
- Buff และ Debuff แบบมีระยะเวลา
- DoT / HoT engine พร้อม snapshot attack และ periodic ticks
- Cleanse
- Stat modifiers: PATK, MATK, DEF, Hit, Flee, Crit Rate, Crit Damage, SPD
- Skill riders: Ignore DEF, Bonus Crit, Heal from Damage, Flat % Max HP Heal
- Passive ของ Swordman, Mage, Archer และ Healer
- เปิดใช้งาน Provoke, Counter Stance, Arcane Barrier, Take Aim, Blessing, Purify และ Sanctuary

## Sprint 4
- ลำดับ Tick: timed effects/cooldowns ก่อน gauge และ action
- Deterministic tie-break ที่ใช้ PRNG แบบคงที่
- Strict battle setup validation
- Accuracy floor/cap, Crit cap, SPD minimum และ DEF mitigation
- AoE target resolution รองรับใน engine แม้ Alpha PvE ปัจจุบันเป็น 1v1
- Replay events สำหรับ passive, effect apply/expire, DoT, HoT และ cleanse
- Battle UI แสดง status events
- เพิ่ม regression tests รวมทั้งหมด 14 tests

## Canonical Scope
ใช้เฉพาะ Effect ที่มีในเอกสารหลักปัจจุบัน ยังไม่เพิ่ม Freeze, Silence, Taunt, Shield หรือ Barrier verb ใหม่ เพราะยังไม่มีค่ากติกา Canonical ที่เพียงพอ

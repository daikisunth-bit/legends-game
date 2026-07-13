# M3 Character Progression Core

## Added
- Equipment inventory and six equipment slots.
- Server-authoritative equip and unequip operations.
- Enhancement +0 to +10 with Gold costs, visible rates, atomic transactions, and idempotent retries.
- Six Monster Card slots.
- Card equip, unequip, and 3-to-1 rarity merging with Gold fees.
- Per-Job stat allocation and free town respec.
- Data-driven item, rarity, enhancement, and card definitions.
- Character Progression UI for equipment, cards, and stats.
- Database migration `008_m3_progression.sql`.

## Safety
- Browser sends item/card ids only; the server validates ownership and rules.
- Gold deduction and upgrades/merges occur in one transaction.
- Repeated enhancement or merge requests reuse the same idempotency result.
- No secrets or generated build folders are included.

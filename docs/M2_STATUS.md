# M2 — Playable PvE Vertical Slice

Implemented:
- Data-driven Balance v0.1 for Maps 1–4 (24 monsters, 1v1 nodes).
- Map 1 unlocked and playable; Maps 2–4 visible but locked.
- Deterministic server-resolved combat using the shared engine.
- EXP, Gold, equipment and monster-card rewards in one transaction.
- Daily quest progress updates at battle completion.
- Idempotent battle requests and battle acknowledgement.
- Map selection, battle result/replay summary and auto-repeat UI.
- Auto-repeat stops on defeat, manual stop, route exit, or browser background.
- Public npm registry repair for cloud deployment.

Deferred to later milestones:
- Animated Phaser replay and authored skill actions (M4).
- Inventory/equipment/card management UI (M3).
- Map 2–4 unlock progression and final tuning.

-- ============================================================
-- add_location_fields.sql
-- Adds latitude/longitude to technicians + orders.
-- Demo centred around Kuala Lumpur.
-- Order 002 (the unassigned demo order) = PWTC Bistari.
-- ============================================================

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- ─── Technician base locations ────────────────────────────────
-- Ali    — Jalan Ipoh, Batu Road area
UPDATE technicians SET latitude = 3.1891, longitude = 101.6858
  WHERE id = 'a1000000-0000-0000-0000-000000000001';

-- John   — Bukit Bintang
UPDATE technicians SET latitude = 3.1447, longitude = 101.7101
  WHERE id = 'a1000000-0000-0000-0000-000000000002';

-- Bala   — Bangsar
UPDATE technicians SET latitude = 3.1278, longitude = 101.6804
  WHERE id = 'a1000000-0000-0000-0000-000000000003';

-- Yusoff — Ampang Point
UPDATE technicians SET latitude = 3.1478, longitude = 101.7597
  WHERE id = 'a1000000-0000-0000-0000-000000000004';

-- ─── Order locations ──────────────────────────────────────────
-- 001  Sentul
UPDATE orders SET latitude = 3.1835, longitude = 101.6855
  WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- 002  PWTC Bistari Service Apartment  ← demo target order
UPDATE orders SET
  latitude         = 3.1678,
  longitude        = 101.6939,
  customer_address = 'PWTC Bistari Service Apartment, Jalan Ipoh, 50350 Kuala Lumpur'
  WHERE id = 'b0000000-0000-0000-0000-000000000002';

-- 003  Kepong
UPDATE orders SET latitude = 3.2056, longitude = 101.6328
  WHERE id = 'b0000000-0000-0000-0000-000000000003';

-- 004  KLCC
UPDATE orders SET latitude = 3.1575, longitude = 101.7122
  WHERE id = 'b0000000-0000-0000-0000-000000000004';

-- 005  Titiwangsa
UPDATE orders SET latitude = 3.1751, longitude = 101.7061
  WHERE id = 'b0000000-0000-0000-0000-000000000005';

-- 006  Ampang
UPDATE orders SET latitude = 3.1478, longitude = 101.7597
  WHERE id = 'b0000000-0000-0000-0000-000000000006';

-- 007  Setapak
UPDATE orders SET latitude = 3.2057, longitude = 101.7218
  WHERE id = 'b0000000-0000-0000-0000-000000000007';

-- 008  Wangsa Maju
UPDATE orders SET latitude = 3.1993, longitude = 101.7298
  WHERE id = 'b0000000-0000-0000-0000-000000000008';

-- 009  Cheras
UPDATE orders SET latitude = 3.0835, longitude = 101.7299
  WHERE id = 'b0000000-0000-0000-0000-000000000009';

-- 010  Brickfields
UPDATE orders SET latitude = 3.1308, longitude = 101.6869
  WHERE id = 'b0000000-0000-0000-0000-000000000010';

-- 011  Bangsar
UPDATE orders SET latitude = 3.1263, longitude = 101.6797
  WHERE id = 'b0000000-0000-0000-0000-000000000011';

-- 012  Masjid India / Jalan TAR
UPDATE orders SET latitude = 3.1480, longitude = 101.6915
  WHERE id = 'b0000000-0000-0000-0000-000000000012';

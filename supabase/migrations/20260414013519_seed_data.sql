-- Fixed UUIDs so they match TECHNICIAN_IDS in src/constants/index.ts
INSERT INTO technicians (id, name, phone, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ali',    '0111234567', true),
  ('a1000000-0000-0000-0000-000000000002', 'John',   '0122345678', true),
  ('a1000000-0000-0000-0000-000000000003', 'Bala',   '0133456789', true),
  ('a1000000-0000-0000-0000-000000000004', 'Yusoff', '0144567890', true)
ON CONFLICT (id) DO NOTHING;

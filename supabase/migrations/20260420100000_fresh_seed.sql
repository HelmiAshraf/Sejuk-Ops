-- ============================================================
-- fresh_seed.sql
-- Wipes all order data and re-seeds with dates Apr 17–20, 2026.
-- Technicians are preserved via ON CONFLICT DO NOTHING.
-- ============================================================

-- ─── WIPE ────────────────────────────────────────────────────
TRUNCATE TABLE manager_reviews, audit_logs, job_photos, job_completions, orders RESTART IDENTITY CASCADE;
ALTER SEQUENCE order_seq RESTART WITH 1;

-- ─── TECHNICIANS (idempotent) ─────────────────────────────────
INSERT INTO technicians (id, name, phone, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ali',    '0111234567', true),
  ('a1000000-0000-0000-0000-000000000002', 'John',   '0122345678', true),
  ('a1000000-0000-0000-0000-000000000003', 'Bala',   '0133456789', true),
  ('a1000000-0000-0000-0000-000000000004', 'Yusoff', '0144567890', true)
ON CONFLICT (id) DO NOTHING;

-- ─── ORDERS ──────────────────────────────────────────────────
-- Apr 17 — Closed (fully done)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, preferred_date, created_by, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'SSB-20260417-0001', 'Ahmad Razif',    '601123456781', 'No 12 Jalan Bahagia, Subang Jaya',      'AC tidak sejuk langsung, dah 2 hari',          'AC Repair',        280.00, 'a1000000-0000-0000-0000-000000000001', 'Closed',   '', '2026-04-17', 'admin', '2026-04-17 08:10:00+08'),
  ('b0000000-0000-0000-0000-000000000002', 'SSB-20260417-0002', 'Nurul Ain',      '601123456782', 'Blok B-12-3, Apartment Sri Damansara',  'Service tahunan, cuci filter & coil',          'AC Cleaning',      120.00, 'a1000000-0000-0000-0000-000000000002', 'Closed',   '', '2026-04-17', 'admin', '2026-04-17 09:30:00+08');

-- Apr 17 — Reviewed
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, preferred_date, created_by, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'SSB-20260417-0003', 'Tan Wei Liang',  '601123456783', '18 Lorong Maju 3, Kepong',              'Gas habis, AC panas je',                       'Gas Refill',       160.00, 'a1000000-0000-0000-0000-000000000003', 'Reviewed', '', '2026-04-17', 'admin', '2026-04-17 13:00:00+08'),
  ('b0000000-0000-0000-0000-000000000004', 'SSB-20260417-0004', 'Priya Suresh',   '601123456784', 'Unit 5, Jalan Cempaka, Puchong',        'Pasang AC baru di bilik tidur',                'AC Installation',  650.00, 'a1000000-0000-0000-0000-000000000004', 'Reviewed', 'Confirm unit 1.5HP Daikin', '2026-04-17', 'admin', '2026-04-17 15:45:00+08');

-- Apr 18 — Job Done (awaiting manager review)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, preferred_date, created_by, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000005', 'SSB-20260418-0005', 'Mohamad Hafiz',  '601123456785', '33 Jalan Setia, Shah Alam',             'Compressor rosak, langsung tak sejuk',         'AC Repair',        750.00, 'a1000000-0000-0000-0000-000000000001', 'Job Done', '', '2026-04-18', 'admin', '2026-04-18 08:00:00+08'),
  ('b0000000-0000-0000-0000-000000000006', 'SSB-20260418-0006', 'Lee Siew Ting',  '601123456786', 'No 7 Jalan Kenanga, Ampang',            'Cuci AC 3 unit sekaligus',                     'AC Cleaning',      300.00, 'a1000000-0000-0000-0000-000000000002', 'Job Done', '', '2026-04-18', 'admin', '2026-04-18 10:30:00+08');

-- Apr 18 — In Progress (technician on site)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, preferred_date, created_by, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000007', 'SSB-20260418-0007', 'Zulaikha Ramli', '601123456787', 'Lot 22, Taman Desa Jaya, Klang',        'AC bocor air, basah dinding',                  'AC Repair',        350.00, 'a1000000-0000-0000-0000-000000000003', 'In Progress', '', '2026-04-18', 'admin', '2026-04-18 14:00:00+08');

-- Apr 19 — In Progress
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, preferred_date, created_by, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000008', 'SSB-20260419-0008', 'Rajendran Nair', '601123456788', '2A Jalan Wangsa Maju 6, KL',            'AC sejuk tak stabil, panas sekejap sejuk sekejap', 'Gas Refill',   180.00, 'a1000000-0000-0000-0000-000000000004', 'In Progress', '', '2026-04-19', 'admin', '2026-04-19 09:00:00+08');

-- Apr 19 — Assigned (technician assigned, not started)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, preferred_date, created_by, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000009', 'SSB-20260419-0009', 'Faridah Osman',  '601123456789', 'No 9 Jalan Perdana, Cheras',            'Bunyi bising bila AC dihidupkan',              'Inspection',        80.00, 'a1000000-0000-0000-0000-000000000001', 'Assigned', '', '2026-04-19', 'admin', '2026-04-19 11:30:00+08'),
  ('b0000000-0000-0000-0000-000000000010', 'SSB-20260419-0010', 'Kevin Loh',      '601123456790', 'Unit 18-3, Residensi Harmoni, Damansara', 'Pasang AC baru 2HP di ruang tamu',           'AC Installation',  900.00, 'a1000000-0000-0000-0000-000000000002', 'Assigned', 'Customer prefer afternoon slot', '2026-04-19', 'admin', '2026-04-19 14:00:00+08');

-- Apr 20 (today) — New (just submitted, unassigned)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, preferred_date, created_by, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000011', 'SSB-20260420-0011', 'Siti Hajar',     '601123456791', 'No 4 Jalan Mawar, Kajang',              'Kipas dalaman AC rosak, keluar bunyi pelik',   'AC Repair',        220.00, NULL, 'New', '', '2026-04-20', 'admin', '2026-04-20 09:15:00+08'),
  ('b0000000-0000-0000-0000-000000000012', 'SSB-20260420-0012', 'David Chong',    '601123456792', '15 Persiaran Utama, Petaling Jaya',     'Service rutin, minta slot petang',             'AC Cleaning',      150.00, NULL, 'New', 'Customer request morning slot', '2026-04-20', 'admin', '2026-04-20 10:45:00+08');


-- ─── JOB COMPLETIONS ─────────────────────────────────────────
-- Job Done orders (5, 6) — not yet reviewed
INSERT INTO job_completions (id, order_id, technician_id, work_done, extra_charges, final_amount, remarks, payment_amount, payment_method, payment_remarks, completed_at) VALUES
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001',
   'Ganti compressor unit baru. Diuji cooling 16°C selama 30 minit. OK.', 120.00, 870.00, 'Kos spare part compressor tambah', NULL, NULL, NULL, '2026-04-18 16:30:00+08'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002',
   'Cuci 3 unit AC: filter, coil, drain pan semua bersih.', 0.00, 300.00, 'Pelanggan minta langganan bulanan', NULL, NULL, NULL, '2026-04-18 17:00:00+08');

-- Reviewed orders (3, 4) — payment collected
INSERT INTO job_completions (id, order_id, technician_id, work_done, extra_charges, final_amount, remarks, payment_amount, payment_method, payment_remarks, completed_at) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003',
   'Top up gas R32 sebanyak 1.5kg. Semak kebocoran tiada isu.', 0.00, 160.00, 'Tekanan sistem normal selepas refill', 160.00, 'Cash', NULL, '2026-04-17 16:00:00+08'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004',
   'Pasang Daikin 1.5HP. Tebuk dinding, pasang paip, uji remote.', 50.00, 700.00, 'Kos tambahan sambungan paip', 700.00, 'Bank Transfer', 'TRF ke akaun syarikat', '2026-04-17 18:30:00+08');

-- Closed orders (1, 2) — fully settled
INSERT INTO job_completions (id, order_id, technician_id, work_done, extra_charges, final_amount, remarks, payment_amount, payment_method, payment_remarks, completed_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'Baiki kipas dalaman, ganti motor. Diuji 30 minit tiada isu.', 0.00, 280.00, '', 280.00, 'E-Wallet', 'DuitNow QR', '2026-04-17 12:30:00+08'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
   'Service penuh: cuci coil, filter, drain. AC sejuk semula.', 0.00, 120.00, 'Filter tersumbat teruk', 120.00, 'Cash', NULL, '2026-04-17 14:00:00+08');


-- ─── MANAGER REVIEWS ─────────────────────────────────────────
INSERT INTO manager_reviews (order_id, reviewed_by, review_notes, outcome, reviewed_at) VALUES
  -- Reviewed orders
  ('b0000000-0000-0000-0000-000000000003', 'Manager Helmi', 'Gas refill amount betul. Bukti tekanan ada.', 'Approved', '2026-04-17 22:00:00+08'),
  ('b0000000-0000-0000-0000-000000000004', 'Manager Helmi', 'Caj tambahan RM50 pipe extension tidak pra-lulus admin. Flag untuk semakan.', 'Flagged', '2026-04-17 23:30:00+08'),
  -- Closed orders
  ('b0000000-0000-0000-0000-000000000001', 'Manager Helmi', 'Kerja kemas. Bayaran dikutip betul.', 'Approved', '2026-04-17 20:00:00+08'),
  ('b0000000-0000-0000-0000-000000000002', 'Manager Helmi', 'Unit disahkan bersih. Pelanggan berpuas hati.', 'Approved', '2026-04-17 21:00:00+08');


-- ─── AUDIT LOGS ──────────────────────────────────────────────
INSERT INTO audit_logs (order_id, action, from_status, to_status, actor_role, actor_name, metadata, created_at) VALUES
  -- Order 1 → Closed (Apr 17)
  ('b0000000-0000-0000-0000-000000000001', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"Ali"}',                     '2026-04-17 08:20:00+08'),
  ('b0000000-0000-0000-0000-000000000001', 'Status changed', 'Assigned',    'In Progress', 'technician', 'Ali',            NULL,                                       '2026-04-17 10:00:00+08'),
  ('b0000000-0000-0000-0000-000000000001', 'Job completed',  'In Progress', 'Job Done',    'technician', 'Ali',            '{"final_amount":280,"extra_charges":0}',    '2026-04-17 12:30:00+08'),
  ('b0000000-0000-0000-0000-000000000001', 'Manager reviewed','Job Done',   'Reviewed',    'manager',    'Manager Helmi',  '{"outcome":"Approved"}',                   '2026-04-17 20:00:00+08'),
  ('b0000000-0000-0000-0000-000000000001', 'Order closed',    'Reviewed',   'Closed',      'admin',      'Admin Farid',    NULL,                                       '2026-04-17 22:30:00+08'),
  -- Order 2 → Closed (Apr 17)
  ('b0000000-0000-0000-0000-000000000002', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"John"}',                    '2026-04-17 09:40:00+08'),
  ('b0000000-0000-0000-0000-000000000002', 'Status changed', 'Assigned',    'In Progress', 'technician', 'John',           NULL,                                       '2026-04-17 11:30:00+08'),
  ('b0000000-0000-0000-0000-000000000002', 'Job completed',  'In Progress', 'Job Done',    'technician', 'John',           '{"final_amount":120,"extra_charges":0}',    '2026-04-17 14:00:00+08'),
  ('b0000000-0000-0000-0000-000000000002', 'Manager reviewed','Job Done',   'Reviewed',    'manager',    'Manager Helmi',  '{"outcome":"Approved"}',                   '2026-04-17 21:00:00+08'),
  ('b0000000-0000-0000-0000-000000000002', 'Order closed',    'Reviewed',   'Closed',      'admin',      'Admin Farid',    NULL,                                       '2026-04-17 23:00:00+08'),
  -- Order 3 → Reviewed/Approved (Apr 17)
  ('b0000000-0000-0000-0000-000000000003', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"Bala"}',                    '2026-04-17 13:10:00+08'),
  ('b0000000-0000-0000-0000-000000000003', 'Status changed', 'Assigned',    'In Progress', 'technician', 'Bala',           NULL,                                       '2026-04-17 14:30:00+08'),
  ('b0000000-0000-0000-0000-000000000003', 'Job completed',  'In Progress', 'Job Done',    'technician', 'Bala',           '{"final_amount":160,"extra_charges":0}',    '2026-04-17 16:00:00+08'),
  ('b0000000-0000-0000-0000-000000000003', 'Manager reviewed','Job Done',   'Reviewed',    'manager',    'Manager Helmi',  '{"outcome":"Approved"}',                   '2026-04-17 22:00:00+08'),
  -- Order 4 → Reviewed/Flagged (Apr 17)
  ('b0000000-0000-0000-0000-000000000004', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"Yusoff"}',                  '2026-04-17 15:50:00+08'),
  ('b0000000-0000-0000-0000-000000000004', 'Status changed', 'Assigned',    'In Progress', 'technician', 'Yusoff',         NULL,                                       '2026-04-17 16:30:00+08'),
  ('b0000000-0000-0000-0000-000000000004', 'Job completed',  'In Progress', 'Job Done',    'technician', 'Yusoff',         '{"final_amount":700,"extra_charges":50}',   '2026-04-17 18:30:00+08'),
  ('b0000000-0000-0000-0000-000000000004', 'Manager reviewed','Job Done',   'Reviewed',    'manager',    'Manager Helmi',  '{"outcome":"Flagged"}',                    '2026-04-17 23:30:00+08'),
  -- Order 5 → Job Done (Apr 18)
  ('b0000000-0000-0000-0000-000000000005', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"Ali"}',                     '2026-04-18 08:10:00+08'),
  ('b0000000-0000-0000-0000-000000000005', 'Status changed', 'Assigned',    'In Progress', 'technician', 'Ali',            NULL,                                       '2026-04-18 10:00:00+08'),
  ('b0000000-0000-0000-0000-000000000005', 'Job completed',  'In Progress', 'Job Done',    'technician', 'Ali',            '{"final_amount":870,"extra_charges":120}',  '2026-04-18 16:30:00+08'),
  -- Order 6 → Job Done (Apr 18)
  ('b0000000-0000-0000-0000-000000000006', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"John"}',                    '2026-04-18 10:40:00+08'),
  ('b0000000-0000-0000-0000-000000000006', 'Status changed', 'Assigned',    'In Progress', 'technician', 'John',           NULL,                                       '2026-04-18 13:00:00+08'),
  ('b0000000-0000-0000-0000-000000000006', 'Job completed',  'In Progress', 'Job Done',    'technician', 'John',           '{"final_amount":300,"extra_charges":0}',    '2026-04-18 17:00:00+08'),
  -- Order 7 → In Progress (Apr 18)
  ('b0000000-0000-0000-0000-000000000007', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"Bala"}',                    '2026-04-18 14:10:00+08'),
  ('b0000000-0000-0000-0000-000000000007', 'Status changed', 'Assigned',    'In Progress', 'technician', 'Bala',           NULL,                                       '2026-04-18 15:30:00+08'),
  -- Order 8 → In Progress (Apr 19)
  ('b0000000-0000-0000-0000-000000000008', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"Yusoff"}',                  '2026-04-19 09:10:00+08'),
  ('b0000000-0000-0000-0000-000000000008', 'Status changed', 'Assigned',    'In Progress', 'technician', 'Yusoff',         NULL,                                       '2026-04-19 10:30:00+08'),
  -- Order 9 → Assigned (Apr 19)
  ('b0000000-0000-0000-0000-000000000009', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"Ali"}',                     '2026-04-19 11:40:00+08'),
  -- Order 10 → Assigned (Apr 19)
  ('b0000000-0000-0000-0000-000000000010', 'Status changed', 'New',         'Assigned',    'admin',      'Admin Farid',    '{"technician":"John"}',                    '2026-04-19 14:10:00+08');
  -- Orders 11, 12 are New — no audit logs yet

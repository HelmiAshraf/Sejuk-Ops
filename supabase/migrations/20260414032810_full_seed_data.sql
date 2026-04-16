-- ============================================================
-- full_seed_data.sql
-- Covers all 6 statuses so every app feature can be tested.
-- ============================================================

-- ─── Helpers ─────────────────────────────────────────────────
-- Disable sequence so we control order_no manually via override
-- We insert order_no explicitly to get predictable values.

-- ─── ORDERS ──────────────────────────────────────────────────
-- Status: New (2 orders — unassigned, sitting in admin inbox)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'SSB-20260414-0001', 'Ahmad Razif',   '601123456781', 'No 12 Jalan Bahagia, Subang Jaya',    'AC tidak sejuk langsung, dah 2 hari',          'AC Repair',       280.00, NULL, 'New', '',                       'admin'),
  ('b0000000-0000-0000-0000-000000000002', 'SSB-20260414-0002', 'Nurul Ain',     '601123456782', 'Blok B-12-3, Apartment Sri Damansara', 'Bunyi bising bila AC hidup',                   'Inspection',       80.00, NULL, 'New', 'Customer request morning slot', 'admin');

-- Status: Assigned (2 orders — technician assigned, not started yet)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'SSB-20260414-0003', 'Tan Wei Liang', '601123456783', '18 Lorong Maju 3, Kepong',             'AC bocor air, basah dinding',                  'AC Repair',       350.00, 'a1000000-0000-0000-0000-000000000001', 'Assigned', '', 'admin'),
  ('b0000000-0000-0000-0000-000000000004', 'SSB-20260414-0004', 'Priya Suresh',  '601123456784', 'Unit 5, Jalan Cempaka, Puchong',        'Nak pasang AC baru di bilik tidur',            'AC Installation', 650.00, 'a1000000-0000-0000-0000-000000000002', 'Assigned', 'Confirm unit 1.5HP', 'admin');

-- Status: In Progress (2 orders — technician on site)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000005', 'SSB-20260414-0005', 'Mohamad Hafiz', '601123456785', '33 Jalan Setia, Shah Alam',             'AC sejuk tak stabil, panas kejap sejuk kejap', 'Gas Refill',      180.00, 'a1000000-0000-0000-0000-000000000003', 'In Progress', '', 'admin'),
  ('b0000000-0000-0000-0000-000000000006', 'SSB-20260414-0006', 'Lee Siew Ting', '601123456786', 'No 7 Jalan Kenanga, Ampang',            'Service tahunan AC rumah',                     'AC Cleaning',     120.00, 'a1000000-0000-0000-0000-000000000004', 'In Progress', '', 'admin');

-- Status: Job Done (2 orders — technician submitted completion, pending manager review)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000007', 'SSB-20260414-0007', 'Zulaikha Ramli','601123456787', 'Lot 22, Taman Desa Jaya, Klang',        'Compressor rosak, AC langsung tak sejuk',      'AC Repair',       750.00, 'a1000000-0000-0000-0000-000000000001', 'Job Done', '', 'admin'),
  ('b0000000-0000-0000-0000-000000000008', 'SSB-20260414-0008', 'Rajendran Nair','601123456788', '2A Jalan Wangsa Maju 6, KL',            'Cuci AC 3 unit sekaligus',                     'AC Cleaning',     300.00, 'a1000000-0000-0000-0000-000000000002', 'Job Done', '', 'admin');

-- Status: Reviewed (2 orders — manager has reviewed, approved or flagged)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000009', 'SSB-20260414-0009', 'Faridah Osman', '601123456789', 'No 9 Jalan Perdana, Cheras',            'Gas habis, AC panas',                          'Gas Refill',      160.00, 'a1000000-0000-0000-0000-000000000003', 'Reviewed', '', 'admin'),
  ('b0000000-0000-0000-0000-000000000010', 'SSB-20260414-0010', 'Kevin Loh',     '601123456790', 'Unit 18-3, Residensi Harmoni, Damansara','Pasang AC baru 2HP di ruang tamu',             'AC Installation', 900.00, 'a1000000-0000-0000-0000-000000000004', 'Reviewed', '', 'admin');

-- Status: Closed (2 orders — fully done, payment collected)
INSERT INTO orders (id, order_no, customer_name, customer_phone, customer_address, problem_description, service_type, quoted_price, assigned_technician_id, status, admin_notes, created_by) VALUES
  ('b0000000-0000-0000-0000-000000000011', 'SSB-20260414-0011', 'Siti Hajar',    '601123456791', 'No 4 Jalan Mawar, Kajang',              'Kipas dalaman AC rosak',                       'AC Repair',       220.00, 'a1000000-0000-0000-0000-000000000001', 'Closed', '', 'admin'),
  ('b0000000-0000-0000-0000-000000000012', 'SSB-20260414-0012', 'David Chong',   '601123456792', '15 Persiaran Utama, Petaling Jaya',     'Service dan cuci, bunyi bising dah ok',        'AC Cleaning',     150.00, 'a1000000-0000-0000-0000-000000000002', 'Closed', '', 'admin');


-- ─── JOB COMPLETIONS ─────────────────────────────────────────
-- Required for: Job Done, Reviewed, Closed orders
INSERT INTO job_completions (id, order_id, technician_id, work_done, extra_charges, final_amount, remarks, payment_amount, payment_method, completed_at) VALUES
  -- Job Done
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001',
   'Replaced compressor unit. Tested cooling to 16°C. All good.', 120.00, 870.00, 'Spare part compressor tambah cost', NULL, NULL, now() - interval '2 hours'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002',
   'Cleaned all 3 units. Washed filters, coils, and drain pan.', 0.00, 300.00, 'Customer happy, request monthly plan', NULL, NULL, now() - interval '3 hours'),
  -- Reviewed
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003',
   'Topped up R32 gas 1.5kg. Checked for leaks, none found.', 0.00, 160.00, 'System pressure normal after refill', 160.00, 'Cash', now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004',
   'Installed Daikin 2HP. Drilled wall, laid pipes, tested remote.', 50.00, 950.00, 'Extra pipe extension needed', 950.00, 'Bank Transfer', now() - interval '1 day'),
  -- Closed
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001',
   'Replaced indoor fan motor. Tested for 30 min, no issues.', 0.00, 220.00, '', 220.00, 'E-Wallet', now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000002',
   'Full service: cleaned coils, filter, drain. Noise resolved.', 0.00, 150.00, 'Noise was from dirty filter', 150.00, 'Cash', now() - interval '5 days');


-- ─── AUDIT LOGS ──────────────────────────────────────────────
INSERT INTO audit_logs (order_id, action, from_status, to_status, actor_role, actor_name, metadata) VALUES
  -- Order 3 (Assigned)
  ('b0000000-0000-0000-0000-000000000003', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"Ali"}'),
  -- Order 4 (Assigned)
  ('b0000000-0000-0000-0000-000000000004', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"John"}'),
  -- Order 5 (In Progress)
  ('b0000000-0000-0000-0000-000000000005', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"Bala"}'),
  ('b0000000-0000-0000-0000-000000000005', 'Status changed', 'Assigned', 'In Progress', 'technician', 'Bala', NULL),
  -- Order 6 (In Progress)
  ('b0000000-0000-0000-0000-000000000006', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"Yusoff"}'),
  ('b0000000-0000-0000-0000-000000000006', 'Status changed', 'Assigned', 'In Progress', 'technician', 'Yusoff', NULL),
  -- Order 7 (Job Done)
  ('b0000000-0000-0000-0000-000000000007', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"Ali"}'),
  ('b0000000-0000-0000-0000-000000000007', 'Status changed', 'Assigned', 'In Progress', 'technician', 'Ali', NULL),
  ('b0000000-0000-0000-0000-000000000007', 'Job completed', 'In Progress', 'Job Done', 'technician', 'Ali', '{"final_amount":870,"extra_charges":120}'),
  -- Order 8 (Job Done)
  ('b0000000-0000-0000-0000-000000000008', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"John"}'),
  ('b0000000-0000-0000-0000-000000000008', 'Status changed', 'Assigned', 'In Progress', 'technician', 'John', NULL),
  ('b0000000-0000-0000-0000-000000000008', 'Job completed', 'In Progress', 'Job Done', 'technician', 'John', '{"final_amount":300,"extra_charges":0}'),
  -- Order 9 (Reviewed)
  ('b0000000-0000-0000-0000-000000000009', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"Bala"}'),
  ('b0000000-0000-0000-0000-000000000009', 'Status changed', 'Assigned', 'In Progress', 'technician', 'Bala', NULL),
  ('b0000000-0000-0000-0000-000000000009', 'Job completed', 'In Progress', 'Job Done', 'technician', 'Bala', '{"final_amount":160,"extra_charges":0}'),
  ('b0000000-0000-0000-0000-000000000009', 'Manager reviewed', 'Job Done', 'Reviewed', 'manager', 'Manager Helmi', '{"outcome":"Approved"}'),
  -- Order 10 (Reviewed - Flagged)
  ('b0000000-0000-0000-0000-000000000010', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"Yusoff"}'),
  ('b0000000-0000-0000-0000-000000000010', 'Status changed', 'Assigned', 'In Progress', 'technician', 'Yusoff', NULL),
  ('b0000000-0000-0000-0000-000000000010', 'Job completed', 'In Progress', 'Job Done', 'technician', 'Yusoff', '{"final_amount":950,"extra_charges":50}'),
  ('b0000000-0000-0000-0000-000000000010', 'Manager reviewed', 'Job Done', 'Reviewed', 'manager', 'Manager Helmi', '{"outcome":"Flagged"}'),
  -- Order 11 (Closed)
  ('b0000000-0000-0000-0000-000000000011', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"Ali"}'),
  ('b0000000-0000-0000-0000-000000000011', 'Status changed', 'Assigned', 'In Progress', 'technician', 'Ali', NULL),
  ('b0000000-0000-0000-0000-000000000011', 'Job completed', 'In Progress', 'Job Done', 'technician', 'Ali', '{"final_amount":220,"extra_charges":0}'),
  ('b0000000-0000-0000-0000-000000000011', 'Manager reviewed', 'Job Done', 'Reviewed', 'manager', 'Manager Helmi', '{"outcome":"Approved"}'),
  ('b0000000-0000-0000-0000-000000000011', 'Order closed', 'Reviewed', 'Closed', 'admin', 'Admin Farid', NULL),
  -- Order 12 (Closed)
  ('b0000000-0000-0000-0000-000000000012', 'Status changed', 'New', 'Assigned', 'admin', 'Admin Farid', '{"technician":"John"}'),
  ('b0000000-0000-0000-0000-000000000012', 'Status changed', 'Assigned', 'In Progress', 'technician', 'John', NULL),
  ('b0000000-0000-0000-0000-000000000012', 'Job completed', 'In Progress', 'Job Done', 'technician', 'John', '{"final_amount":150,"extra_charges":0}'),
  ('b0000000-0000-0000-0000-000000000012', 'Manager reviewed', 'Job Done', 'Reviewed', 'manager', 'Manager Helmi', '{"outcome":"Approved"}'),
  ('b0000000-0000-0000-0000-000000000012', 'Order closed', 'Reviewed', 'Closed', 'admin', 'Admin Farid', NULL);


-- ─── MANAGER REVIEWS ─────────────────────────────────────────
INSERT INTO manager_reviews (order_id, reviewed_by, review_notes, outcome, reviewed_at) VALUES
  ('b0000000-0000-0000-0000-000000000009', 'Manager Helmi', 'Work looks good. Gas refill amount correct.', 'Approved', now() - interval '22 hours'),
  ('b0000000-0000-0000-0000-000000000010', 'Manager Helmi', 'Extra charge RM50 not pre-approved by admin. Flag for review.', 'Flagged', now() - interval '20 hours'),
  ('b0000000-0000-0000-0000-000000000011', 'Manager Helmi', 'Clean job. Payment collected correctly.', 'Approved', now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000012', 'Manager Helmi', 'All 3 units verified. Noise issue resolved.', 'Approved', now() - interval '4 days');

-- Technicians
CREATE TABLE IF NOT EXISTS technicians (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Order number sequence
CREATE SEQUENCE IF NOT EXISTS order_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS text AS $$
DECLARE
  today text := to_char(now(), 'YYYYMMDD');
  seq_val int;
BEGIN
  seq_val := nextval('order_seq');
  RETURN 'SSB-' || today || '-' || lpad(seq_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no                text UNIQUE NOT NULL DEFAULT generate_order_no(),
  customer_name           text NOT NULL,
  customer_phone          text,
  customer_address        text NOT NULL,
  problem_description     text,
  service_type            text NOT NULL,
  quoted_price            numeric(10,2) NOT NULL DEFAULT 0,
  assigned_technician_id  uuid REFERENCES technicians(id),
  status                  text NOT NULL DEFAULT 'New'
                          CHECK (status IN ('New','Assigned','In Progress','Job Done','Reviewed','Closed')),
  admin_notes             text,
  created_by              text NOT NULL DEFAULT 'admin',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Job completions (one per order)
CREATE TABLE IF NOT EXISTS job_completions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  technician_id     uuid NOT NULL REFERENCES technicians(id),
  work_done         text NOT NULL,
  extra_charges     numeric(10,2) DEFAULT 0,
  final_amount      numeric(10,2) NOT NULL,
  remarks           text,
  completed_at      timestamptz DEFAULT now(),
  payment_amount    numeric(10,2),
  payment_method    text CHECK (payment_method IN ('Cash','Bank Transfer','E-Wallet')),
  receipt_photo_url text
);

-- Job photos (up to 6 per order)
CREATE TABLE IF NOT EXISTS job_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  public_url    text NOT NULL,
  uploaded_at   timestamptz DEFAULT now(),
  uploaded_by   text NOT NULL,
  file_type     text
);

-- Audit logs (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action      text NOT NULL,
  from_status text,
  to_status   text,
  actor_role  text NOT NULL,
  actor_name  text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

-- Manager reviews
CREATE TABLE IF NOT EXISTS manager_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewed_by   text NOT NULL,
  review_notes  text,
  outcome       text NOT NULL CHECK (outcome IN ('Approved','Flagged')),
  reviewed_at   timestamptz DEFAULT now()
);

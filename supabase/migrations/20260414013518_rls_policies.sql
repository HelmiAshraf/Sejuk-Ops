-- Enable RLS on all tables
ALTER TABLE technicians     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_reviews ENABLE ROW LEVEL SECURITY;

-- Open read/write for anon (mock auth — no real Supabase Auth users)
-- In production, replace with auth.uid()-based policies

CREATE POLICY "allow_all_technicians"     ON technicians     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_orders"          ON orders          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_completions"     ON job_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_photos"          ON job_photos      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_read_audit"          ON audit_logs      FOR SELECT USING (true);
CREATE POLICY "allow_insert_audit"        ON audit_logs      FOR INSERT WITH CHECK (true);
-- No UPDATE or DELETE on audit_logs — append-only
CREATE POLICY "allow_all_reviews"         ON manager_reviews FOR ALL USING (true) WITH CHECK (true);

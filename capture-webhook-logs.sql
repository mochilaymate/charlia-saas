-- Create table to capture webhook debugging info
CREATE TABLE IF NOT EXISTS webhook_debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now(),
  endpoint TEXT NOT NULL,
  body_text TEXT,
  body_hash TEXT,
  body_length INTEGER,
  headers JSONB,
  response_status INTEGER,
  error_message TEXT
);

-- Enable RLS but allow inserts from service role
ALTER TABLE webhook_debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role inserts" ON webhook_debug_logs
  FOR INSERT WITH CHECK (true);

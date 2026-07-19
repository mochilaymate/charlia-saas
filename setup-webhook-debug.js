#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

const supabase = createClient(supabaseUrl, serviceKey);

async function setup() {
  console.log("Setting up webhook_debug_logs table...\n");

  try {
    // Create the table using raw SQL
    const { error } = await supabase.rpc("exec", {
      sql: `
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

        ALTER TABLE webhook_debug_logs ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow service role inserts" ON webhook_debug_logs;

        CREATE POLICY "Allow service role inserts" ON webhook_debug_logs
          FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow service role selects" ON webhook_debug_logs;

        CREATE POLICY "Allow service role selects" ON webhook_debug_logs
          FOR SELECT WITH CHECK (true);
      `,
    });

    if (error) {
      console.log("Note: Table might already exist or exec RPC not available");
      console.log("Will try alternative method...\n");

      // Alternative: just try to insert to verify table exists
      const { error: insertErr } = await supabase
        .from("webhook_debug_logs")
        .insert({
          endpoint: "test",
          body_text: "test",
          body_hash: "test",
          body_length: 4,
        });

      if (insertErr?.code === "42P01") {
        // Table does not exist
        console.log("❌ Table does not exist. Please run this SQL in Supabase:");
        console.log(`
CREATE TABLE webhook_debug_logs (
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

ALTER TABLE webhook_debug_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role inserts" ON webhook_debug_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role selects" ON webhook_debug_logs FOR SELECT WITH CHECK (true);
        `);
      } else if (!insertErr) {
        console.log("✓ Table exists and is writable!");
        console.log("\nNow run the webhook test:");
        console.log("  node test-with-live-secret.js");
        console.log("\nThen check the logs:");
        console.log("  node check-webhook-logs.js");
      } else {
        console.error("Error:", insertErr.message);
      }
    } else {
      console.log("✓ Table created successfully!");
      console.log("\nNow run the webhook test:");
      console.log("  node test-with-live-secret.js");
      console.log("\nThen check the logs:");
      console.log("  node check-webhook-logs.js");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

setup();

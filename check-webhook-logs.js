#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

const supabase = createClient(supabaseUrl, serviceKey);

async function checkLogs() {
  console.log("Fetching webhook debug logs...\n");

  try {
    const { data, error } = await supabase
      .from("webhook_debug_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("❌ Error fetching logs:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("❌ No webhook logs found yet.");
      console.log("\nMake sure:");
      console.log("  1. The webhook_debug_logs table exists");
      console.log("  2. Vercel has deployed the latest code");
      console.log("  3. You've run the webhook test (e.g., node test-with-live-secret.js)");
      return;
    }

    console.log(`✓ Found ${data.length} webhook logs:\n`);

    data.forEach((log, i) => {
      console.log(`━━━ Log ${i + 1} ━━━`);
      console.log(`Time: ${log.created_at}`);
      console.log(`Endpoint: ${log.endpoint}`);
      console.log(`Body Length: ${log.body_length} bytes`);
      console.log(`Body Hash: ${log.body_hash}`);
      console.log(`Headers:`, JSON.stringify(log.headers, null, 2));
      if (log.body_text) {
        console.log(`Body Preview: ${log.body_text.substring(0, 100)}...`);
      }
      if (log.error_message) {
        console.log(`Error: ${log.error_message}`);
      }
      console.log("");
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkLogs();

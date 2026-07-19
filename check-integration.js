#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

const supabase = createClient(supabaseUrl, serviceKey);

async function check() {
  const wsid = "5f4f8d53-c1ff-41e9-b5f0-1ceec3261366";

  console.log("Checking YCloud integration for workspace:", wsid, "\n");

  try {
    // Check exact integration for this workspace
    const { data: integration, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("workspace_id", wsid)
      .eq("provider", "ycloud")
      .single();

    if (error) {
      console.log("❌ Error finding integration:", error.message);
      return;
    }

    if (!integration) {
      console.log("❌ No YCloud integration found for this workspace");
      return;
    }

    console.log("✓ Integration found:");
    console.log("  ID:", integration.id);
    console.log("  Workspace ID:", integration.workspace_id);
    console.log("  Provider:", integration.provider);
    console.log("  Enabled:", integration.enabled);
    console.log("  Credentials keys:", Object.keys(integration.credentials || {}));
    console.log("  Config:", integration.config);
    console.log("");

    // Check if webhook_signing_secret exists
    if (!integration.credentials?.webhook_signing_secret) {
      console.log("❌ webhook_signing_secret is EMPTY");
    } else {
      console.log("✓ webhook_signing_secret:", integration.credentials.webhook_signing_secret.substring(0, 20) + "...");
    }

    // Check if phone_number exists
    if (!integration.config?.phone_number) {
      console.log("❌ phone_number is EMPTY");
    } else {
      console.log("✓ phone_number:", integration.config.phone_number);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

check();

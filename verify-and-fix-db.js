#!/usr/bin/env node

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://gubcsmubxbpimoejlhgf.supabase.co";
const serviceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1YmNzbXVieGJwaW1vZWpsaGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY1MzgyMiwiZXhwIjoyMDk4MjI5ODIyfQ.sSoSdYGkl4ksv4qrwLk-LOdO9U7vQIIODeXpjXMWMo0";

const supabase = createClient(supabaseUrl, serviceKey);

async function verify() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("DATABASE VERIFICATION & FIX REPORT");
  console.log("════════════════════════════════════════════════════════════\n");

  try {
    // 1. Check if migrations table exists
    console.log("1. Checking applied migrations...\n");
    const { data: migrations, error: migError } = await supabase
      .from("schema_migrations")
      .select("name")
      .order("name");

    if (migError) {
      console.log("   ⚠️  schema_migrations table not found or query failed:");
      console.log("   " + migError.message);
      console.log(
        "   (This is OK - Supabase uses internal migration tracking)\n"
      );
    } else {
      console.log("   ✓ Applied migrations:");
      migrations.forEach((m) => console.log(`     - ${m.name}`));
      console.log();
    }

    // 2. Check critical tables
    console.log("2. Checking critical tables exist...\n");
    const tables = ["workspaces", "memberships", "users", "integrations"];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select().limit(0);
      if (error) {
        console.log(`   ✗ ${table}: ${error.message}`);
      } else {
        console.log(`   ✓ ${table}: exists`);
      }
    }
    console.log();

    // 3. Check if auth_workspace_ids() function exists
    console.log("3. Checking critical functions...\n");
    const { data: funcs, error: funcError } = await supabase.rpc(
      "auth_workspace_ids"
    );
    if (funcError && funcError.code === "42883") {
      console.log("   ✗ auth_workspace_ids() NOT FOUND");
      console.log("     → Migration 20260609 NOT applied\n");
    } else if (funcError && funcError.message.includes("search_path")) {
      console.log("   ✗ auth_workspace_ids() exists but has search_path bug");
      console.log("     → Migration 20260617 NOT applied\n");
    } else if (funcError) {
      console.log(`   ⚠️  auth_workspace_ids() error: ${funcError.message}\n`);
    } else {
      console.log("   ✓ auth_workspace_ids() works correctly\n");
    }

    // 4. Check super_admin user
    console.log("4. Checking super_admin user...\n");
    const { data: superAdmin, error: adminError } = await supabase
      .from("users")
      .select("email, is_super_admin")
      .eq("is_super_admin", true)
      .limit(1);

    if (adminError) {
      console.log(`   ✗ Error checking super_admin: ${adminError.message}\n`);
    } else if (!superAdmin || superAdmin.length === 0) {
      console.log("   ✗ NO SUPER_ADMIN USER FOUND\n");
    } else {
      console.log(`   ✓ Super admin: ${superAdmin[0].email}\n`);
    }

    // 5. Check YCloud integration
    console.log("5. Checking YCloud integration...\n");
    const { data: ycloud, error: ycloudError } = await supabase
      .from("integrations")
      .select("workspace_id, enabled, credentials, config")
      .eq("provider", "ycloud")
      .limit(1);

    if (ycloudError) {
      console.log(`   ✗ Error: ${ycloudError.message}\n`);
    } else if (!ycloud || ycloud.length === 0) {
      console.log("   ⚠️  NO YCLOUD INTEGRATION FOUND\n");
      console.log("   You need to create one via Settings > Canales (YCloud)\n");
    } else {
      const integration = ycloud[0];
      console.log(`   ✓ YCloud integration found`);
      console.log(`     - Enabled: ${integration.enabled}`);
      console.log(
        `     - Has secret: ${integration.credentials?.webhook_signing_secret ? "✓" : "✗"}`
      );
      console.log(
        `     - Has phone_number: ${integration.config?.phone_number ? `✓ (${integration.config.phone_number})` : "✗"}`
      );
      console.log();
    }

    // 6. Check workspaces
    console.log("6. Checking workspaces...\n");
    const { data: workspaces, error: wsError } = await supabase
      .from("workspaces")
      .select("id, name");

    if (wsError) {
      console.log(`   ✗ Error: ${wsError.message}\n`);
    } else {
      console.log(`   ✓ Found ${workspaces?.length || 0} workspaces`);
      workspaces?.slice(0, 3).forEach((ws) => {
        console.log(`     - ${ws.name} (${ws.id})`);
      });
      console.log();
    }

    // Summary
    console.log("════════════════════════════════════════════════════════════");
    console.log("ACTION ITEMS:");
    console.log("════════════════════════════════════════════════════════════");
    console.log(
      "If auth_workspace_ids() has search_path bug: no further action needed"
    );
    console.log(
      "If YCloud integration missing: create it via Settings > Canales"
    );
    console.log("If YCloud integration has empty secret: save it in Settings");
    console.log("If workspaces table empty: create workspace via Nuevo cliente");
    console.log("");
  } catch (err) {
    console.error("Fatal error:", err);
  }
}

verify();

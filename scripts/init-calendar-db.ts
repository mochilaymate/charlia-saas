#!/usr/bin/env node

/**
 * Initialize calendar tables in Supabase
 * Run: npx tsx scripts/init-calendar-db.ts
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_KEY_B64;

if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

const sql = `
-- 1. Add column to workspaces if not exists
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS client_can_modify_calendar BOOLEAN DEFAULT false;

-- 2. Calendar Integrations (Google Calendar OAuth tokens)
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  enabled BOOLEAN DEFAULT true,
  google_calendar_id TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMP WITH TIME ZONE,
  configured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  configured_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_workspace_id
  ON calendar_integrations(workspace_id);

-- 3. Service Durations
CREATE TABLE IF NOT EXISTS service_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_minutes_after INTEGER NOT NULL DEFAULT 15,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_service_durations_workspace_id
  ON service_durations(workspace_id);

-- 4. Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  google_event_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  contact_phone TEXT,
  contact_name TEXT,
  service_type TEXT,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id
  ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time
  ON calendar_events(workspace_id, start_time);

-- Enable RLS
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_integrations
DROP POLICY IF EXISTS "Super admin can manage calendar integrations" ON calendar_integrations;
CREATE POLICY "Super admin can manage calendar integrations"
  ON calendar_integrations FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM users WHERE is_super_admin = true));

-- Policies for service_durations
DROP POLICY IF EXISTS "Members can read service durations" ON service_durations;
DROP POLICY IF EXISTS "Admins can manage service durations" ON service_durations;
CREATE POLICY "Members can read service durations"
  ON service_durations FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM memberships
    WHERE workspace_id = service_durations.workspace_id AND is_active = true
  ));
CREATE POLICY "Admins can manage service durations"
  ON service_durations FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM memberships
    WHERE workspace_id = service_durations.workspace_id AND is_active = true AND role = 'admin'
  ));

-- Policies for calendar_events
DROP POLICY IF EXISTS "Members can read calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Admins can manage all calendar events" ON calendar_events;
CREATE POLICY "Members can read calendar events"
  ON calendar_events FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM memberships
    WHERE workspace_id = calendar_events.workspace_id AND is_active = true
  ));
CREATE POLICY "Admins can manage all calendar events"
  ON calendar_events FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM memberships
    WHERE workspace_id = calendar_events.workspace_id AND is_active = true AND role = 'admin'
  ));
`;

async function init() {
  try {
    console.log("Initializing calendar database tables...");

    const { error } = await supabase.rpc("execute_sql", {
      sql_string: sql,
    });

    if (error) {
      console.error("Error creating tables:", error);
      // Try with direct SQL execution
      for (const statement of sql.split(";").filter((s) => s.trim())) {
        const { error: stmtError } = await supabase.rpc("execute_sql", {
          sql_string: statement,
        });
        if (stmtError) {
          console.warn("Statement error:", stmtError);
        }
      }
    }

    console.log("✓ Calendar tables initialized successfully!");
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

init();

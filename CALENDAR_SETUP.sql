-- Calendar Integration Tables for WhatsApp SaaS

-- 1. Add column to workspaces if not exists
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS client_can_modify_calendar BOOLEAN DEFAULT false;

-- 2. Calendar Integrations (Google Calendar OAuth tokens)
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google', -- 'google', 'outlook', etc
  enabled BOOLEAN DEFAULT true,

  -- Google Calendar specific
  google_calendar_id TEXT, -- The calendar ID (email format usually)
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMP WITH TIME ZONE,

  -- Metadata
  configured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  configured_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_workspace_id
  ON calendar_integrations(workspace_id);

-- 3. Service Durations (Configure time for each service type)
CREATE TABLE IF NOT EXISTS service_durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL, -- e.g., "Consulta", "Corte", "Masaje"
  duration_minutes INTEGER NOT NULL DEFAULT 30, -- Duration of the service
  buffer_minutes_after INTEGER NOT NULL DEFAULT 15, -- Gap before next appointment
  color TEXT DEFAULT '#3B82F6', -- Color for calendar display

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(workspace_id, service_name)
);

CREATE INDEX IF NOT EXISTS idx_service_durations_workspace_id
  ON service_durations(workspace_id);

-- 4. Calendar Events (Local cache of Google Calendar events)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  google_event_id TEXT, -- External ID from Google Calendar

  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Booking details
  contact_phone TEXT,
  contact_name TEXT,
  service_type TEXT, -- References service_durations.service_name

  -- Status
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'tentative'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_id
  ON calendar_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time
  ON calendar_events(workspace_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id
  ON calendar_events(google_event_id);

-- RLS Policies for calendar_integrations
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage calendar integrations"
  ON calendar_integrations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM users WHERE is_super_admin = true)
  );

-- RLS Policies for service_durations
ALTER TABLE service_durations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read service durations"
  ON service_durations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships
      WHERE workspace_id = service_durations.workspace_id AND is_active = true
    )
  );

CREATE POLICY "Admins can manage service durations"
  ON service_durations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships
      WHERE workspace_id = service_durations.workspace_id
        AND is_active = true
        AND role = 'admin'
    )
  );

-- RLS Policies for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships
      WHERE workspace_id = calendar_events.workspace_id AND is_active = true
    )
  );

CREATE POLICY "Admins can manage all calendar events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM memberships
      WHERE workspace_id = calendar_events.workspace_id
        AND is_active = true
        AND role = 'admin'
    )
  );

-- Service role bypass for agents
-- Events can be created via API by authenticated service endpoints

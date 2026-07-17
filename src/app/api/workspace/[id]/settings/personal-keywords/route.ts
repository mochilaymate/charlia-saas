import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  getPersonalKeywords,
  updatePersonalKeywords,
} from "@/features/inbox/services/personal-contact-detector";

const KeywordsSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  // Verify membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  try {
    const keywords = await getPersonalKeywords(workspaceId);
    return NextResponse.json({ keywords });
  } catch (err) {
    console.error("[personal-keywords] GET error:", err);
    return NextResponse.json(
      { error: "Error al obtener palabras clave" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: workspaceId } = await params;

  // Verify admin role
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membership?.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const parsed = KeywordsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    // Normalizar palabras clave (minúsculas, sin espacios extra)
    const normalized = parsed.data.keywords.map((k) => k.trim().toLowerCase());
    await updatePersonalKeywords(workspaceId, normalized);

    return NextResponse.json({
      ok: true,
      keywords: normalized,
      message: "Palabras clave actualizadas",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al actualizar";
    console.error("[personal-keywords] PATCH error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

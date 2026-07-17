import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { markContactType } from "@/features/inbox/services/personal-contact-detector";

const MarkContactSchema = z.object({
  type: z.enum(["personal", "business", "unknown"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: workspaceId, contactId } = await params;

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

  const parsed = MarkContactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    await markContactType(contactId, parsed.data.type);
    return NextResponse.json({
      ok: true,
      message: `Contacto marcado como ${parsed.data.type}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al actualizar contacto";
    console.error("[contacts] PATCH error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

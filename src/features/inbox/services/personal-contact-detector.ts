import { svc } from "@/lib/supabase-svc";

/**
 * Detecta si un mensaje parece ser de un contacto personal basado en palabras clave
 */
export async function detectPersonalMessage(
  workspaceId: string,
  messageText: string,
): Promise<boolean> {
  if (!messageText || messageText.trim().length === 0) {
    return false;
  }

  const db = svc();

  // Obtener palabras clave personalizadas del negocio
  const { data: biRow } = await db
    .from("business_info")
    .select("personal_keywords")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const keywords = (biRow?.personal_keywords as string[] | null) ?? [];

  // Palabras clave por defecto si no hay configuradas
  const defaultKeywords = [
    "amor",
    "mamá",
    "papá",
    "hermano",
    "hermana",
    "tía",
    "tío",
    "abuelo",
    "abuela",
    "novio",
    "novia",
    "esposo",
    "esposa",
    "amigo",
    "bebé",
    "hijo",
    "hija",
    "te extraño",
    "te quiero",
    "te amo",
  ];

  const allKeywords = keywords.length > 0 ? keywords : defaultKeywords;

  // Normalizar el mensaje: minúsculas y sin acentos
  const normalizedText = messageText
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  // Verificar si alguna palabra clave está en el mensaje
  for (const keyword of allKeywords) {
    const normalizedKeyword = keyword
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

    // Buscar la palabra como palabra completa (con límites de palabra)
    const regex = new RegExp(`\\b${normalizedKeyword}\\b`, "i");
    if (regex.test(normalizedText)) {
      return true;
    }
  }

  return false;
}

/**
 * Marca un contacto como personal o negocio
 */
export async function markContactType(
  contactId: string,
  type: "personal" | "business" | "unknown",
): Promise<void> {
  const db = svc();

  const { error } = await db
    .from("contacts")
    .update({ contact_type: type })
    .eq("id", contactId);

  if (error) {
    throw new Error(`Failed to update contact type: ${error.message}`);
  }
}

/**
 * Obtiene el tipo de contacto
 */
export async function getContactType(
  contactId: string,
): Promise<"personal" | "business" | "unknown"> {
  const db = svc();

  const { data, error } = await db
    .from("contacts")
    .select("contact_type")
    .eq("id", contactId)
    .single();

  if (error || !data) {
    return "unknown";
  }

  return (data.contact_type as "personal" | "business" | "unknown") || "unknown";
}

/**
 * Determina si se debe responder automáticamente basado en tipo de contacto y detección
 */
export async function shouldAutoRespond(
  workspaceId: string,
  contactId: string,
  messageText: string,
): Promise<{
  shouldRespond: boolean;
  reason?: string;
  isPersonal: boolean;
}> {
  // Obtener tipo de contacto
  const contactType = await getContactType(contactId);

  // Si está explícitamente marcado como personal, no responder
  if (contactType === "personal") {
    return {
      shouldRespond: false,
      reason: "Contact marked as personal",
      isPersonal: true,
    };
  }

  // Si está marcado como business, siempre responder
  if (contactType === "business") {
    return {
      shouldRespond: true,
      isPersonal: false,
    };
  }

  // Si es unknown, usar detección automática
  const isPersonal = await detectPersonalMessage(workspaceId, messageText);

  if (isPersonal) {
    return {
      shouldRespond: false,
      reason: "Auto-detected personal message",
      isPersonal: true,
    };
  }

  return {
    shouldRespond: true,
    isPersonal: false,
  };
}

/**
 * Obtener o actualizar palabras clave personales para un workspace
 */
export async function getPersonalKeywords(
  workspaceId: string,
): Promise<string[]> {
  const db = svc();

  const { data } = await db
    .from("business_info")
    .select("personal_keywords")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data?.personal_keywords as string[] | null) ?? [];
}

export async function updatePersonalKeywords(
  workspaceId: string,
  keywords: string[],
): Promise<void> {
  const db = svc();

  const { error } = await db
    .from("business_info")
    .update({ personal_keywords: keywords })
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(`Failed to update keywords: ${error.message}`);
  }
}

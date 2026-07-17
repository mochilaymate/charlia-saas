"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Users, HelpCircle } from "lucide-react";

interface ContactTypeSelectorProps {
  workspaceId: string;
  contactId: string;
  contactType: "personal" | "business" | "unknown";
  onTypeChange?: (type: "personal" | "business" | "unknown") => void;
}

export function ContactTypeSelector({
  workspaceId,
  contactId,
  contactType,
  onTypeChange,
}: ContactTypeSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkAs = async (type: "personal" | "business" | "unknown") => {
    if (type === contactType) return; // No change

    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/contacts/${contactId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        },
      );

      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al actualizar");
        return;
      }

      toast.success(data.message ?? "Contacto actualizado");
      onTypeChange?.(type);
    } catch (err) {
      console.error("Error marking contact:", err);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    switch (contactType) {
      case "personal":
        return <User className="w-4 h-4" />;
      case "business":
        return <Users className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (contactType) {
      case "personal":
        return "Personal";
      case "business":
        return "Negocio";
      default:
        return "Sin clasificar";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {getIcon()}
          <span className="ml-2">{getLabel()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tipo de contacto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleMarkAs("business")}
          disabled={loading || contactType === "business"}
        >
          <Users className="w-4 h-4 mr-2" />
          <span>Negocio</span>
          {contactType === "business" && <span className="ml-2">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleMarkAs("personal")}
          disabled={loading || contactType === "personal"}
        >
          <User className="w-4 h-4 mr-2" />
          <span>Personal (No responder)</span>
          {contactType === "personal" && <span className="ml-2">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleMarkAs("unknown")}
          disabled={loading || contactType === "unknown"}
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          <span>Sin clasificar</span>
          {contactType === "unknown" && <span className="ml-2">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

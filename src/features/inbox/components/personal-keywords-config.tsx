"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

interface PersonalKeywordsConfigProps {
  workspaceId: string;
}

export function PersonalKeywordsConfig({ workspaceId }: PersonalKeywordsConfigProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKeywords();
  }, []);

  async function fetchKeywords() {
    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/settings/personal-keywords`,
      );
      const data = (await res.json()) as { keywords: string[] };
      setKeywords(data.keywords || []);
    } catch (err) {
      console.error("Error fetching keywords:", err);
      toast.error("Error al cargar palabras clave");
    }
  }

  async function saveKeywords(updatedKeywords: string[]) {
    if (updatedKeywords.length === 0) {
      toast.error("Debes tener al menos una palabra clave");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspace/${workspaceId}/settings/personal-keywords`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: updatedKeywords }),
        },
      );

      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }

      toast.success(data.message ?? "Palabras clave actualizadas");
      setKeywords(updatedKeywords);
    } catch (err) {
      console.error("Error saving keywords:", err);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed) return;

    if (keywords.includes(trimmed)) {
      toast.error("Esta palabra ya existe");
      return;
    }

    const updated = [...keywords, trimmed];
    saveKeywords(updated);
    setNewKeyword("");
  };

  const handleRemoveKeyword = (keyword: string) => {
    const updated = keywords.filter((k) => k !== keyword);
    saveKeywords(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Palabras Clave Personales</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          La IA no responderá automáticamente si detecta estas palabras en los mensajes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-keyword">Agregar palabra clave</Label>
          <div className="flex gap-2">
            <Input
              id="new-keyword"
              placeholder="Ej: amor, mamá, hermano..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddKeyword();
                }
              }}
              disabled={loading}
            />
            <Button onClick={handleAddKeyword} disabled={loading || !newKeyword.trim()}>
              Agregar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Palabras clave activas ({keywords.length})</Label>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <div
                key={keyword}
                className="flex items-center gap-2 bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-sm"
              >
                <span>{keyword}</span>
                <button
                  onClick={() => handleRemoveKeyword(keyword)}
                  disabled={loading}
                  className="hover:text-blue-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 La detección no es sensible a mayúsculas/minúsculas ni acentos. Busca palabras
          completas, no parciales.
        </p>
      </CardContent>
    </Card>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_REMINDERS_PER_DAY,
  normalizeRemindersPerDay,
  readPushPreference,
  writePushPreference,
  type RemindersPerDay,
} from "@/lib/mobile/push-preferences";

/**
 * Preferência de lembretes repetidos por usuário.
 *
 * O valor vive no banco (`push_preferences`), então:
 *  - acompanha o usuário em todos os aparelhos;
 *  - o agendador do servidor consegue ler mesmo com o app fechado;
 *  - o Realtime mantém a tela em dia quando a opção muda em outro aparelho.
 */

export interface PushPreferencesValue {
  value: RemindersPerDay;
  /** false enquanto a tabela não existe no projeto (migration pendente). */
  available: boolean;
  saving: boolean;
  choose: (value: RemindersPerDay) => Promise<void>;
}

export function usePushPreferences(): PushPreferencesValue {
  const { user } = useAuth();
  const [value, setValue] = useState<RemindersPerDay>(DEFAULT_REMINDERS_PER_DAY);
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void readPushPreference(userId).then((state) => {
      if (!alive) return;
      setValue(state.value);
      setAvailable(state.available);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  // Sincronização entre aparelhos (Realtime na própria linha do usuário).
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`push-preferences:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "push_preferences",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = (payload.new as { reminders_per_day?: number } | undefined)
            ?.reminders_per_day;
          if (next === undefined) return;
          setValue(normalizeRemindersPerDay(next));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const choose = useCallback(
    async (next: RemindersPerDay) => {
      if (!userId || next === value) return;
      const previous = value;
      setValue(next);
      setSaving(true);
      const result = await writePushPreference(userId, next);
      setSaving(false);
      if (!result.ok) {
        setValue(previous);
        toast.error("Não foi possível salvar a preferência de lembretes.");
        return;
      }
      toast.success(next === 0 ? "Lembretes desativados." : `Lembretes por dia: ${next}.`);
    },
    [userId, value],
  );

  return useMemo(
    () => ({ value, available, saving, choose }),
    [value, available, saving, choose],
  );
}

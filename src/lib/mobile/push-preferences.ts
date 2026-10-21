import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Preferência individual de lembretes repetidos ("quantos lembretes recebo
 * por dia para cada aviso que continua pendente").
 *
 * A preferência fica no BANCO (tabela `push_preferences`), não no aparelho:
 * assim ela acompanha o usuário em todos os dispositivos e o agendador do
 * servidor consegue lê-la mesmo com o app fechado.
 *
 * A tabela é criada no projeto do CRM (ver
 * docs/proposals/push-lembretes-proposta-sql.sql) e não faz parte de types.ts,
 * que é cópia verbatim do CRM — por isso o cliente é tipado localmente aqui.
 */

export const REMINDERS_PER_DAY_OPTIONS = [0, 1, 2, 3] as const;

export type RemindersPerDay = (typeof REMINDERS_PER_DAY_OPTIONS)[number];

/** Padrão: nenhum lembrete repetido até o usuário escolher. */
export const DEFAULT_REMINDERS_PER_DAY: RemindersPerDay = 0;

/** Converte qualquer valor vindo do banco/rede em uma opção válida. Pura. */
export function normalizeRemindersPerDay(value: unknown): RemindersPerDay {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_REMINDERS_PER_DAY;
  const truncated = Math.trunc(numeric);
  return (REMINDERS_PER_DAY_OPTIONS as readonly number[]).includes(truncated)
    ? (truncated as RemindersPerDay)
    : DEFAULT_REMINDERS_PER_DAY;
}

/** Rótulo curto da opção (usado nos botões). Pura. */
export function remindersPerDayLabel(value: RemindersPerDay): string {
  return String(value);
}

/** Texto explicativo da opção escolhida. Pura. */
export function remindersPerDayDescription(value: RemindersPerDay): string {
  switch (value) {
    case 0:
      return "Você recebe apenas o aviso original, uma vez.";
    case 1:
      return "1 lembrete por dia enquanto o aviso estiver pendente.";
    case 2:
      return "2 lembretes por dia enquanto o aviso estiver pendente.";
    case 3:
      return "3 lembretes por dia enquanto o aviso estiver pendente.";
    default:
      return "";
  }
}

type PushPreferencesRow = {
  user_id: string;
  reminders_per_day: number;
  updated_at: string;
};

type PushPreferencesInsert = {
  user_id: string;
  reminders_per_day: number;
  updated_at: string;
};

type PushPreferencesDatabase = {
  public: {
    Tables: {
      push_preferences: {
        Row: PushPreferencesRow;
        Insert: PushPreferencesInsert;
        Update: Partial<PushPreferencesInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const prefsDb = supabase as unknown as SupabaseClient<PushPreferencesDatabase>;

export interface PushPreferenceState {
  value: RemindersPerDay;
  /**
   * false quando a tabela ainda não existe no projeto (migration pendente).
   * O app continua funcionando: mostra 0 e desabilita a escolha.
   */
  available: boolean;
}

/** Lê a preferência do usuário. Nunca lança. */
export async function readPushPreference(userId: string): Promise<PushPreferenceState> {
  if (!userId) return { value: DEFAULT_REMINDERS_PER_DAY, available: false };

  const { data, error } = await prefsDb
    .from("push_preferences")
    .select("user_id, reminders_per_day, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { value: DEFAULT_REMINDERS_PER_DAY, available: false };

  const row = data as PushPreferencesRow | null;
  return {
    value: normalizeRemindersPerDay(row?.reminders_per_day ?? 0),
    available: true,
  };
}

/** Grava a preferência do usuário (upsert). Nunca lança. */
export async function writePushPreference(
  userId: string,
  value: RemindersPerDay,
): Promise<{ ok: boolean; value: RemindersPerDay; message?: string }> {
  if (!userId) {
    return { ok: false, value: DEFAULT_REMINDERS_PER_DAY, message: "Usuário não identificado." };
  }

  const reminders_per_day = normalizeRemindersPerDay(value);
  const { error } = await prefsDb
    .from("push_preferences")
    .upsert(
      {
        user_id: userId,
        reminders_per_day,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return { ok: false, value: DEFAULT_REMINDERS_PER_DAY, message: error.message };
  }
  return { ok: true, value: reminders_per_day };
}

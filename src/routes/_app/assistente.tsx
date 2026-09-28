import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bot,
  BrainCircuit,
  CalendarDays,
  MessageSquareText,
  Search,
  Send,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import { MobileCard } from "@/components/mobile/ui";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/assistente")({
  component: AssistentePage,
});

type Role = "assistant" | "user";

interface AssistantAction {
  label: string;
  to: string;
  search?: Record<string, unknown>;
  params?: Record<string, string>;
}

interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  actions?: AssistantAction[];
}

const SUGGESTIONS = [
  "O que precisa de atenção?",
  "Serviços atrasados",
  "Previsão de serviços",
  "Caminhões na oficina",
  "Agenda de hoje",
  "Explique o sistema",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function AssistentePage() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Sou a Assistente V. Posso consultar garagem, serviços, previsões, agenda e localizar caminhões ou clientes sem expor dados financeiros.",
      actions: [
        { label: "Ver garagem", to: "/garagem" },
        { label: "Ver serviços", to: "/servicos" },
      ],
    },
  ]);

  const ask = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    setBusy(true);
    setMessages((current) => [...current, { id: makeId(), role: "user", text: value }]);

    try {
      const history = messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.text,
      }));
      const { data, error } = await supabase.functions.invoke<{
        answer?: string;
        actions?: AssistantAction[];
        error?: string;
        missingSecrets?: string[];
      }>("assistant-v", {
        body: { question: value, history },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        const missing = data.missingSecrets?.length ? `\nSecrets pendentes: ${data.missingSecrets.join(", ")}.` : "";
        throw new Error(`${data.error}${missing}`);
      }

      const answer: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: data?.answer || "A Assistente V não retornou resposta.",
        actions: data?.actions ?? [],
      };

      setMessages((current) => [...current, answer]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: error instanceof Error ? `Não consegui consultar agora: ${error.message}` : "Não consegui consultar agora.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <MobileCard className="relative overflow-hidden border-0 bg-[radial-gradient(circle_at_top_right,rgba(244,180,0,0.25),transparent_34%),linear-gradient(135deg,#08090c,#171717_48%,#2a210b)] p-4 text-white shadow-xl">
        <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <BrainCircuit className="h-6 w-6 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Assistente V
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Central inteligente</h1>
            <p className="mt-1 text-[13px] leading-snug text-white/65">
              Consulta operacional rápida, limpa e segura para frota, serviços e agenda.
            </p>
          </div>
        </div>
      </MobileCard>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-2 text-[12px] font-bold text-muted-foreground active:bg-muted/60"
          >
            <Zap className="h-3.5 w-3.5 text-gold" /> {s}
          </button>
        ))}
      </div>

      <MobileCard className="min-h-[380px] overflow-hidden border-gold/20 bg-card/95">
        <div className="space-y-3 p-3">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" ? (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                  <Bot className="h-4 w-4" />
                </div>
              ) : null}
              <div className={cn("max-w-[82%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed", m.role === "user" ? "bg-gold text-gold-foreground" : "bg-muted/70 text-foreground")}>
                <div className="whitespace-pre-line">{m.text}</div>
                {m.actions?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map((a) => (
                      <Link
                        key={`${a.label}-${a.to}`}
                        to={a.to as never}
                        search={a.search as never}
                        params={a.params as never}
                        className="rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold text-gold-dark ring-1 ring-border"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                <MessageSquareText className="h-4 w-4 animate-pulse" />
              </span>
              analisando operação...
            </div>
          ) : null}
        </div>
      </MobileCard>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(input);
        }}
        className="sticky bottom-[calc(74px+env(safe-area-inset-bottom))] z-30 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-gold-dark">
            <Search className="h-4 w-4" />
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre frota, serviços, agenda..."
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
            enterKeyHint="send"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold text-gold-foreground disabled:opacity-40"
            aria-label="Enviar pergunta"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-muted-foreground">
        <div className="rounded-xl border bg-card p-2"><Truck className="mx-auto mb-1 h-4 w-4 text-gold" />Frota</div>
        <div className="rounded-xl border bg-card p-2"><Wrench className="mx-auto mb-1 h-4 w-4 text-gold" />Serviços</div>
        <div className="rounded-xl border bg-card p-2"><CalendarDays className="mx-auto mb-1 h-4 w-4 text-gold" />Agenda</div>
      </div>
    </div>
  );
}

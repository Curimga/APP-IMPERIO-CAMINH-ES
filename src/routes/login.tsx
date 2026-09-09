import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandWordmark } from "@/components/brand";
import { ShieldCheck, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import bg from "@/assets/login-bg.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      nav({ to: "/" });
    } catch (err: any) {
      const msg = err?.message ?? "Falha no login";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos" : msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!email) return toast.error("Informe seu e-mail");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });
    if (error) toast.error(error.message);
    else toast.success("E-mail de recuperação enviado");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* HERO */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(6,8,14,0.92) 0%, rgba(8,10,18,0.78) 45%, rgba(8,10,18,0.55) 75%, rgba(6,8,14,0.85) 100%), url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
        }}
      >
        {/* gold ambient glow */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-gold/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-gold/10 blur-[100px]" />
        {/* faint grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--sidebar-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--sidebar-foreground) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 30% 40%, black 30%, transparent 75%)",
          }}
        />

        {/* TOP — header */}
        <header className="relative z-10 flex items-center justify-between">
          <BrandWordmark height={56} />
          <div className="hidden xl:flex items-center gap-2 rounded-full border border-gold/30 bg-black/30 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-gold/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            CRM Premium · v2026
          </div>
        </header>

        {/* CENTER — hero copy */}
        <div className="relative z-10 max-w-xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/70 backdrop-blur">
            <Sparkles className="h-3 w-3 text-gold" />
            Plataforma corporativa de gestão
          </div>
          <h1 className="text-4xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
            <span className="text-sidebar-foreground">O império da sua </span>
            <span className="bg-gradient-to-r from-[oklch(0.92_0.16_92)] via-gold to-[oklch(0.7_0.14_75)] bg-clip-text text-transparent">
              gestão começa aqui.
            </span>
          </h1>
          <p className="text-base xl:text-lg text-sidebar-foreground/70 max-w-lg leading-relaxed">
            Estoque, funil, financeiro, frota e equipe — todos os setores da sua revenda
            sincronizados em uma única plataforma de inteligência operacional.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4 max-w-lg">
            {[
              { k: "+120", l: "Caminhões" },
              { k: "98%", l: "Conversão" },
              { k: "24/7", l: "Tempo real" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-xl border border-sidebar-border/60 bg-black/30 px-4 py-3 backdrop-blur"
              >
                <div className="text-2xl font-semibold text-gold">{s.k}</div>
                <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM — trust row */}
        <footer className="relative z-10 flex items-center gap-6 text-xs text-sidebar-foreground/55">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold/80" /> Criptografia ponta-a-ponta</div>
          <div className="hidden xl:flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gold/80" /> Dados em tempo real</div>
          <div className="ml-auto">© {new Date().getFullYear()} Império Caminhões</div>
        </footer>
      </div>

      {/* FORM */}
      <div className="relative flex items-center justify-center p-6 sm:p-10 bg-sidebar">
        {/* mobile brand */}
        <div className="absolute top-6 left-6 lg:hidden">
          <BrandWordmark height={44} />
        </div>

        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Acessar painel</h2>
            <p className="text-sm text-sidebar-foreground/60">
              Bem-vindo de volta. Use suas credenciais corporativas.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-sidebar-foreground/70">E-mail</Label>
            <Input
              id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@imperiocaminhoes.com"
              className="bg-sidebar-accent/60 border-sidebar-border focus-visible:ring-gold h-11"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-sidebar-foreground/70">Senha</Label>
              <button type="button" onClick={reset} className="text-xs text-gold hover:underline">
                Esqueci minha senha
              </button>
            </div>
            <Input
              id="password" type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-sidebar-accent/60 border-sidebar-border focus-visible:ring-gold h-11"
            />
          </div>

          <Button
            type="submit" disabled={loading}
            className="group w-full h-11 bg-gold text-gold-foreground hover:opacity-90 font-semibold shadow-premium"
          >
            {loading ? "Entrando..." : (
              <span className="inline-flex items-center gap-2">
                Entrar no painel
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>

          <div className="flex items-center gap-3 text-xs text-sidebar-foreground/40">
            <div className="h-px flex-1 bg-sidebar-border" />
            <span>ou</span>
            <div className="h-px flex-1 bg-sidebar-border" />
          </div>

          <p className="text-center text-sm text-sidebar-foreground/60">
            Não tem conta?{" "}
            <Link to="/cadastro" className="text-gold hover:underline font-medium">
              Solicitar acesso
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BrandWordmark } from "@/components/brand";

export const Route = createFileRoute("/cadastro")({
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin + "/login",
        },
      });
      if (error) throw error;
      // Try auto-login (works because auto-confirm is enabled)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        toast.success("Cadastro realizado! Faça login para continuar.");
        nav({ to: "/login" });
      } else {
        toast.success("Cadastro realizado com sucesso!");
        nav({ to: "/" });
      }
    } catch (err: any) {
      const msg = err?.message ?? "Falha no cadastro";
      toast.error(msg.includes("already registered") ? "E-mail já cadastrado" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-sidebar text-sidebar-foreground p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="mb-2"><BrandWordmark /></div>
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        <p className="text-sm text-sidebar-foreground/60">Cadastro rápido e simples. Acesso liberado pelo administrador.</p>

        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="bg-sidebar-accent border-sidebar-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-sidebar-accent border-sidebar-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-sidebar-accent border-sidebar-border" placeholder="Mínimo 6 caracteres" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input id="confirm" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-sidebar-accent border-sidebar-border" placeholder="Repita a senha" />
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-gold text-gold-foreground hover:opacity-90 font-semibold">
          {loading ? "Enviando..." : "Cadastrar"}
        </Button>

        <p className="text-center text-sm text-sidebar-foreground/60">
          Já tem conta?{" "}
          <Link to="/login" className="text-gold hover:underline">Entrar</Link>
        </p>
      </form>
    </div>
  );
}

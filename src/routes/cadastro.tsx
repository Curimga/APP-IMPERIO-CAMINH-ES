import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandWordmark } from "@/components/brand";
import { ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/cadastro")({
  component: RequestAccessPage,
});

function RequestAccessPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-sidebar text-sidebar-foreground p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mb-2 flex justify-center"><BrandWordmark /></div>
        <h1 className="text-2xl font-semibold">Acesso restrito</h1>
        <p className="text-sm text-sidebar-foreground/60 leading-relaxed">
          O cadastro de novos usuários é feito pelo administrador no CRM da
          Império. Contas não são criadas pelo aplicativo.
        </p>
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-4 py-4 text-left text-[13px] text-sidebar-foreground/70">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              Entre com o mesmo e-mail e senha que você usa no CRM. Se ainda não
              tem acesso, solicite ao Executivo a criação do seu usuário.
            </span>
          </div>
        </div>
        <Link
          to="/login"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-semibold text-gold-foreground hover:opacity-90"
        >
          Voltar ao login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
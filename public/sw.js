/*
 * Service Worker â€” ImpÃ©rio CaminhÃµes PWA
 *
 * EstratÃ©gia de cache SEGURA (requisitos do projeto):
 *  - Cacheia SOMENTE a estrutura do app (nÃºcleo "/" document shell + assets versionados).
 *  - NUNCA cacheia respostas do Supabase (URLs com "supabase"), Storage privado,
 *    rotas de auth, dados financeiros/clientes/documentos.
 *  - Nenhum token Ã© gravado no cache.
 *  - Quando offline, responde com a pÃ¡gina offline prÃ³pria (#/offline Ã© evitado;
 *    usamos um payload HTML inline para nÃ£o rotear pelo app).
 */
const CACHE_PREFIX = "imperio-";
const VERSION = "imperio-v7-2026.09.23-realtime-sync";
const APP_SHELL = "/";
const OFFLINE_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Sem conexÃ£o â€” ImpÃ©rio CaminhÃµes</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0B0B0B;color:#fff;font-family:Inter,system-ui,-apple-system,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;padding:24px}
  .box{text-align:center;max-width:340px}
  .dot{width:64px;height:64px;border-radius:18px;background:#F4B400;color:#0B0B0B;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-weight:800;font-size:22px}
  h1{font-size:20px;margin-bottom:10px}
  p{font-size:14px;color:#B6B7C0;line-height:1.55}
  .ok{margin-top:24px;display:inline-block;padding:12px 24px;background:#F5C400;color:#0B0B0B;border:0;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none}
</style>
</head>
<body>
  <div class="box">
    <div class="dot">IMP</div>
    <h1>Você está sem conexão</h1>
    <p>Para consultar ou salvar dados é necessário estar conectado à internet. Verifique sua rede e tente novamente.</p>
    <button class="ok" onclick="location.reload()">Tentar novamente</button>
  </div>
</body>
</html>`;

const FILTER_IMPORTANT = (req) =>
  req.mode === "navigate" ||
  (new URL(req.url).pathname.startsWith("/icons/") && req.method === "GET") ||
  req.url.includes("manifest.webmanifest");

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(["/", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable.png", "/icons/apple-touch-icon.png", "/manifest.webmanifest"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // 1. NUNCA interceptar chamadas de dados (Supabase REST/Realtime/Storage) nem auth.
  if (
    url.origin.includes("supabase") ||
    req.url.includes("/auth/v1/") ||
    req.url.includes("/rest/v1/") ||
    req.url.includes("/storage/v1/") ||
    req.method !== "GET" ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // 2. NavegaÃ§Ã£o (app shell): network-first, fallback para cache do shell e offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(APP_SHELL, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(APP_SHELL);
          if (cached) return cached;
          return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        })
    );
    return;
  }

  // 3. Assets estÃ¡ticos (JS/CSS versionados, Ã­cones, fontes): stale-while-revalidate.
  if (FILTER_IMPORTANT(req)) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});

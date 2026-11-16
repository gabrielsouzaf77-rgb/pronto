/*
  Service worker do Pronto: o app abre na hora e segue funcionando com a internet ruim do plantão.

  - Página: rede primeiro (pega sempre a versão nova); sem rede, a última que abriu.
  - CSS, JS, fontes, marca e a biblioteca do Supabase: do cache (os arquivos do app têm ?v= da versão).
  - Supabase (conta, dados, uso grátis): nunca passa pelo cache.
  VERSAO é trocada pelo ferramentas/versionar.py a cada publicação; o cache antigo é apagado.
*/
const VERSAO = '202611161848';
const CACHE = `pronto-${VERSAO}`;
const BASE = ['./', 'app.html', 'manifest.webmanifest', 'marca/favicon.svg', 'marca/pronto-logo.svg', 'assets/fontes/outfit-600.woff2'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('pronto-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;

  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then((r) => {
          // Guarda a última versão de cada página (vitrine e sistema) para abrir sem rede.
          if (r.ok && url.origin === self.location.origin) {
            const copia = r.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copia));
          }
          return r;
        })
        .catch(async () => (await caches.match(url.pathname, { ignoreSearch: true }))
          || (await caches.match('app.html', { ignoreSearch: true }))
          || caches.match('./')),
    );
    return;
  }

  const daqui = url.origin === self.location.origin;
  const cdn = url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com';
  if (!daqui && !cdn) return;
  ev.respondWith(
    caches.match(req).then((guardado) => guardado || fetch(req).then((r) => {
      if (r.ok) {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
      }
      return r;
    })),
  );
});

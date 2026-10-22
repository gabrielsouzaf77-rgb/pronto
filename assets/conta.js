/*
  Conta do médico: entrada com e-mail e senha, dados sincronizados e uso grátis/assinatura.

  - Login e banco no Supabase (projeto "pronto"). A regra de uso mora no servidor, na função
    consumir(): 10 atendimentos de boas-vindas, depois 1 por dia; assinatura libera tudo.
  - Os dados do médico (perfil, locais, modelos, diagnósticos...) continuam no navegador, como
    sempre, e cada gravação também sobe para a conta. Ao entrar em outro aparelho, eles descem.
  - Paciente nunca sobe: não está em nenhuma das chaves sincronizadas.
  - Demonstração (?demo) e o link de teste do Claude (RX_SEM_CONTA) funcionam sem conta.
*/
(function () {
  'use strict';

  const P = window.Pronto;
  const tour = () => window.ProntoTour;
  if (!P) return;
  if (P.demo || window.RX_SEM_CONTA) {
    if (tour()) tour().talvezIniciar();
    return;
  }

  const SUPABASE = {
    url: 'https://ukuzyoutntepdullrpzq.supabase.co',
    chave: 'sb_publishable_iFMLgzbr4OqmgEyZBPX_kA_APGDhkRp',
    biblioteca: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  };
  const PRECO = 'R$ 49,90';
  const GERENCIAR_MP = 'https://www.mercadopago.com.br/subscriptions';
  const SINCRONIZADAS = ['perfil', 'padroes', 'modelos', 'uso', 'metricas', 'locais', 'localAtual', 'diagnosticos', 'tourVisto'];
  const CHAVE_SESSAO = `sb-${new URL(SUPABASE.url).hostname.split('.')[0]}-auth-token`;

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lerLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  let sb = null;
  let usuario = null;
  let situacao = null;
  const liberados = new Set(); // atendimentos que já saíram nesta aba

  /* ---------------------------------------------------------------- */
  /* Tela de entrada                                                   */
  /* ---------------------------------------------------------------- */

  function montarEntrada() {
    document.body.classList.add('sem-conta');
    document.body.insertAdjacentHTML('beforeend', `
      <div class="entrada" id="entrada" role="dialog" aria-modal="true" aria-labelledby="entradaTitulo">
        <div class="entrada__cartao">
          <img class="entrada__marca" src="marca/pronto-logo.svg" alt="pronto." width="96" height="32">
          <h1 class="entrada__titulo" id="entradaTitulo">Entre para usar o Pronto</h1>
          <p class="entrada__sub">10 atendimentos grátis para começar e, depois, 1 por dia. Sem limite por ${PRECO} por mês.</p>
          <div class="entrada__abas" role="tablist" aria-label="Entrar ou criar conta">
            <button type="button" role="tab" aria-selected="true" data-modo="entrar">Entrar</button>
            <button type="button" role="tab" aria-selected="false" data-modo="criar">Criar conta</button>
          </div>
          <form class="entrada__form" id="formEntrada" novalidate>
            <label class="cmp cmp--full"><span>E-mail</span><input name="email" type="email" autocomplete="email" inputmode="email" required></label>
            <label class="cmp cmp--full"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" minlength="8" required></label>
            <label class="entrada__aceite" hidden><input name="aceite" type="checkbox"> <span>Li e aceito os <a href="termos.html" target="_blank" rel="noopener">Termos de uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.</span></label>
            <p class="entrada__erro" id="entradaErro" role="alert"></p>
            <button class="btn btn--primario entrada__botao" type="submit">Entrar</button>
          </form>
          <p class="entrada__nota">Dados de paciente nunca saem deste aparelho. Esqueceu a senha? Fale com quem te convidou para o Pronto.</p>
        </div>
      </div>`);
    const form = $('#formEntrada');
    let modo = 'entrar';
    $('.entrada__abas').addEventListener('click', (ev) => {
      const aba = ev.target.closest('[data-modo]');
      if (!aba) return;
      modo = aba.dataset.modo;
      document.querySelectorAll('.entrada__abas [data-modo]').forEach((b) => b.setAttribute('aria-selected', b === aba));
      $('.entrada__aceite').hidden = modo !== 'criar';
      form.elements.senha.autocomplete = modo === 'criar' ? 'new-password' : 'current-password';
      form.elements.senha.placeholder = modo === 'criar' ? 'Pelo menos 8 caracteres' : '';
      $('.entrada__botao').textContent = modo === 'criar' ? 'Criar conta e começar' : 'Entrar';
      $('#entradaErro').textContent = '';
    });
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = form.elements.email.value.trim();
      const senha = form.elements.senha.value;
      const erro = (t) => { $('#entradaErro').textContent = t; };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return erro('Confira o e-mail.');
      if (senha.length < 8) return erro('A senha tem pelo menos 8 caracteres.');
      if (modo === 'criar' && !form.elements.aceite.checked) return erro('Para criar a conta, aceite os Termos e a Política de privacidade.');
      if (!sb) return erro('Sem conexão com o Pronto agora. Confira a internet e tente de novo.');
      const botao = $('.entrada__botao');
      botao.disabled = true;
      erro('');
      try {
        if (modo === 'criar') {
          const r = await fetch(`${SUPABASE.url}/functions/v1/cadastrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE.chave },
            body: JSON.stringify({ email, senha, aceite: true }),
          });
          const corpo = await r.json().catch(() => ({}));
          if (!r.ok) return erro(corpo.erro || 'Não foi possível criar a conta agora.');
        }
        const { error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) return erro(/invalid/i.test(error.message) ? 'E-mail ou senha não conferem.' : 'Não foi possível entrar agora. Tente de novo.');
      } catch (e) {
        erro('Sem conexão com o Pronto agora. Confira a internet e tente de novo.');
      } finally {
        botao.disabled = false;
      }
    });
  }

  function fecharEntrada() {
    const el = $('#entrada');
    if (el) el.remove();
    document.body.classList.remove('sem-conta');
  }

  /* ---------------------------------------------------------------- */
  /* Dados: o navegador continua sendo a fonte do app; a conta guarda a cópia */
  /* ---------------------------------------------------------------- */

  const pendentes = new Map();
  let timerEnvio;

  function enviarDepois(chave, valor) {
    if (!SINCRONIZADAS.includes(chave) || !usuario) return;
    pendentes.set(chave, valor);
    clearTimeout(timerEnvio);
    timerEnvio = setTimeout(enviar, 1500);
  }

  async function enviar() {
    if (!pendentes.size || !sb || !usuario) return;
    const lote = [...pendentes].map(([chave, valor]) => ({ chave, valor, atualizado: new Date().toISOString() }));
    pendentes.clear();
    const { error } = await sb.from('dados').upsert(lote, { onConflict: 'user_id,chave' });
    // Sem internet: guarda de volta e tenta na próxima gravação ou quando a aba for fechada.
    if (error) lote.forEach((l) => { if (!pendentes.has(l.chave)) pendentes.set(l.chave, l.valor); });
  }

  // Toda gravação do app também sobe para a conta.
  const gravarOriginal = P.guarda.gravar.bind(P.guarda);
  P.guarda.gravar = (chave, valor) => {
    const ok = gravarOriginal(chave, valor);
    enviarDepois(chave, valor);
    return ok;
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(); });

  function apagarLocal() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('rx.')).forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* sem armazenamento */ }
  }

  // Ao entrar: o que está na conta vale; o que só existe neste navegador (uso antes da conta) sobe.
  async function baixarDados() {
    const dono = lerLocal('rx.dono');
    if (dono && dono !== usuario.id) apagarLocal(); // outro médico usou este navegador
    const { data, error } = await sb.from('dados').select('chave, valor');
    if (error) return;
    const naConta = new Set();
    data.forEach(({ chave, valor }) => {
      if (!SINCRONIZADAS.includes(chave)) return;
      naConta.add(chave);
      gravarOriginal(chave, valor);
    });
    SINCRONIZADAS.forEach((chave) => {
      if (naConta.has(chave)) return;
      const local = P.guarda.ler(chave, undefined);
      if (local !== undefined) enviarDepois(chave, local);
    });
    try { localStorage.setItem('rx.dono', usuario.id); } catch (e) { /* sem armazenamento */ }
    P.recarregar();
  }

  /* ---------------------------------------------------------------- */
  /* Uso grátis e assinatura                                           */
  /* ---------------------------------------------------------------- */

  function textoDaSituacao(s) {
    if (!s) return '';
    if (s.assinante) return s.assinatura === 'ativa' ? 'Assinante' : 'Assinante até o fim do período pago';
    if (s.boas_vindas_restantes > 0) return `${s.boas_vindas_restantes} de 10 grátis restantes`;
    return s.diario_restante > 0 ? '1 grátis disponível hoje' : 'Grátis de hoje já usado';
  }

  function renderSituacao() {
    const linha = $('#contaResumo');
    if (linha) linha.textContent = usuario ? `Minha conta · ${textoDaSituacao(situacao)}` : 'Minha conta';
  }

  async function atualizarSituacao() {
    const { data, error } = await sb.rpc('situacao');
    if (!error && data) situacao = data;
    renderSituacao();
    return situacao;
  }

  // Chamado pelo app antes de imprimir ou copiar. Responde na hora, com a última situação conhecida,
  // para não atrasar o médico; o servidor registra em seguida e corrige se precisar.
  function liberar(id) {
    if (!usuario || !sb) return true; // sem conexão na abertura: não trava o plantão
    if (liberados.has(id)) return true;
    const s = situacao;
    if (s && !s.assinante && s.boas_vindas_restantes <= 0 && s.diario_restante <= 0) {
      abrirAssinatura();
      return false;
    }
    liberados.add(id);
    if (s && !s.assinante) {
      if (s.boas_vindas_restantes > 0) s.boas_vindas_restantes -= 1;
      else s.diario_restante -= 1;
      renderSituacao();
    }
    sb.rpc('consumir', { p_atendimento: id }).then(({ data, error }) => {
      if (error || !data) return;
      situacao = data;
      renderSituacao();
      if (!data.liberado) { liberados.delete(id); return abrirAssinatura(); }
      if (data.repetido || data.assinante) return;
      const n = data.boas_vindas_restantes;
      const aviso = data.tipo === 'boas-vindas' && n <= 3
        ? (n === 0 ? 'Seus 10 atendimentos grátis acabaram. A partir de agora, 1 por dia, ou assine e use sem limite.' : `Restam ${n} ${n === 1 ? 'atendimento grátis' : 'atendimentos grátis'}.`)
        : data.tipo === 'diario' ? 'Este foi o grátis de hoje. Amanhã tem mais 1.' : '';
      // Depois do aviso de "copiado", para os dois não se atropelarem.
      if (aviso) setTimeout(() => P.avisar(aviso, data.tipo === 'diario' || n === 0 ? 'Assinar' : '', abrirAssinatura), 2800);
    });
    return true;
  }

  function montarDialogos() {
    document.body.insertAdjacentHTML('beforeend', `
      <dialog class="dlg dlg--pequeno" id="dlgAssinar" aria-labelledby="dlgAssinarTitulo">
        <h2 id="dlgAssinarTitulo">Assine para continuar</h2>
        <p class="dlg__sub" id="assinarSub"></p>
        <div class="plano">
          <p class="plano__preco"><strong>${PRECO}</strong> <span>por mês</span></p>
          <ul class="plano__itens">
            <li>Receitas e prontuários sem limite</li>
            <li>Seus locais, modelos e diagnósticos em qualquer aparelho</li>
            <li>Cancele quando quiser, direto no Mercado Pago</li>
          </ul>
        </div>
        <p class="entrada__erro" id="assinarErro" role="alert"></p>
        <div class="dlg__acoes">
          <button class="btn" type="button" data-fechar>Agora não</button>
          <button class="btn btn--primario" type="button" id="btnAssinar">Assinar com Mercado Pago</button>
        </div>
      </dialog>

      <dialog class="dlg dlg--pequeno" id="dlgConta" aria-labelledby="dlgContaTitulo">
        <h2 id="dlgContaTitulo">Minha conta</h2>
        <p class="dlg__sub" id="contaEmail"></p>
        <p class="sair__resumo" id="contaPlano"></p>
        <div class="dlg__acoes dlg__acoes--separadas">
          <button class="btn btn--perigo" type="button" id="btnContaSair">Sair da conta</button>
          <div class="dlg__acoes-dir">
            <a class="btn" id="btnGerenciar" href="${GERENCIAR_MP}" target="_blank" rel="noopener" hidden>Gerenciar assinatura</a>
            <button class="btn btn--primario" type="button" id="btnContaAssinar">Assinar</button>
          </div>
        </div>
      </dialog>`);
    document.querySelectorAll('#dlgAssinar [data-fechar], #dlgConta [data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    $('#btnAssinar').addEventListener('click', assinar);
    $('#btnContaAssinar').addEventListener('click', () => { $('#dlgConta').close(); abrirAssinatura(true); });
    $('#btnContaSair').addEventListener('click', sair);

    // Menu: a conta entra no lugar de "levar para outro aparelho" (agora a sincronização faz isso).
    const menu = $('#menuLista');
    menu.insertAdjacentHTML('afterbegin', '<button type="button" role="menuitem" id="btnConta"><span id="contaResumo">Minha conta</span></button><hr>');
    $('#btnConta').addEventListener('click', abrirConta);
    $('#btnLevar').hidden = true;
    $('#btnSair').textContent = 'Sair da conta';
    // "Sair" do app apagava só este navegador; com conta, também encerra a sessão.
    $('#btnSair').addEventListener('click', (ev) => { ev.stopImmediatePropagation(); sair(); }, true);
  }

  function abrirAssinatura(porEscolha) {
    const s = situacao;
    $('#assinarSub').textContent = porEscolha || !s
      ? 'Use o Pronto sem limite de atendimentos.'
      : 'Você já usou os 10 atendimentos de boas-vindas e o grátis de hoje. Amanhã tem mais 1, ou assine e use sem limite.';
    $('#assinarErro').textContent = '';
    $('#dlgAssinar').returnValue = '';
    if (!$('#dlgAssinar').open) $('#dlgAssinar').showModal();
  }

  async function assinar() {
    const botao = $('#btnAssinar');
    botao.disabled = true;
    $('#assinarErro').textContent = '';
    try {
      const { data, error } = await sb.functions.invoke('assinar', { body: {} });
      if (error || !data || !data.url) {
        let msg = 'Não foi possível abrir o pagamento agora. Tente de novo em instantes.';
        try { msg = (await error.context.json()).erro || msg; } catch (e) { /* resposta sem corpo */ }
        $('#assinarErro').textContent = msg;
        return;
      }
      await enviar();
      location.href = data.url;
    } finally {
      botao.disabled = false;
    }
  }

  function abrirConta() {
    $('#contaEmail').textContent = usuario ? usuario.email : '';
    const s = situacao;
    $('#contaPlano').textContent = textoDaSituacao(s) || 'Carregando…';
    const assinante = s && s.assinante;
    $('#btnContaAssinar').hidden = Boolean(assinante);
    $('#btnGerenciar').hidden = !s || s.assinatura === 'nenhuma';
    $('#dlgConta').showModal();
    atualizarSituacao().then(() => { $('#contaPlano').textContent = textoDaSituacao(situacao); });
  }

  async function sair() {
    await enviar();
    if (sb) await sb.auth.signOut();
    apagarLocal();
    try { sessionStorage.setItem('pronto.aviso', 'Você saiu. Neste computador não ficou nada seu.'); } catch (e) { /* sem armazenamento */ }
    location.replace(location.pathname);
  }

  // Voltando do Mercado Pago: a confirmação chega por aviso do Mercado Pago, então confere algumas vezes.
  function aoVoltarDoPagamento() {
    if (!/[?&]assinatura=voltou\b/.test(location.search)) return;
    history.replaceState(null, '', location.pathname);
    P.avisar('Assim que o Mercado Pago confirmar o pagamento, sua assinatura aparece aqui.');
    let tentativas = 0;
    const conferir = async () => {
      const s = await atualizarSituacao();
      if (s && s.assinante) return P.avisar('Assinatura confirmada. Bom plantão!');
      if (++tentativas < 6) setTimeout(conferir, 5000);
    };
    setTimeout(conferir, 3000);
  }

  /* ---------------------------------------------------------------- */
  /* Início                                                            */
  /* ---------------------------------------------------------------- */

  async function aoEntrar(user) {
    const primeiraVez = !usuario;
    usuario = user;
    fecharEntrada();
    if (!primeiraVez) return;
    await baixarDados();
    await atualizarSituacao();
    aoVoltarDoPagamento();
    if (tour()) tour().talvezIniciar();
  }

  function carregarBiblioteca() {
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = SUPABASE.biblioteca;
      s.onload = ok;
      s.onerror = falha;
      document.head.appendChild(s);
    });
  }

  window.ProntoPortao = { liberar };
  montarDialogos();

  // Quem já entrou neste aparelho não vê a tela de entrada nem enquanto a biblioteca carrega.
  const temSessao = Boolean(lerLocal(CHAVE_SESSAO));
  if (!temSessao) montarEntrada();

  carregarBiblioteca().then(async () => {
    sb = window.supabase.createClient(SUPABASE.url, SUPABASE.chave, { auth: { persistSession: true, autoRefreshToken: true } });
    // Fora do retorno do onAuthStateChange: chamar o Supabase lá dentro pode travar a biblioteca.
    sb.auth.onAuthStateChange((evento, sessao) => {
      if (sessao && sessao.user) setTimeout(() => aoEntrar(sessao.user), 0);
    });
    const { data } = await sb.auth.getSession();
    if (data.session) aoEntrar(data.session.user);
    else if (!$('#entrada')) montarEntrada();
  }).catch(() => {
    // Sem internet para carregar a biblioteca: quem já tinha entrado segue usando; quem não, vê o aviso.
    if (!temSessao) $('#entradaErro').textContent = 'Sem conexão com o Pronto agora. Confira a internet e recarregue a página.';
    else if (tour()) tour().talvezIniciar();
  });
})();

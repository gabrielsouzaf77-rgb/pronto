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
  const VERSAO_TERMOS = '2026-10-22';

  // Marcas como as diretrizes de cada empresa pedem: o "G" colorido e a maçã preta.
  const ICONE_GOOGLE = '<svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/></svg>';
  const ICONE_APPLE = '<svg viewBox="0 0 17 20" aria-hidden="true"><path fill="currentColor" d="M14.06 10.62c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76A4.25 4.25 0 0 0 2.97 7.8C1.42 10.48 2.57 14.45 4.08 16.63c.74 1.07 1.62 2.27 2.77 2.23 1.11-.05 1.53-.72 2.88-.72 1.34 0 1.72.72 2.89.7 1.2-.02 1.96-1.09 2.69-2.16.85-1.24 1.2-2.44 1.22-2.5-.03-.01-2.34-.9-2.37-3.56ZM11.86 4.15c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.7-.93 2.7.98.08 1.98-.5 2.59-1.22Z"/></svg>';

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
          <div class="entrada__social" id="entradaSocial" hidden>
            <button type="button" class="social social--google" data-provedor="google" hidden>${ICONE_GOOGLE}<span>Continuar com o Google</span></button>
            <button type="button" class="social social--apple" data-provedor="apple" hidden>${ICONE_APPLE}<span>Continuar com a Apple</span></button>
            <p class="entrada__termos">Ao continuar, você aceita os <a href="termos.html" target="_blank" rel="noopener">Termos de uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.</p>
            <p class="entrada__ou"><span>ou com e-mail</span></p>
          </div>
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
            <button class="link entrada__esqueci" type="button" id="btnEsqueci">Esqueci a senha</button>
          </form>
          <p class="entrada__nota">Dados de paciente nunca saem deste aparelho.</p>
        </div>
      </div>`);
    $('#entradaSocial').addEventListener('click', (ev) => {
      const botao = ev.target.closest('[data-provedor]');
      if (botao) entrarCom(botao.dataset.provedor, botao);
    });
    mostrarProvedores();
    mostrarErroDoRetorno();

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
      $('#btnEsqueci').hidden = modo === 'criar';
      $('#entradaErro').textContent = '';
    });
    $('#btnEsqueci').addEventListener('click', () => esqueciSenha(form.elements.email.value.trim()));
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

  // Google e Apple só aparecem depois de ligados no Supabase (Authentication → Providers):
  // botão que leva a uma página de erro é pior do que botão nenhum.
  async function mostrarProvedores() {
    try {
      const r = await fetch(`${SUPABASE.url}/auth/v1/settings`, { headers: { apikey: SUPABASE.chave } });
      const ligados = (await r.json()).external || {};
      let algum = false;
      ['google', 'apple'].forEach((p) => {
        const botao = $(`[data-provedor="${p}"]`);
        if (botao && ligados[p]) { botao.hidden = false; algum = true; }
      });
      $('#entradaSocial').hidden = !algum;
    } catch (e) { /* sem conexão: fica só o e-mail */ }
  }

  // Sai para a página do Google ou da Apple e volta para cá já com a sessão.
  async function entrarCom(provedor, botao) {
    if (!sb) { $('#entradaErro').textContent = 'Sem conexão com o Pronto agora. Confira a internet e tente de novo.'; return; }
    botao.disabled = true;
    const { error } = await sb.auth.signInWithOAuth({
      provider: provedor,
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) {
      botao.disabled = false;
      $('#entradaErro').textContent = `Não foi possível abrir a entrada com ${provedor === 'apple' ? 'a Apple' : 'o Google'}. Tente de novo.`;
    }
  }

  // Se o Google ou a Apple devolverem erro (cancelou, conta recusada), ele vem no endereço.
  function mostrarErroDoRetorno() {
    const params = new URLSearchParams(location.hash.slice(1) + '&' + location.search.slice(1));
    if (!params.get('error')) return;
    $('#entradaErro').textContent = params.get('error') === 'access_denied'
      ? 'A entrada foi cancelada. Tente de novo ou use o e-mail.'
      : 'Não foi possível entrar agora. Tente de novo ou use o e-mail.';
    history.replaceState(null, '', location.pathname);
  }

  // Manda o link de nova senha. Precisa do envio de e-mail do Supabase configurado (SMTP próprio).
  async function esqueciSenha(email) {
    const aviso = $('#entradaErro');
    aviso.classList.remove('entrada__erro--ok');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { aviso.textContent = 'Digite seu e-mail acima e clique de novo em "Esqueci a senha".'; return; }
    if (!sb) { aviso.textContent = 'Sem conexão com o Pronto agora. Confira a internet e tente de novo.'; return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) { aviso.textContent = 'Não conseguimos mandar o e-mail agora. Tente de novo em alguns minutos.'; return; }
    aviso.classList.add('entrada__erro--ok');
    aviso.textContent = `Se existir conta com ${email}, chegou um e-mail com o link para criar uma nova senha.`;
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
    if (s.assinante) {
      if (s.assinatura === 'ativa') return 'Assinante';
      const ate = s.assinatura_ate ? new Date(s.assinatura_ate).toLocaleDateString('pt-BR') : '';
      return ate ? `Assinatura cancelada · sem limite até ${ate}` : 'Assinatura cancelada · sem limite até o fim do período pago';
    }
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
            <li>Cancele quando quiser, aqui mesmo no Pronto</li>
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
        <p class="entrada__erro" id="contaErro" role="alert"></p>
        <div class="dlg__acoes dlg__acoes--separadas">
          <button class="btn btn--perigo" type="button" id="btnContaSair">Sair da conta</button>
          <div class="dlg__acoes-dir">
            <button class="btn" type="button" id="btnCancelarAssinatura" hidden>Cancelar assinatura</button>
            <button class="btn btn--primario" type="button" id="btnContaAssinar">Assinar</button>
          </div>
        </div>
        <p class="conta__rodape"><a href="${GERENCIAR_MP}" target="_blank" rel="noopener" id="lnkPagamentos" hidden>Pagamentos no Mercado Pago</a><button type="button" class="link conta__excluir" id="btnExcluirConta">Excluir minha conta</button></p>
      </dialog>

      <dialog class="dlg dlg--pequeno" id="dlgConfirmar" aria-labelledby="confirmarTitulo">
        <h2 id="confirmarTitulo"></h2>
        <p class="dlg__sub" id="confirmarTexto"></p>
        <p class="entrada__erro" id="confirmarErro" role="alert"></p>
        <div class="dlg__acoes">
          <button class="btn" type="button" data-fechar>Voltar</button>
          <button class="btn btn--apagar" type="button" id="btnConfirmar"></button>
        </div>
      </dialog>

      <dialog class="dlg dlg--pequeno" id="dlgNovaSenha" aria-labelledby="novaSenhaTitulo">
        <form id="formNovaSenha" novalidate>
          <h2 id="novaSenhaTitulo">Crie uma nova senha</h2>
          <p class="dlg__sub">Você entrou pelo link do e-mail. Escolha a senha que vai usar daqui para frente.</p>
          <label class="cmp cmp--full"><span>Nova senha</span><input name="senha" type="password" autocomplete="new-password" minlength="8" placeholder="Pelo menos 8 caracteres" required></label>
          <p class="entrada__erro" id="novaSenhaErro" role="alert"></p>
          <div class="dlg__acoes"><button class="btn btn--primario" type="submit">Salvar senha</button></div>
        </form>
      </dialog>`);
    document.querySelectorAll('#dlgAssinar [data-fechar], #dlgConta [data-fechar], #dlgConfirmar [data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
    $('#btnCancelarAssinatura').addEventListener('click', () => confirmar({
      titulo: 'Cancelar a assinatura?',
      texto: 'Nenhuma nova cobrança será feita. Você continua sem limite até o fim do período já pago e, depois, volta ao grátis de 1 atendimento por dia.',
      botao: 'Cancelar assinatura',
      acao: cancelarAssinatura,
    }));
    $('#btnExcluirConta').addEventListener('click', () => confirmar({
      titulo: 'Excluir sua conta?',
      texto: 'Apaga para sempre sua conta, seus locais, modelos e atendimentos guardados por diagnóstico, e cancela a assinatura se houver. Não dá para desfazer.',
      botao: 'Excluir para sempre',
      acao: excluirConta,
    }));
    $('#formNovaSenha').addEventListener('submit', salvarNovaSenha);
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
    $('#contaErro').textContent = '';
    const botoes = () => {
      const st = situacao || {};
      $('#btnContaAssinar').hidden = st.assinatura === 'ativa';
      $('#btnCancelarAssinatura').hidden = st.assinatura !== 'ativa';
      $('#lnkPagamentos').hidden = !st.assinatura || st.assinatura === 'nenhuma';
    };
    botoes();
    $('#dlgConta').showModal();
    atualizarSituacao().then(() => { $('#contaPlano').textContent = textoDaSituacao(situacao); botoes(); });
  }

  // Janela de confirmação para o que não tem volta (cancelar, excluir).
  function confirmar({ titulo, texto, botao, acao }) {
    $('#confirmarTitulo').textContent = titulo;
    $('#confirmarTexto').textContent = texto;
    $('#confirmarErro').textContent = '';
    const b = $('#btnConfirmar');
    b.textContent = botao;
    b.onclick = async () => {
      b.disabled = true;
      try { await acao(); } finally { b.disabled = false; }
    };
    $('#dlgConfirmar').showModal();
  }

  async function erroDaFuncao(error, padrao) {
    try { return (await error.context.json()).erro || padrao; } catch (e) { return padrao; }
  }

  async function cancelarAssinatura() {
    const { error } = await sb.functions.invoke('cancelar-assinatura', { body: {} });
    if (error) { $('#confirmarErro').textContent = await erroDaFuncao(error, 'Não foi possível cancelar agora. Tente de novo.'); return; }
    $('#dlgConfirmar').close();
    await atualizarSituacao();
    $('#contaPlano').textContent = textoDaSituacao(situacao);
    $('#btnCancelarAssinatura').hidden = true;
    $('#btnContaAssinar').hidden = false;
    P.avisar('Assinatura cancelada. Nenhuma nova cobrança será feita.');
  }

  async function excluirConta() {
    const { error } = await sb.functions.invoke('excluir-conta', { body: {} });
    if (error) { $('#confirmarErro').textContent = await erroDaFuncao(error, 'Não foi possível excluir agora. Tente de novo.'); return; }
    pendentes.clear();
    await sb.auth.signOut().catch(() => {});
    apagarLocal();
    try { sessionStorage.setItem('pronto.aviso', 'Sua conta foi excluída.'); } catch (e) { /* sem armazenamento */ }
    location.replace(location.pathname);
  }

  function abrirNovaSenha() {
    $('#novaSenhaErro').textContent = '';
    if (!$('#dlgNovaSenha').open) $('#dlgNovaSenha').showModal();
  }

  async function salvarNovaSenha(ev) {
    ev.preventDefault();
    const senha = ev.target.elements.senha.value;
    if (senha.length < 8) { $('#novaSenhaErro').textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) { $('#novaSenhaErro').textContent = 'Não foi possível salvar. Abra o link do e-mail de novo.'; return; }
    $('#dlgNovaSenha').close();
    P.avisar('Senha nova salva.');
  }

  // Pergunta ao Mercado Pago, pelo servidor, se a assinatura mudou (não depende só do aviso deles).
  async function conferirAssinatura() {
    if (!sb) return situacao;
    await sb.functions.invoke('conferir-assinatura', { body: {} }).catch(() => {});
    return atualizarSituacao();
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
      const s = await conferirAssinatura();
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
    // Quem entrou pelo Google ou pela Apple aceitou os termos no texto embaixo dos botões.
    if (!(user.user_metadata || {}).termos_aceitos_em) {
      sb.auth.updateUser({ data: { termos_aceitos_em: new Date().toISOString(), termos_versao: VERSAO_TERMOS } });
    }
    await baixarDados();
    await atualizarSituacao();
    // Assinatura em andamento: confere no Mercado Pago em segundo plano, caso algum aviso tenha se perdido.
    if (situacao && ['pendente', 'ativa', 'pausada'].includes(situacao.assinatura)) conferirAssinatura();
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
      // Chegou pelo link de "Esqueci a senha": pede a senha nova.
      if (evento === 'PASSWORD_RECOVERY') setTimeout(abrirNovaSenha, 0);
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

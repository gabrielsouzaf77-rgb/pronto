// Painel em volta da folha (tela larga): boas-vindas, receitas do plantão, tempo da receita
// e a prévia de como a folha vai sair. Só lê o estado do app (window.Pronto); nada de paciente é guardado.
(function () {
  'use strict';

  const P = window.Pronto;
  if (!P) return;
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const relogio = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // "Dra. Helena Prado" vira "Dra. Helena"; sem título, só o primeiro nome.
  function tratamento(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '';
    return /^dr/i.test(partes[0]) && partes[1] ? `${partes[0]} ${partes[1]}` : partes[0];
  }

  function turno() {
    const h = new Date().getHours();
    return h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite';
  }

  function renderOla() {
    const pf = P.estado.perfil;
    const un = P.unidade();
    const quem = tratamento(pf.nome);
    $('#ola').innerHTML = `
      <h2 class="ola__titulo">Bom plantão${quem ? `,<br>${esc(quem)}` : '.'}</h2>
      ${un.nome
        ? `<p class="ola__sub">${esc(un.nome)} · ${turno()}</p>`
        : '<button type="button" class="ola__link" data-abrir-locais-painel>Escolher o local de atendimento</button>'}`;
  }

  function renderPlantao() {
    const m = P.estado.metricas;
    const dias = m.dias || {};
    const hoje = new Date();
    const semana = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() - (6 - i));
      return { n: dias[d.toLocaleDateString('sv')] || 0, letra: DIAS[d.getDay()] };
    });
    const nHoje = semana[6].n;
    const maior = Math.max(1, ...semana.map((d) => d.n));
    const media = m.receitas ? Math.round(m.segundos / m.receitas) : 0;
    $('#plantao').innerHTML = `
      <p class="plantao__rotulo">Receitas hoje</p>
      <p class="plantao__numero">${nHoje}<span>${m.receitas ? `de ${m.receitas} no total` : 'a primeira aparece aqui'}</span></p>
      <div class="plantao__barras" aria-hidden="true">
        ${semana.map((d, i) => `<div class="plantao__dia${i === 6 ? ' plantao__dia--hoje' : ''}"><i style="height:${Math.max(6, Math.round((d.n / maior) * 100))}%"></i><span>${d.letra}</span></div>`).join('')}
      </div>
      ${media ? `<p class="plantao__media">Tempo médio por receita <strong>${relogio(media)}</strong></p>` : ''}`;
  }

  // O relógio da receita: corre enquanto ela está sendo escrita e para quando sai.
  function renderRelogio() {
    const e = P.estado;
    const naReceita = document.body.dataset.tab !== 'prontuario';
    let rotulo, valor;
    if (e.concluida && e.ultimoTempo) { rotulo = 'Receita pronta em'; valor = relogio(e.ultimoTempo); }
    else if (e.inicio && e.itens.length) { rotulo = 'Receita em andamento'; valor = relogio(Math.min(5999, Math.round((Date.now() - e.inicio) / 1000))); }
    else { rotulo = 'Nova receita'; valor = '0:00'; }
    const vias = P.temAntimicrobiano() ? '2 vias' : '1 via';
    const html = naReceita
      ? `<div><p class="relogio__rotulo">${rotulo}</p><p class="relogio__valor">${valor}</p></div><span class="relogio__vias${vias === '2 vias' ? ' relogio__vias--atb' : ''}">${vias}</span>`
      : `<div><p class="relogio__rotulo">Prontuário</p><p class="relogio__valor relogio__valor--texto">Copie e cole no sistema</p></div>`;
    if ($('#relogio').innerHTML !== html) $('#relogio').innerHTML = html;
  }

  // A folha como vai para o papel, em miniatura. O cabeçalho abre o local; a assinatura, os dados do médico.
  function renderPrevia() {
    const naReceita = document.body.dataset.tab !== 'prontuario';
    $('#previaTitulo').textContent = naReceita ? 'Como vai sair' : 'Como vai para o sistema';
    $('#previaTipo').textContent = naReceita ? (P.temAntimicrobiano() ? 'A4 · 1ª via' : 'A4') : 'texto';
    $('#previaPalco').hidden = !naReceita;
    $('#previaTexto').hidden = naReceita;
    if (!naReceita) {
      $('#previaTexto').textContent = P.textoDoProntuario().trim() || 'Clique nas frases do prontuário e elas aparecem aqui, já com o nome de cada campo.';
      return;
    }
    const e = P.estado;
    const via = P.temAntimicrobiano() ? '1ª via · paciente' : '';
    const a4 = $('#previaA4');
    a4.innerHTML = `<article class="folha folha--impressa">${P.folhaParaImprimir(via)}</article>`;
    const cab = $('.folha__cab', a4);
    const assina = $('.folha__assina', a4);
    if (cab) { cab.dataset.abrirPainel = 'local'; cab.title = 'Editar o local'; }
    if (assina) { assina.dataset.abrirPainel = 'perfil'; assina.title = 'Editar meus dados'; }
    if (!P.unidade().nome && $('.folha__unidade', a4)) $('.folha__unidade', a4).innerHTML = '<span class="falta">Escolher o local</span>';
    if (!e.perfil.nome && $('.folha__medico', a4)) $('.folha__medico', a4).innerHTML = '<span class="falta">Seu nome e CRM</span>';
    if (!e.itens.length) $('.folha__corpo', a4).insertAdjacentHTML('afterbegin', '<p class="previa__vazia">Os remédios aparecem aqui conforme você escreve.</p>');
    escalar();
  }

  function escalar() {
    const palco = $('#previaPalco');
    const folha = $('#previaA4 .folha');
    if (!palco || !folha || palco.hidden) return;
    const k = palco.clientWidth / 794;
    folha.style.transform = `scale(${k})`;
    palco.style.height = Math.round(folha.offsetHeight * k) + 'px';
  }

  function tudo() {
    renderOla();
    renderPlantao();
    renderRelogio();
    renderPrevia();
  }

  // Redesenha no próximo quadro depois de qualquer mexida na tela, uma vez só por quadro.
  let pedido = 0;
  const agendar = () => { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; tudo(); }); };
  ['input', 'change', 'click', 'keyup'].forEach((t) => document.addEventListener(t, agendar, true));
  document.addEventListener('pronto:mudou', agendar);
  window.addEventListener('afterprint', agendar);
  window.addEventListener('resize', escalar);
  setInterval(renderRelogio, 1000);

  document.addEventListener('click', (ev) => {
    const aba = ev.target.closest('[data-ir-aba]');
    if (aba) $(`.tabs__btn[data-tab="${aba.dataset.irAba}"]`).click();
    const t = ev.target.closest('[data-trilho]');
    if (t && t.dataset.trilho === 'perfil') P.abrirPerfil();
    if (t && t.dataset.trilho === 'resumo') P.abrirResumo();
    if (ev.target.closest('[data-abrir-locais-painel]')) P.abrirLocais();
    const ed = ev.target.closest('[data-abrir-painel]');
    if (ed && ed.dataset.abrirPainel === 'perfil') P.abrirPerfil();
    if (ed && ed.dataset.abrirPainel === 'local') P.abrirUnidade();
  });

  // Trilho acompanha a aba ativa.
  new MutationObserver(() => {
    $$('[data-ir-aba]').forEach((b) => b.classList.toggle('trilho__btn--on', b.dataset.irAba === (document.body.dataset.tab || 'prescricao')));
    agendar();
  }).observe(document.body, { attributes: true, attributeFilter: ['data-tab'] });
  $$('[data-ir-aba]').forEach((b) => b.classList.toggle('trilho__btn--on', b.dataset.irAba === (document.body.dataset.tab || 'prescricao')));

  tudo();
  // Os dados da conta podem chegar depois (recarregar): confere de novo em seguida.
  setTimeout(tudo, 1200);
})();

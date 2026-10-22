/*
  Tour de boas-vindas: no primeiro acesso, uma sequência de cartões aponta as ferramentas
  principais (local, modelo do hospital, receita, impressão, prontuário, por diagnóstico, menu).

  Usa o que o app expõe em window.Pronto. Fica marcado como visto em rx.tourVisto; o menu
  "Ver o tour de novo" e o endereço com ?tour abrem de novo.
*/
(function () {
  'use strict';

  const P = window.Pronto;
  if (!P) return;

  const $ = (sel, raiz = document) => raiz.querySelector(sel);

  // alvo: seletores em ordem de preferência; vale o primeiro visível (no celular alguns somem).
  // Sem alvo, o cartão fica no centro da tela. aba: em qual aba o passo acontece (padrão: receita).
  const PASSOS = [
    {
      titulo: 'Bem-vindo ao Pronto',
      texto: 'Receita e prontuário do plantão escritos em segundos, por cima de qualquer sistema. Em um minuto eu te mostro o principal.',
      proximo: 'Começar',
    },
    {
      alvo: ['#tab-prescricao [data-abrir-locais]'],
      titulo: 'Primeiro, onde você atende',
      texto: 'Cadastre a UPA ou o hospital do plantão. A receita sai com o endereço e o timbre de lá, e o Pronto lembra do local na próxima vez.',
    },
    {
      alvo: ['#tab-prescricao [data-abrir-locais]'],
      titulo: 'Modelo do hospital',
      texto: 'No cadastro do local, envie o receituário ou o prontuário que a unidade usa: PDF, Word, foto ou print. O Pronto lê os campos e monta o prontuário igual ao do sistema de lá.',
    },
    {
      alvo: ['#compor'],
      titulo: 'A receita sai pelo remédio',
      texto: 'Digite as primeiras letras, escolha a apresentação e a dose. A linha já sai escrita no formato de receita, e você ajusta o que quiser direto na folha.',
    },
    {
      alvo: ['#acoes'],
      titulo: 'Imprima ou copie',
      texto: 'Imprimir sai em A4, com as duas vias quando tem antibiótico. Copiar leva o texto pronto para colar no sistema da unidade.',
    },
    {
      alvo: ['#tabbtn-prontuario'],
      titulo: 'Prontuário por clique',
      texto: 'Escolha a queixa e clique nas frases. Cada seção tem seu "Copiar", e o botão azul no pé da folha copia o prontuário inteiro.',
      aba: 'prontuario',
    },
    {
      alvo: ['#lateral', '#tab-prescricao [data-abrir-lateral]'],
      titulo: 'Por diagnóstico',
      texto: 'Cada atendimento que você finaliza fica guardado pelo diagnóstico. No próximo caso igual, um clique traz de volta a receita e o prontuário que você escreveu.',
    },
    {
      alvo: ['#btnMenu'],
      titulo: 'O resto fica aqui',
      texto: 'Modelos de receita, seus locais, seus dados e este tour, se quiser ver de novo.',
    },
    {
      titulo: 'Tudo pronto',
      texto: 'Comece cadastrando o local onde você está hoje. Leva menos de um minuto.',
      proximo: 'Cadastrar meu local',
      pular: 'Depois',
      fim: () => P.abrirLocais(),
    },
  ];

  let el = null;
  let atual = 0;
  let foraDeFoco = null;

  function visivel(no) {
    if (!no) return false;
    const r = no.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    return getComputedStyle(no).visibility !== 'hidden';
  }

  function alvoDo(passo) {
    return (passo.alvo || []).map((s) => $(s)).find(visivel) || null;
  }

  function montar() {
    el = document.createElement('div');
    el.className = 'tour';
    el.innerHTML = `
      <div class="tour__foco" aria-hidden="true"></div>
      <section class="tour__cartao" role="dialog" aria-modal="true" aria-labelledby="tourTitulo" aria-describedby="tourTexto">
        <p class="tour__passo" id="tourPasso"></p>
        <h2 class="tour__titulo" id="tourTitulo"></h2>
        <p class="tour__texto" id="tourTexto"></p>
        <div class="tour__acoes">
          <button type="button" class="tour__pular" data-tour="pular">Pular</button>
          <button type="button" class="btn" data-tour="voltar">Voltar</button>
          <button type="button" class="btn btn--primario" data-tour="proximo">Próximo</button>
        </div>
      </section>`;
    document.body.appendChild(el);
    el.addEventListener('click', (ev) => {
      const acao = ev.target.closest('[data-tour]');
      if (!acao) return;
      if (acao.dataset.tour === 'pular') fechar();
      if (acao.dataset.tour === 'voltar') ir(atual - 1);
      if (acao.dataset.tour === 'proximo') ir(atual + 1);
    });
  }

  function posicionar() {
    if (!el) return;
    const passo = PASSOS[atual];
    const alvo = alvoDo(passo);
    const foco = $('.tour__foco', el);
    const cartao = $('.tour__cartao', el);
    el.classList.toggle('tour--centro', !alvo);
    if (!alvo) {
      foco.style.cssText = '';
      cartao.style.cssText = '';
      return;
    }
    const folga = 8;
    const r = alvo.getBoundingClientRect();
    // Alvo maior que a tela (a barra lateral inteira): o destaque fica só na parte visível.
    const topo = Math.max(r.top - folga, 8);
    const base = Math.min(r.bottom + folga, innerHeight - 8);
    foco.style.cssText = `left:${r.left - folga}px;top:${topo}px;width:${r.width + folga * 2}px;height:${base - topo}px`;

    const margem = 16;
    const largura = Math.min(360, innerWidth - margem * 2);
    const altura = cartao.offsetHeight;
    // Embaixo do alvo se couber; senão em cima; senão do lado (alvo alto, como a barra lateral).
    let top;
    let left = Math.min(Math.max(r.left + r.width / 2 - largura / 2, margem), innerWidth - largura - margem);
    if (base + 12 + altura < innerHeight - margem) top = base + 12;
    else if (topo - 12 - altura > margem) top = topo - 12 - altura;
    else {
      top = Math.min(Math.max(r.top, margem), innerHeight - altura - margem);
      left = r.right + 24 + largura < innerWidth ? r.right + 24 : Math.max(margem, r.left - 24 - largura);
    }
    cartao.style.cssText = `width:${largura}px;left:${left}px;top:${top}px`;
  }

  function ir(i) {
    if (i < 0) return;
    if (i >= PASSOS.length) {
      const fim = PASSOS[PASSOS.length - 1].fim;
      fechar();
      if (fim) fim();
      return;
    }
    atual = i;
    const passo = PASSOS[i];
    // Cada passo mostra a aba dele; voltar de um passo do prontuário traz a receita de volta.
    const aba = passo.aba || 'prescricao';
    if (document.body.dataset.tab !== aba) P.trocarAba(aba);
    const alvo = alvoDo(passo);
    if (alvo) {
      const r = alvo.getBoundingClientRect();
      if (r.top < 80 || r.bottom > innerHeight - 80) alvo.scrollIntoView({ block: 'center' });
    }
    $('#tourPasso').textContent = `${i + 1} de ${PASSOS.length}`;
    $('#tourTitulo').textContent = passo.titulo;
    $('#tourTexto').textContent = passo.texto;
    $('[data-tour="voltar"]', el).hidden = i === 0 || i === PASSOS.length - 1;
    $('[data-tour="pular"]', el).textContent = passo.pular || 'Pular';
    $('[data-tour="proximo"]', el).textContent = passo.proximo || (i === PASSOS.length - 2 ? 'Concluir' : 'Próximo');
    posicionar();
    $('[data-tour="proximo"]', el).focus({ preventScroll: true });
  }

  function aoTeclar(ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); fechar(); }
    if (ev.key === 'ArrowRight') ir(atual + 1);
    if (ev.key === 'ArrowLeft') ir(atual - 1);
    // O foco fica dentro do cartão enquanto o tour está aberto.
    if (ev.key === 'Tab') {
      const botoes = [...el.querySelectorAll('button:not([hidden])')];
      const i = botoes.indexOf(document.activeElement);
      ev.preventDefault();
      botoes[(i + (ev.shiftKey ? -1 : 1) + botoes.length) % botoes.length].focus();
    }
  }

  function abrir() {
    if (!el) montar();
    foraDeFoco = document.activeElement;
    document.body.classList.add('em-tour');
    el.hidden = false;
    document.addEventListener('keydown', aoTeclar);
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, { passive: true });
    ir(0);
  }

  function fechar() {
    if (!el || el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('em-tour');
    document.removeEventListener('keydown', aoTeclar);
    window.removeEventListener('resize', posicionar);
    window.removeEventListener('scroll', posicionar);
    P.guarda.gravar('tourVisto', true);
    P.trocarAba('prescricao');
    if (foraDeFoco && foraDeFoco.focus) foraDeFoco.focus({ preventScroll: true });
  }

  // Abre sozinho no primeiro acesso (ou com ?tour). A demonstração só abre pelo menu.
  function talvezIniciar() {
    if (/[?&]tour\b/.test(location.search)) return abrir();
    if (P.demo || P.guarda.ler('tourVisto', false)) return;
    abrir();
  }

  window.ProntoTour = { abrir, talvezIniciar };
  $('#btnTour').addEventListener('click', abrir);
})();

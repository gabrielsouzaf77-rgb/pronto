/*
  Vitrine do Pronto: a demonstração ao vivo do topo (com a base real de medicamentos), o quadro da
  noite de plantão, os passos que trocam a tela, os interruptores, o cadastro e as entradas.
  Sem script, tudo continua legível: a demonstração mostra a busca e o resto da página é HTML.
*/
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (t) => String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  const MEDS = window.RX_MEDICAMENTOS || [];
  const VIAS = window.RX_VIAS || { oral: 'Uso oral' };

  /* ---------------------------------------------------------------- */
  /* Entrada do topo                                                   */
  /* ---------------------------------------------------------------- */
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('pronto')));
  // Garantia: se o navegador segurar os quadros (aba em segundo plano), o topo aparece mesmo assim.
  setTimeout(() => document.documentElement.classList.add('pronto'), 1500);

  /* ---------------------------------------------------------------- */
  /* Demonstração: busca pelo nome, escolhe a apresentação e a posologia */
  /* ---------------------------------------------------------------- */
  const demo = $('[data-demo]');
  if (demo && MEDS.length) {
    const busca = $('[data-demo-busca]', demo);
    const lista = $('[data-demo-lista]', demo);
    const itensEl = $('[data-demo-itens]', demo);
    const viaEl = $('[data-demo-via]', demo);
    const etapaEl = $('[data-demo-etapa]', demo);
    const tempoEl = $('[data-demo-tempo]', demo);
    const tipoEl = $('[data-demo-tipo]', demo);

    const est = { etapa: 'nome', med: null, ap: null, opcoes: [], sel: 0, itens: [], inicio: 0 };
    const CHAVE = new Map(MEDS.map((m) => [m.id, norm(`${m.nome} ${m.sinonimos || ''} ${m.classe || ''}`)]));

    function distancia(a, b) {
      let linha = Array.from({ length: b.length + 1 }, (_, j) => j);
      for (let i = 1; i <= a.length; i++) {
        const nova = [i];
        for (let j = 1; j <= b.length; j++) nova[j] = Math.min(linha[j] + 1, nova[j - 1] + 1, linha[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        linha = nova;
      }
      return linha[b.length];
    }

    // A mesma lógica do Pronto: começo de palavra; com erro de digitação, o nome mais parecido.
    function buscar(q) {
      const termos = norm(q).split(/\s+/).filter(Boolean);
      if (!termos.length) return [];
      const achados = MEDS.map((med) => {
        const palavras = CHAVE.get(med.id).split(/[\s+]+/);
        const nome = norm(med.nome);
        if (!termos.every((t) => palavras.some((p) => p.startsWith(t)) || (t.length >= 4 && CHAVE.get(med.id).includes(t)))) return null;
        return { med, pontos: nome.startsWith(termos.join(' ')) ? 100 : 60 };
      }).filter(Boolean).sort((a, b) => b.pontos - a.pontos || a.med.nome.localeCompare(b.med.nome, 'pt-BR'));
      if (achados.length) return achados.slice(0, 5).map((a) => a.med);
      const t = termos[0];
      const folga = t.length <= 3 ? 0 : t.length <= 5 ? 1 : 2;
      if (!folga) return [];
      return MEDS.map((med) => {
        const ps = norm(`${med.nome} ${med.sinonimos || ''}`).split(/[\s+]+/).filter(Boolean);
        return { med, d: Math.min(...ps.map((p) => Math.min(...[-1, 0, 1, 2].map((f) => distancia(t, p.slice(0, Math.max(1, t.length + f))))))) };
      }).filter((r) => r.d <= folga).sort((a, b) => a.d - b.d).slice(0, 4).map((r) => r.med);
    }

    function desenharLista() {
      const vazio = !est.opcoes.length;
      lista.hidden = vazio;
      busca.setAttribute('aria-expanded', String(!vazio));
      if (vazio) { lista.innerHTML = ''; return; }
      lista.innerHTML = est.opcoes.map((o, i) => {
        let a = ''; let b = ''; let c = '';
        if (est.etapa === 'nome') {
          a = o.nome;
          b = o.apresentacoes.map((ap) => ap.conc).join(' · ');
          c = o.antimicrobiano ? 'Antibiótico' : '';
        } else if (est.etapa === 'dose') {
          a = o.conc;
          b = `${o.forma} · ${(VIAS[o.via] || '').toLowerCase()}`;
        } else {
          a = o.rotulo;
          b = o.texto;
        }
        return `<li role="option" id="demo-op-${i}" aria-selected="${i === est.sel}" data-i="${i}"><strong>${esc(a)}</strong><span>${esc(b)}</span>${c ? `<em>${esc(c)}</em>` : ''}</li>`;
      }).join('');
      busca.setAttribute('aria-activedescendant', `demo-op-${est.sel}`);
    }

    function desenharItens() {
      viaEl.hidden = !est.itens.length;
      itensEl.innerHTML = est.itens.map((it, i) => `
        <li><b>${i + 1}.</b><div><strong>${esc(it.med.nome)} ${esc(it.ap.conc)}</strong><span class="forma">${esc(it.ap.forma)}</span></div><span class="qtd">${esc(it.pos.qtd)}</span><p class="uso">${esc(it.pos.texto)}</p></li>`).join('');
      const atb = est.itens.some((it) => it.med.antimicrobiano);
      tipoEl.textContent = atb ? 'Antimicrobiano · 2 vias' : 'Receituário';
      tipoEl.classList.toggle('demo__tipo--atb', atb);
    }

    function etapa(nome, texto) {
      est.etapa = nome;
      est.sel = 0;
      etapaEl.textContent = texto;
    }

    function aoDigitar() {
      if (!est.inicio && busca.value.trim()) est.inicio = performance.now();
      if (est.etapa === 'nome') est.opcoes = buscar(busca.value);
      else if (est.etapa === 'dose') {
        const t = norm(busca.value.slice(est.med.nome.length));
        est.opcoes = est.med.apresentacoes.filter((ap) => !t.trim() || norm(`${ap.conc} ${ap.forma}`).includes(t.trim()));
      }
      est.sel = 0;
      desenharLista();
    }

    function escolher(i) {
      const o = est.opcoes[i];
      if (!o) return;
      if (est.etapa === 'nome') {
        est.med = o;
        busca.value = `${o.nome} `;
        etapa('dose', 'Apresentação');
        est.opcoes = o.apresentacoes;
      } else if (est.etapa === 'dose') {
        est.ap = o;
        busca.value = `${est.med.nome} ${o.conc}`;
        etapa('posologia', 'Posologia');
        est.opcoes = o.posologias;
      } else {
        est.itens.push({ med: est.med, ap: est.ap, pos: o });
        desenharItens();
        busca.value = '';
        etapa('nome', '');
        est.opcoes = [];
        const s = Math.max(1, Math.round((performance.now() - est.inicio) / 1000));
        tempoEl.textContent = `Receita pronta em 0:${String(s).padStart(2, '0')}. Na conta, ela sai em A4 com seu nome e CRM.`;
        tempoEl.classList.add('demo__tempo--ok');
      }
      desenharLista();
    }

    function limpar() {
      est.itens = [];
      est.inicio = 0;
      busca.value = '';
      etapa('nome', '');
      est.opcoes = [];
      desenharItens();
      desenharLista();
      tempoEl.textContent = 'Experimente: clique na busca e digite um remédio.';
      tempoEl.classList.remove('demo__tempo--ok');
    }

    busca.addEventListener('input', aoDigitar);
    busca.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (!est.opcoes.length) return;
        est.sel = (est.sel + (ev.key === 'ArrowDown' ? 1 : -1) + est.opcoes.length) % est.opcoes.length;
        desenharLista();
      } else if (ev.key === 'Enter') {
        ev.preventDefault();
        escolher(est.sel);
      } else if (ev.key === 'Escape' || (ev.key === 'Backspace' && est.etapa !== 'nome' && busca.selectionStart <= est.med.nome.length)) {
        if (est.etapa === 'nome') return;
        ev.preventDefault();
        busca.value = est.med.nome;
        etapa('nome', '');
        aoDigitar();
      }
    });
    lista.addEventListener('pointerdown', (ev) => {
      const li = ev.target.closest('li[data-i]');
      if (!li) return;
      ev.preventDefault();
      escolher(Number(li.dataset.i));
      busca.focus();
    });
    $('[data-demo-limpar]', demo).addEventListener('click', () => { parar(); limpar(); busca.focus(); });

    // Sozinha: escreve uma receita de verdade, para quem só está olhando. Para no primeiro toque.
    const ROTEIROS = [
      [['dip', 'dipirona', 'dipirona-500', 0], ['amox', 'amoxicilina', 'amoxicilina-500', 0]],
      [['ibu', 'ibuprofeno', 'ibuprofeno-600', 0], ['ciclo', 'ciclobenzaprina', 'ciclobenzaprina-5', 0]],
      [['nitro', 'nitrofurantoina', 'nitrofurantoina-100', 0], ['onda', 'ondansetrona', 'ondansetrona-4', 0]],
    ];
    let autor = true;
    function parar() { autor = false; }
    ['pointerdown', 'keydown', 'focusin'].forEach((t) => demo.addEventListener(t, (ev) => { if (ev.isTrusted) parar(); }));

    async function digitar(texto) {
      for (const letra of texto) {
        if (!autor) return false;
        busca.value += letra;
        aoDigitar();
        await espera(120);
      }
      return autor;
    }
    async function marcar(pred) {
      if (!autor) return false;
      const i = est.opcoes.findIndex(pred);
      est.sel = Math.max(0, i);
      desenharLista();
      await espera(650);
      if (!autor) return false;
      escolher(est.sel);
      await espera(500);
      return autor;
    }
    async function rodar() {
      let n = 0;
      while (autor) {
        limpar();
        await espera(900);
        for (const [texto, medId, apId, pos] of ROTEIROS[n % ROTEIROS.length]) {
          if (!(await digitar(texto))) return;
          await espera(350);
          if (!(await marcar((m) => m.id === medId))) return;
          if (!(await marcar((ap) => ap.id === apId))) return;
          if (!(await marcar((_, i) => i === pos))) return;
          await espera(500);
        }
        await espera(4200);
        n++;
      }
    }

    // Sem movimento: mostra o resultado pronto, sem digitar letra por letra.
    function mostrarPronta() {
      for (const [, medId, apId] of ROTEIROS[0]) {
        const med = MEDS.find((m) => m.id === medId);
        const ap = med && med.apresentacoes.find((a) => a.id === apId);
        if (ap) est.itens.push({ med, ap, pos: ap.posologias[0] });
      }
      desenharItens();
    }

    if (calmo) mostrarPronta();
    else {
      // Começa quando o topo aparece; para se a aba some e recomeça devagar quando volta.
      const obs = new IntersectionObserver((entradas) => {
        if (entradas.some((e) => e.isIntersecting)) { obs.disconnect(); setTimeout(rodar, 1400); }
      });
      obs.observe(demo);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Quadro da noite: uma linha aberta por vez                        */
  /* ---------------------------------------------------------------- */
  const quadro = $('[data-quadro]');
  if (quadro) {
    quadro.addEventListener('click', (ev) => {
      const botao = ev.target.closest('.quadro__linha > button');
      if (!botao) return;
      $$('.quadro__linha', quadro).forEach((l) => {
        const esta = l === botao.parentElement;
        l.classList.toggle('quadro__linha--aberta', esta);
        $('button', l).setAttribute('aria-expanded', String(esta));
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Como funciona: o passo no meio da tela troca o estado da tela     */
  /* ---------------------------------------------------------------- */
  const tela = $('[data-tela]');
  const passos = $$('[data-passo]');
  // No celular a tela fixa não cabe ao lado: cada passo leva a sua tela logo abaixo do texto.
  if (tela) passos.forEach((p) => {
    const estado = $('.tela__estado--' + p.dataset.passo, tela);
    if (!estado) return;
    const caixa = document.createElement('div');
    caixa.className = 'passo__tela';
    caixa.setAttribute('aria-hidden', 'true');
    caixa.setAttribute('data-ui', '');
    caixa.appendChild(estado.cloneNode(true));
    p.appendChild(caixa);
  });
  if (tela && passos.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        tela.dataset.tela = e.target.dataset.passo;
        passos.forEach((p) => p.classList.toggle('passo--ativo', p === e.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    passos.forEach((p) => obs.observe(p));
  }

  /* ---------------------------------------------------------------- */
  /* Interruptores das faixas                                          */
  /* ---------------------------------------------------------------- */
  $$('[data-faixa]').forEach((faixa) => {
    const chave = $('.chave', faixa);
    const pinta = () => faixa.classList.toggle('faixa--on', chave.getAttribute('aria-checked') === 'true');
    chave.addEventListener('click', () => {
      chave.setAttribute('aria-checked', String(chave.getAttribute('aria-checked') !== 'true'));
      pinta();
    });
    pinta();
  });

  /* ---------------------------------------------------------------- */
  /* A base: os nomes vêm dos dados reais                              */
  /* ---------------------------------------------------------------- */
  const nomes = $('[data-nomes]');
  if (nomes && MEDS.length) {
    nomes.innerHTML = MEDS.map((m) => `<li${m.antimicrobiano ? ' class="atb"' : ''}>${esc(m.nome)}</li>`).join('');
  }

  /* ---------------------------------------------------------------- */
  /* Cadastro: o e-mail segue para o sistema pela memória da aba        */
  /* ---------------------------------------------------------------- */
  $$('[data-cadastro]').forEach((form) => {
    const nota = $('[data-cadastro-nota]', form);
    const original = nota.innerHTML;
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const email = form.elements.email.value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        nota.textContent = 'Confira o e-mail: parece faltar alguma coisa.';
        nota.classList.add('cadastro__nota--erro');
        form.elements.email.focus();
        return;
      }
      try { if (email) sessionStorage.setItem('pronto.cadastro', email); } catch (e) { /* sem armazenamento */ }
      location.href = 'app.html#criar';
    });
    form.elements.email.addEventListener('input', () => {
      nota.innerHTML = original;
      nota.classList.remove('cadastro__nota--erro');
    });
  });
  $$('[data-ir-cadastro]').forEach((a) => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    $('#cadastro').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => $('#email-fecho').focus({ preventScroll: true }), calmo ? 0 : 600);
  }));

  /* ---------------------------------------------------------------- */
  /* Entradas: título, texto e imagem de cada seção, um depois do outro */
  /* ---------------------------------------------------------------- */
  if (!calmo && 'IntersectionObserver' in window) {
    const alvos = [];
    // As perguntas e o cadastro ficam no fim: aparecem já prontos, sem depender da rolagem.
    $$('main > section:not(.topo):not(.perguntas):not(.fecho)').forEach((sec) => {
      $$('h2, h3, p, img, .quadro__linha, .faixa, .tabela tbody tr, .tela, .farmacia__nomes', sec).forEach((el, i) => {
        if (el.closest('.tela__estado') || el.closest('.quadro__detalhe') || el.closest('.passo__tela')) return;
        el.classList.add('surge');
        el.style.setProperty('--atraso', `${Math.min(i % 6, 5) * 75}ms`);
        alvos.push(el);
      });
    });
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visivel');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px 20% 0px' });
    alvos.forEach((el) => obs.observe(el));
    // Rolagem muito rápida até o fim: nada fica para trás escondido.
    window.addEventListener('scroll', () => {
      if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 40) return;
      alvos.forEach((el) => el.classList.add('visivel'));
    }, { passive: true });
  }

  // A foto do amanhecer anda um pouco mais devagar que a página.
  const foto = $('.palco__foto');
  if (foto && !calmo) {
    let pedido = 0;
    window.addEventListener('scroll', () => {
      if (pedido) return;
      pedido = requestAnimationFrame(() => {
        pedido = 0;
        const y = Math.min(window.scrollY, 1200);
        foto.style.translate = `0 ${y * 0.12}px`;
      });
    }, { passive: true });
  }
})();

/*
  Vitrine do Pronto, v2: rolagem suave (Lenis), a cena 3D do topo que endireita com a rolagem e a frase
  que acende palavra por palavra (GSAP + ScrollTrigger), os recursos com a tela fixa, a demonstração
  ao vivo com a base real, o bento, o cadastro e as entradas. Sem script, tudo continua legível.
*/
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (t) => String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const temGsap = Boolean(window.gsap && window.ScrollTrigger);

  const MEDS = window.RX_MEDICAMENTOS || [];
  const VIAS = window.RX_VIAS || { oral: 'Uso oral' };

  /* ---------------------------------------------------------------- */
  /* Entrada do topo                                                   */
  /* ---------------------------------------------------------------- */
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('pronto')));
  // Garantia: se o navegador segurar os quadros (aba em segundo plano), o topo aparece mesmo assim.
  setTimeout(() => document.documentElement.classList.add('pronto'), 1500);

  /* ---------------------------------------------------------------- */
  /* Rolagem suave e a barra do topo                                   */
  /* ---------------------------------------------------------------- */
  let lenis = null;
  if (!calmo && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    if (temGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const quadro = (t) => { lenis.raf(t); requestAnimationFrame(quadro); };
      requestAnimationFrame(quadro);
    }
  }
  const irPara = (alvo, opcoes = {}) => {
    if (lenis) lenis.scrollTo(alvo, { offset: -90, duration: 1.2, ...opcoes });
    else alvo.scrollIntoView({ behavior: calmo ? 'auto' : 'smooth', block: 'start' });
  };
  $$('a[href^="#"]').forEach((a) => {
    if (a.hasAttribute('data-ir-cadastro')) return;
    a.addEventListener('click', (ev) => {
      const alvo = $(a.getAttribute('href'));
      if (!alvo) return;
      ev.preventDefault();
      irPara(alvo);
    });
  });
  const nav = $('[data-nav]');
  const pintaNav = () => nav.classList.toggle('nav--rolou', window.scrollY > 10);
  window.addEventListener('scroll', pintaNav, { passive: true });
  pintaNav();

  /* ---------------------------------------------------------------- */
  /* Cena do topo: a janela endireita, a A4 sai, o celular sobe        */
  /* ---------------------------------------------------------------- */
  if (temGsap && !calmo) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', () => {
      gsap.set('[data-janela]', { rotateX: 24, scale: 0.88, y: 0 });
      gsap.timeline({ scrollTrigger: { trigger: '[data-cena]', start: 'top 85%', end: 'top 15%', scrub: 0.8 } })
        .to('[data-janela]', { rotateX: 0, scale: 1, ease: 'none' }, 0)
        .fromTo('[data-a4]', { y: 160, rotate: 12 }, { y: -40, rotate: 5, ease: 'none' }, 0)
        .fromTo('[data-celular]', { y: 200, rotate: -12 }, { y: -10, rotate: -6, ease: 'none' }, 0);
      gsap.to('.selo--tempo', { y: -60, ease: 'none', scrollTrigger: { trigger: '[data-cena]', start: 'top 60%', end: 'bottom top', scrub: true } });
      gsap.to('.selo--copia', { y: -110, ease: 'none', scrollTrigger: { trigger: '[data-cena]', start: 'top 60%', end: 'bottom top', scrub: true } });
      gsap.to('.selo--vias', { y: -150, ease: 'none', scrollTrigger: { trigger: '[data-cena]', start: 'top 60%', end: 'bottom top', scrub: true } });
    });
    mm.add('(max-width: 760px)', () => {
      gsap.fromTo('[data-janela]', { rotateX: 16, scale: 0.94 }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '[data-cena]', start: 'top 90%', end: 'top 30%', scrub: 0.8 } });
      gsap.fromTo('[data-a4]', { y: 60 }, { y: -20, ease: 'none', scrollTrigger: { trigger: '[data-cena]', start: 'top 90%', end: 'bottom top', scrub: true } });
      gsap.fromTo('[data-celular]', { y: 80 }, { y: -10, ease: 'none', scrollTrigger: { trigger: '[data-cena]', start: 'top 90%', end: 'bottom top', scrub: true } });
    });
    // Os selos chegam depois do título, um de cada vez.
    gsap.from('[data-selo]', { opacity: 0, scale: 0.8, y: 20, duration: 0.8, ease: 'back.out(1.7)', stagger: 0.18, delay: 1.1 });
  }

  /* ---------------------------------------------------------------- */
  /* A frase que acende palavra por palavra                           */
  /* ---------------------------------------------------------------- */
  const frase = $('[data-acende]');
  if (frase) {
    const palavras = frase.textContent.trim().split(/\s+/);
    frase.innerHTML = palavras.map((w) => `<span class="p">${esc(w)}</span>`).join(' ');
    const spans = $$('.p', frase);
    const acende = (fracao) => {
      const n = Math.round(fracao * spans.length);
      spans.forEach((sp, i) => sp.classList.toggle('p--acesa', i < n));
    };
    if (temGsap && !calmo) {
      window.ScrollTrigger.create({ trigger: frase, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: (st) => acende(st.progress) });
    } else acende(1);
  }

  /* ---------------------------------------------------------------- */
  /* Recursos: a lista fica, a tela muda (no computador, presa à tela) */
  /* ---------------------------------------------------------------- */
  const itens = $$('[data-recurso]');
  const quadros = $$('.recursos__quadro');
  const ativar = (i) => {
    itens.forEach((it, k) => it.classList.toggle('recurso--ativo', k === i));
    quadros.forEach((q, k) => q.classList.toggle('recursos__quadro--on', k === i));
  };
  if (itens.length) {
    let gatilho = null;
    if (temGsap && !calmo) {
      window.gsap.matchMedia().add('(min-width: 981px)', () => {
        gatilho = window.ScrollTrigger.create({
          trigger: '[data-recursos]',
          start: 'center center',
          end: () => '+=' + window.innerHeight * 2.2,
          pin: true,
          onUpdate: (st) => ativar(Math.min(itens.length - 1, Math.floor(st.progress * itens.length * 0.999))),
        });
        return () => { gatilho = null; };
      });
    }
    itens.forEach((it, i) => it.addEventListener('click', () => {
      if (gatilho) {
        const y = gatilho.start + (gatilho.end - gatilho.start) * ((i + 0.5) / itens.length);
        if (lenis) lenis.scrollTo(y, { duration: 1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
      } else ativar(i);
    }));
  }

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
      tempoEl.textContent = 'Clique na busca e digite um remédio.';
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
        if (entradas.some((e) => e.isIntersecting)) { obs.disconnect(); setTimeout(rodar, 500); }
      });
      obs.observe(demo);
    }
  }

  /* ---------------------------------------------------------------- */
  /* A base: esteira de nomes reais e a lista para leitores de tela    */
  /* ---------------------------------------------------------------- */
  const esteira = $('[data-esteira]');
  if (esteira && MEDS.length) {
    const chip = (m) => `<span${m.antimicrobiano ? ' class="atb"' : ''}>${esc(m.nome)}</span>`;
    const metade = Math.ceil(MEDS.length / 2);
    const filas = [MEDS.slice(0, metade), MEDS.slice(metade)];
    esteira.innerHTML = filas.map((f, i) => `<div class="esteira__fila${i ? ' esteira__fila--volta' : ''}">${f.map(chip).join('')}${f.map(chip).join('')}</div>`).join('');
  }
  const nomes = $('[data-nomes]');
  if (nomes && MEDS.length) nomes.innerHTML = MEDS.map((m) => `<li>${esc(m.nome)}</li>`).join('');

  /* ---------------------------------------------------------------- */
  /* Cartões que inclinam com o cursor                                  */
  /* ---------------------------------------------------------------- */
  if (!calmo && window.matchMedia('(pointer: fine)').matches) {
    $$('[data-tilt]').forEach((c) => {
      c.addEventListener('pointermove', (ev) => {
        const r = c.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width - 0.5;
        const y = (ev.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(1100px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-3px)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
      c.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s';
    });
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
    irPara($('#cadastro'), { offset: -120 });
    setTimeout(() => $('#email-fim').focus({ preventScroll: true }), calmo ? 0 : 1200);
  }));

  /* ---------------------------------------------------------------- */
  /* Entradas das seções                                               */
  /* ---------------------------------------------------------------- */
  if (!calmo && 'IntersectionObserver' in window) {
    const alvos = [];
    $$('.recursos__titulo, .teste__texto, .demo, .bento__titulo, .cartao, .preco__titulo, .plano, .perguntas__titulo, .fim__texto').forEach((el, i) => {
      el.classList.add('surge');
      el.style.setProperty('--atraso', `${(i % 3) * 90}ms`);
      alvos.push(el);
    });
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visivel');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px 10% 0px' });
    alvos.forEach((el) => obs.observe(el));
    window.addEventListener('scroll', () => {
      if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 40) return;
      alvos.forEach((el) => el.classList.add('visivel'));
    }, { passive: true });
  } else {
    $$('.cartao').forEach((c) => c.classList.add('visivel'));
  }
})();

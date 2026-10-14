(function () {
  'use strict';

  const MEDS = window.RX_MEDICAMENTOS;
  const VIAS = window.RX_VIAS;
  const PRONT = window.RX_PRONTUARIO;

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Sem acentos e em minúsculas, para a busca não depender de como o médico digita.
  const norm = (t) => String(t ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const paraRegex = (t) => t.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const comMouse = () => window.matchMedia('(pointer: fine)').matches;

  // Só perfil, padrões, modelos e contagem de uso ficam no navegador.
  // Paciente e receita em andamento vivem apenas na memória da aba.
  const guarda = {
    ler(chave, padrao) {
      try {
        const v = localStorage.getItem('rx.' + chave);
        return v ? JSON.parse(v) : padrao;
      } catch (e) {
        return padrao;
      }
    },
    gravar(chave, valor) {
      try {
        localStorage.setItem('rx.' + chave, JSON.stringify(valor));
      } catch (e) { /* navegador sem armazenamento: segue sem salvar */ }
    },
  };

  const INDICE = [];
  MEDS.forEach((med) => med.apresentacoes.forEach((ap) => INDICE.push({ med, ap })));
  const POR_AP = new Map(INDICE.map((e) => [e.ap.id, e]));
  const INICIAIS = ['dipirona-500', 'paracetamol-750', 'ibuprofeno-600', 'amoxicilina-500', 'ondansetrona-4', 'loratadina-10'];

  const estado = {
    paciente: { nome: '', idade: '', sexo: '', endereco: '' },
    itens: [],
    orientacoes: '',
    etapa: 'nome', // 'nome' → 'dose'
    med: null,
    resultados: [],
    sel: 0,
    perfil: guarda.ler('perfil', {}),
    padroes: guarda.ler('padroes', {}),
    modelos: guarda.ler('modelos', []),
    uso: guarda.ler('uso', {}),
    // Uso acumulado neste aparelho: receitas feitas, tempo medido e onde a base não atendeu. Nenhum dado de paciente.
    metricas: { receitas: 0, segundos: 0, semResultado: [], alteradas: {}, ...guarda.ler('metricas', {}) },
    inicio: 0, // quando a receita atual começou a ser escrita
    concluida: false, // a receita atual já foi impressa ou copiada
    pront: { queixa: 'geral', sec: {} },
  };
  let seq = 0;

  const duracao = (s) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`);
  const marcarInicio = () => { if (!estado.inicio) estado.inicio = Date.now(); };

  // Campos de texto da folha crescem com o conteúdo, como texto corrido.
  function ajustarAltura(area) {
    area.style.height = 'auto';
    area.style.height = area.scrollHeight + 'px';
  }

  /* ------------------------------------------------------------------ */
  /* Busca: primeiro o nome, depois a dosagem                            */
  /* ------------------------------------------------------------------ */

  const MED_CHAVE = new Map(MEDS.map((m) => [m.id, norm(`${m.nome} ${m.sinonimos || ''} ${m.classe}`)]));
  const chaveDaDose = (ap) => norm(`${ap.conc} ${ap.forma} ${VIAS[ap.via]}`);
  const usoDoMed = (med) => med.apresentacoes.reduce((s, ap) => s + (estado.uso[ap.id] || 0), 0);

  // Distância de edição, para achar o nome mesmo com erro de digitação.
  function distancia(a, b) {
    let linha = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const nova = [i];
      for (let j = 1; j <= b.length; j++) {
        nova[j] = Math.min(linha[j] + 1, nova[j - 1] + 1, linha[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      linha = nova;
    }
    return linha[b.length];
  }

  function atalhos() {
    const usoDe = (e) => estado.uso[e.ap.id] || 0;
    const usados = INDICE.filter((e) => usoDe(e) > 0).sort((a, b) => usoDe(b) - usoDe(a)).slice(0, 6);
    for (const id of INICIAIS) {
      if (usados.length >= 6) break;
      const e = POR_AP.get(id);
      if (e && !usados.includes(e)) usados.push(e);
    }
    return usados;
  }

  // Etapa 1: pelo nome. Termos que não batem com o nome (ex.: "500") viram filtro da dosagem.
  function buscarMedicamentos(consulta) {
    const termos = norm(consulta).split(/\s+/).filter(Boolean);
    if (!termos.length) return [];

    const achados = [];
    MEDS.forEach((med) => {
      const chave = MED_CHAVE.get(med.id);
      const nome = norm(med.nome);
      const palavrasDoNome = nome.split(/[\s+]+/);
      const todasPalavras = chave.split(/[\s+]+/);
      // Vale o começo de uma palavra; trecho no meio só conta a partir de 4 letras.
      const bate = (t) => todasPalavras.some((p) => p.startsWith(t)) || (t.length >= 4 && chave.includes(t));
      const doNome = termos.filter(bate);
      const daDose = termos.filter((t) => !bate(t));
      if (!doNome.length) return;
      if (daDose.length && !med.apresentacoes.some((ap) => daDose.every((t) => chaveDaDose(ap).includes(t)))) return;

      let pontos = 50;
      if (nome.startsWith(doNome.join(' '))) pontos = 100;
      else if (doNome.every((t) => palavrasDoNome.some((p) => p.startsWith(t)))) pontos = 80;
      else if (doNome.every((t) => todasPalavras.some((p) => p.startsWith(t)))) pontos = 70;
      achados.push({ med, termosDose: daDose, pontos });
    });

    if (achados.length) {
      return achados
        .sort((a, b) => b.pontos - a.pontos || usoDoMed(b.med) - usoDoMed(a.med) || a.med.nome.localeCompare(b.med.nome, 'pt-BR'))
        .slice(0, 8);
    }

    // Nada bateu: procura o nome mais parecido.
    const q = termos[0];
    const tolerancia = q.length <= 3 ? 0 : q.length <= 5 ? 1 : 2;
    if (!tolerancia) return [];
    return MEDS
      .map((med) => {
        const palavras = norm(`${med.nome} ${med.sinonimos || ''}`).split(/[\s+]+/).filter(Boolean);
        // Compara com o começo de cada palavra, com folga de letras a mais ou a menos.
        const d = Math.min(...palavras.map((p) => Math.min(...[-1, 0, 1, 2].map((folga) => distancia(q, p.slice(0, Math.max(1, q.length + folga)))))));
        return { med, termosDose: [], aprox: true, d };
      })
      .filter((r) => r.d <= tolerancia)
      .sort((a, b) => a.d - b.d || usoDoMed(b.med) - usoDoMed(a.med))
      .slice(0, 5);
  }

  // Etapa 2: dosagens do medicamento escolhido, filtradas pelo que for digitado.
  function buscarDosagens(med, consulta) {
    const termos = norm(consulta).split(/\s+/).filter(Boolean);
    const todas = med.apresentacoes.map((ap) => ({ med, ap }));
    const filtradas = todas.filter((e) => termos.every((t) => chaveDaDose(e.ap).includes(t)));
    return filtradas.length ? filtradas : todas;
  }

  // Destaca no nome o trecho que o médico já digitou.
  function realcar(nome, termo) {
    const n = norm(nome);
    let i = n.startsWith(termo) ? 0 : n.search(new RegExp('[\\s+]' + paraRegex(termo)));
    if (i > 0) i += 1;
    if (i < 0) i = n.indexOf(termo);
    if (i < 0 || !termo) return esc(nome);
    return `${esc(nome.slice(0, i))}<mark>${esc(nome.slice(i, i + termo.length))}</mark>${esc(nome.slice(i + termo.length))}`;
  }

  // Atalhos e modelos ficam logo abaixo do campo, sempre à mão. Só mudam quando o uso ou os modelos mudam;
  // redesenhar a cada foco destruiria o botão no meio do clique.
  function renderAtalhos() {
    $('#atalhosTitulo').textContent = Object.keys(estado.uso).length ? 'Mais usados' : 'Comuns no plantão';
    $('#atalhos').innerHTML = atalhos().map((e) => `
      <li><button type="button" class="atalho" data-ap="${esc(e.ap.id)}">${esc(e.med.nome)} <span>${esc(e.ap.conc)}</span></button></li>`).join('');
    $('#modelosBox').hidden = !estado.modelos.length;
    renderAcumulado();
  }

  // Busca que não acha nada mostra o que falta na base. Só registra quando o médico para de digitar.
  let semResultadoTimer;
  function anotarSemResultado(consulta) {
    const q = norm(consulta).trim();
    if (q.length < 4) return;
    semResultadoTimer = setTimeout(() => {
      const lista = estado.metricas.semResultado;
      if (norm($('#busca').value).trim() !== q || lista.includes(q)) return;
      lista.push(q);
      if (lista.length > 30) lista.shift();
      guarda.gravar('metricas', estado.metricas);
    }, 1500);
  }

  // O painel de resultados só existe enquanto há algo a escolher e o médico está na linha de escrita.
  function renderResultados() {
    clearTimeout(semResultadoTimer);
    const busca = $('#busca');
    const consulta = busca.value;
    const lista = $('#resultados');
    const titulo = $('#resultadosTitulo');
    const fantasma = $('#buscaFantasma');
    const naDose = estado.etapa === 'dose';
    const vazia = !consulta.trim();
    const naLinha = $('#compor').contains(document.activeElement);

    $('#buscaMed').hidden = !naDose;
    $('#pop').classList.toggle('pop--aberto', naDose || (!vazia && naLinha));
    busca.placeholder = naDose ? 'Escolha a dosagem' : (estado.itens.length ? 'Adicionar outro medicamento' : 'Adicionar medicamento');
    busca.setAttribute('aria-expanded', naDose || !vazia);
    fantasma.innerHTML = '';

    if (naDose) {
      $('#buscaMed').innerHTML = `${esc(estado.med.nome)} <span aria-hidden="true">×</span>`;
      estado.resultados = buscarDosagens(estado.med, consulta);
      estado.sel = Math.min(estado.sel, estado.resultados.length - 1);
      titulo.textContent = 'Escolha a dosagem';
      lista.innerHTML = estado.resultados.map((e, i) => `
        <li class="dose${i === estado.sel ? ' dose--sel' : ''}" role="option" aria-selected="${i === estado.sel}" data-ap="${esc(e.ap.id)}">
          <span class="dose__conc">${esc(e.ap.conc)}</span>
          <span class="dose__forma">${esc(e.ap.forma)} · ${esc(VIAS[e.ap.via].toLowerCase())}</span>
          <span class="dose__pos">${esc(posologiasDe(e.ap)[0].rotulo)}</span>
        </li>`).join('');
      return;
    }

    if (vazia) {
      estado.resultados = [];
      titulo.textContent = '';
      lista.innerHTML = '';
      return;
    }

    estado.resultados = buscarMedicamentos(consulta);
    estado.sel = Math.min(estado.sel, Math.max(0, estado.resultados.length - 1));
    if (!estado.resultados.length) {
      titulo.textContent = '';
      lista.innerHTML = `<li class="resultados__nada">Nada encontrado para “${esc(consulta.trim())}”. Tente o nome genérico.</li>`;
      anotarSemResultado(consulta);
      return;
    }

    const primeiroTermo = norm(consulta).split(/\s+/).filter(Boolean)[0];
    titulo.textContent = estado.resultados[0].aprox ? 'Você quis dizer' : '';
    lista.innerHTML = estado.resultados.map((r, i) => `
      <li class="res${i === estado.sel ? ' res--sel' : ''}" role="option" aria-selected="${i === estado.sel}" data-med="${esc(r.med.id)}">
        <span class="res__nome">${r.aprox ? esc(r.med.nome) : realcar(r.med.nome, primeiroTermo)}${r.med.antimicrobiano ? ' <span class="selo">2 vias</span>' : ''}</span>
        <span class="res__meta">${r.med.apresentacoes.map((ap) => esc(ap.conc)).join(' · ')}</span>
        <span class="res__pos">${esc(r.med.classe)}</span>
      </li>`).join('');

    // Completa em cinza o nome do primeiro resultado quando ele começa pelo que foi digitado.
    const topo = estado.resultados[estado.sel].med.nome;
    if (norm(topo).startsWith(norm(consulta)) && topo.length > consulta.length) {
      fantasma.innerHTML = `<i>${esc(consulta)}</i>${esc(topo.slice(consulta.length))}`;
    }
  }

  function escolherMedicamento(medId, termosDose) {
    const med = MEDS.find((m) => m.id === medId);
    if (!med) return;
    estado.etapa = 'dose';
    estado.med = med;
    estado.sel = 0;
    const busca = $('#busca');
    busca.value = (termosDose || []).join(' ');
    renderResultados();
    busca.focus();
  }

  function voltarParaNome(texto) {
    estado.etapa = 'nome';
    estado.med = null;
    estado.sel = 0;
    $('#busca').value = texto;
    renderResultados();
  }

  function escolherDosagem(apId) {
    const item = adicionar(apId);
    if (!item) return;
    voltarParaNome('');
    renderAtalhos();
    renderItens(item.uid);
    $('#compor').scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (comMouse()) $('#busca').focus();
  }

  /* ------------------------------------------------------------------ */
  /* Itens: escritos e editados na própria receita                       */
  /* ------------------------------------------------------------------ */

  function posologiasDe(ap) {
    const lista = ap.posologias.slice();
    const meu = estado.padroes[ap.id];
    if (meu) lista.unshift({ rotulo: 'Meu padrão', texto: meu.texto, qtd: meu.qtd, meu: true });
    return lista;
  }

  function adicionar(apId, pronto) {
    const e = POR_AP.get(apId);
    if (!e) return null;
    const base = posologiasDe(e.ap)[0];
    const item = {
      uid: ++seq,
      apId,
      texto: pronto ? pronto.texto : base.texto,
      qtd: pronto ? pronto.qtd : base.qtd,
      qtdTocada: false,
    };
    estado.itens.push(item);
    marcarInicio();
    estado.uso[apId] = (estado.uso[apId] || 0) + 1;
    guarda.gravar('uso', estado.uso);
    return item;
  }

  const viaDe = (it) => POR_AP.get(it.apId).ap.via;
  const temAntimicrobiano = () => estado.itens.some((it) => POR_AP.get(it.apId).med.antimicrobiano);
  const textoFoiAlterado = (it) => !posologiasDe(POR_AP.get(it.apId).ap).some((p) => p.texto === it.texto);
  const pedeConferencia = (it) => textoFoiAlterado(it) && !it.qtdTocada;

  function gruposPorVia() {
    const grupos = [];
    estado.itens.forEach((it) => {
      const { med, ap } = POR_AP.get(it.apId);
      let g = grupos.find((x) => x.via === ap.via);
      if (!g) grupos.push(g = { via: ap.via, itens: [] });
      g.itens.push({ it, med, ap });
    });
    return grupos;
  }

  const ICONE = {
    subir: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14.5 6-6 6 6"/></svg>',
    descer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9.5 6 6 6-6"/></svg>',
    remover: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  };

  // novoUid: item que acabou de entrar; ele assenta na folha e mantém suas opções à mostra.
  function renderItens(novoUid) {
    let n = 0;
    $('#itens').innerHTML = gruposPorVia().map((g) => `
      <section class="via">
        <h3 class="via__nome">${esc(VIAS[g.via])}</h3>
        <ol class="rx">
          ${g.itens.map(({ it, med, ap }, i) => {
            const opcoes = posologiasDe(ap);
            const meu = estado.padroes[ap.id];
            const ehMeuPadrao = meu && meu.texto === it.texto && meu.qtd === it.qtd;
            return `
            <li class="rx__item${it.uid === novoUid ? ' rx__item--novo' : ''}" data-uid="${it.uid}">
              <div class="rx__linha">
                <span class="rx__n">${++n}.</span>
                <span class="rx__nome">${esc(med.nome)} <span class="rx__conc">${esc(ap.conc)}</span></span>
                <span class="rx__forma">${esc(ap.forma)}</span>
                <input class="rx__qtd" type="text" value="${esc(it.qtd)}" size="${Math.max(8, it.qtd.length + 1)}" aria-label="Quantidade de ${esc(med.nome)}">
              </div>
              <textarea class="rx__uso" rows="1" aria-label="Como usar ${esc(med.nome)}">${esc(it.texto)}</textarea>
              <div class="rx__opcoes">
                <span class="rx__conferir"${pedeConferencia(it) ? '' : ' hidden'}>Confira a quantidade</span>
                ${opcoes.map((p, j) => `<button type="button" class="chip${p.texto === it.texto ? ' chip--on' : ''}${p.meu ? ' chip--meu' : ''}" data-pos="${j}" aria-pressed="${p.texto === it.texto}">${esc(p.rotulo)}</button>`).join('')}
                <button type="button" class="rx__link" data-acao="padrao">${ehMeuPadrao ? 'Remover meu padrão' : 'Salvar como meu padrão'}</button>
                <span class="rx__mover">
                  <button type="button" data-acao="subir" aria-label="Mover ${esc(med.nome)} para cima"${i === 0 ? ' disabled' : ''}>${ICONE.subir}</button>
                  <button type="button" data-acao="descer" aria-label="Mover ${esc(med.nome)} para baixo"${i === g.itens.length - 1 ? ' disabled' : ''}>${ICONE.descer}</button>
                  <button type="button" data-acao="remover" aria-label="Remover ${esc(med.nome)}">${ICONE.remover}</button>
                </span>
              </div>
            </li>`;
          }).join('')}
        </ol>
      </section>`).join('');

    $$('#itens .rx__uso').forEach(ajustarAltura);
    atualizarFolha();
  }

  // Troca de lugar com o vizinho da mesma via, que é o que muda a ordem na receita.
  function mover(idx, direcao) {
    const via = viaDe(estado.itens[idx]);
    let j = idx + direcao;
    while (j >= 0 && j < estado.itens.length && viaDe(estado.itens[j]) !== via) j += direcao;
    if (j < 0 || j >= estado.itens.length) return;
    [estado.itens[idx], estado.itens[j]] = [estado.itens[j], estado.itens[idx]];
  }

  function aoClicarItem(ev) {
    const li = ev.target.closest('.rx__item');
    if (!li) return;
    const idx = estado.itens.findIndex((it) => it.uid === Number(li.dataset.uid));
    const it = estado.itens[idx];
    if (!it) return;
    const { med, ap } = POR_AP.get(it.apId);

    const chip = ev.target.closest('[data-pos]');
    if (chip) {
      const p = posologiasDe(ap)[Number(chip.dataset.pos)];
      it.texto = p.texto;
      it.qtd = p.qtd;
      it.qtdTocada = false;
      renderItens();
      return;
    }

    const acao = ev.target.closest('[data-acao]')?.dataset.acao;
    if (!acao) return;
    if (acao === 'remover') estado.itens.splice(idx, 1);
    if (acao === 'subir') mover(idx, -1);
    if (acao === 'descer') mover(idx, 1);
    if (acao === 'padrao') {
      const atual = estado.padroes[ap.id];
      if (atual && atual.texto === it.texto && atual.qtd === it.qtd) {
        delete estado.padroes[ap.id];
        avisar(`Padrão removido de ${med.nome} ${ap.conc}.`);
      } else {
        estado.padroes[ap.id] = { texto: it.texto, qtd: it.qtd };
        avisar(`Salvo. ${med.nome} ${ap.conc} agora entra assim.`);
      }
      guarda.gravar('padroes', estado.padroes);
    }
    renderItens();
    renderResultados();
  }

  function aoDigitarItem(ev) {
    const li = ev.target.closest('.rx__item');
    if (!li) return;
    const it = estado.itens.find((x) => x.uid === Number(li.dataset.uid));
    if (!it) return;

    if (ev.target.matches('.rx__uso')) {
      it.texto = ev.target.value;
      ajustarAltura(ev.target);
      const opcoes = posologiasDe(POR_AP.get(it.apId).ap);
      $$('[data-pos]', li).forEach((b, j) => {
        const on = opcoes[j].texto === it.texto;
        b.classList.toggle('chip--on', on);
        b.setAttribute('aria-pressed', on);
      });
    } else if (ev.target.matches('.rx__qtd')) {
      it.qtd = ev.target.value;
      it.qtdTocada = true;
      ev.target.size = Math.max(8, it.qtd.length + 1);
    }
    $('.rx__conferir', li).hidden = !pedeConferencia(it);
    atualizarFolha();
  }

  /* ------------------------------------------------------------------ */
  /* Folha: cabeçalho, rodapé, pendências e impressão                    */
  /* ------------------------------------------------------------------ */

  const dataPorExtenso = () => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const crmFormatado = (pf) => (pf.crm ? `CRM${pf.uf ? '-' + esc(pf.uf.toUpperCase()) : ''} ${esc(pf.crm)}` : '');
  const localDaUnidade = (pf) => [pf.endereco, pf.cidade, pf.telefone].filter(Boolean).map(esc).join(' · ');

  function pendencias() {
    if (!estado.itens.length) return [];
    const lista = [];
    const pac = estado.paciente;
    if (!pac.nome.trim()) lista.push('Falta o nome do paciente.');
    if (temAntimicrobiano() && (!pac.idade.trim() || !pac.sexo)) lista.push('Receita de antimicrobiano precisa de idade e sexo do paciente.');
    const comLacuna = estado.itens.filter((it) => /_{2,}/.test(it.texto)).map((it) => POR_AP.get(it.apId).med.nome);
    if (comLacuna.length) lista.push(`Preencha a dose (____) em: ${comLacuna.join(', ')}.`);
    return lista;
  }

  // O que o médico já construiu aqui. Só fatos medidos: nada de estimativa de tempo economizado.
  function renderAcumulado() {
    const m = estado.metricas;
    const el = $('#acumulado');
    el.hidden = !m.receitas;
    if (!m.receitas) return;
    const partes = [
      `${m.receitas} ${m.receitas === 1 ? 'receita feita' : 'receitas feitas'} neste aparelho`,
      `tempo médio de ${duracao(Math.round(m.segundos / m.receitas))}`,
    ];
    const padroes = Object.keys(estado.padroes).length;
    const modelos = estado.modelos.length;
    if (padroes) partes.push(`${padroes} ${padroes === 1 ? 'padrão seu' : 'padrões seus'}`);
    if (modelos) partes.push(`${modelos} ${modelos === 1 ? 'modelo' : 'modelos'}`);
    el.textContent = partes.join(' · ');
  }

  // Atualiza o que muda em volta dos itens, sem mexer nos campos em que o médico está digitando.
  function atualizarFolha() {
    const pf = estado.perfil;
    // Valor primeiro, pedido depois: os dados do médico só são cobrados quando já existe receita na folha.
    const pedir = estado.itens.length > 0;
    const primeiroUso = !estado.itens.length && !estado.metricas.receitas;

    $('#inicio').hidden = !primeiroUso;
    $('#btnExemplo').hidden = !primeiroUso;
    renderAcumulado();

    $('#folhaCab').innerHTML = `
      <button type="button" class="folha__editar" data-abrir="perfil" title="Editar meus dados">
        <p class="folha__unidade">${pf.unidade ? esc(pf.unidade) : (pedir ? '<span class="falta">Preencher dados da unidade</span>' : '<span class="folha__vago">Sua unidade</span>')}</p>
        <p class="folha__local">${localDaUnidade(pf)}</p>
      </button>
      <p class="folha__tipo">Receituário</p>`;

    $('#folhaRodape').innerHTML = `
      <p class="folha__data">${pf.cidade ? esc(pf.cidade) + ', ' : ''}${dataPorExtenso()}</p>
      <div class="folha__assina">
        <span class="folha__traco"></span>
        <button type="button" class="folha__editar" data-abrir="perfil" title="Editar meus dados">
          <p class="folha__medico">${pf.nome ? esc(pf.nome) : (pedir ? '<span class="falta">Preencher nome e CRM</span>' : '<span class="folha__vago">Seu nome e CRM</span>')}</p>
          <p class="folha__crm">${crmFormatado(pf)}</p>
          ${pf.especialidade ? `<p class="folha__esp">${esc(pf.especialidade)}</p>` : ''}
        </button>
      </div>`;

    $('#carimbo').hidden = !temAntimicrobiano();
    $('#pendencias').innerHTML = pendencias().map((p) => `<li>${esc(p)}</li>`).join('');
  }

  // Versão limpa para o papel: só texto, sem campos nem opções.
  function folhaParaImprimir(via) {
    const pf = estado.perfil;
    const pac = estado.paciente;
    let n = 0;
    const corpo = gruposPorVia().map((g) => `
      <section class="via">
        <h3 class="via__nome">${esc(VIAS[g.via])}</h3>
        <ol class="rx">
          ${g.itens.map(({ it, med, ap }) => `
            <li class="rx__item">
              <div class="rx__linha">
                <span class="rx__n">${++n}.</span>
                <span class="rx__nome">${esc(med.nome)} <span class="rx__conc">${esc(ap.conc)}</span></span>
                <span class="rx__forma">${esc(ap.forma)}</span>
                <span class="rx__pontos" aria-hidden="true"></span>
                <span class="rx__qtd">${esc(it.qtd)}</span>
              </div>
              <p class="rx__uso">${esc(it.texto)}</p>
            </li>`).join('')}
        </ol>
      </section>`).join('');
    const orientacoes = estado.orientacoes.trim() ? `
      <section class="via">
        <h3 class="via__nome">Orientações</h3>
        <p class="rx__orienta">${esc(estado.orientacoes.trim())}</p>
      </section>` : '';

    return `
      <header class="folha__cab">
        <div>
          <p class="folha__unidade">${esc(pf.unidade || '')}</p>
          <p class="folha__local">${localDaUnidade(pf)}</p>
        </div>
        <p class="folha__tipo">Receituário${via ? ` · ${esc(via)}` : ''}</p>
      </header>
      <dl class="pacp">
        <div><dt>Paciente</dt><dd>${esc(pac.nome)}</dd></div>
        <div><dt>Idade</dt><dd>${esc(pac.idade)}</dd></div>
        <div><dt>Sexo</dt><dd>${esc(pac.sexo)}</dd></div>
        ${pac.endereco.trim() ? `<div class="pacp__end"><dt>Endereço</dt><dd>${esc(pac.endereco)}</dd></div>` : ''}
      </dl>
      <div class="folha__corpo">
        ${corpo}${orientacoes}
        <p class="rx__fim">Fim da prescrição</p>
        ${temAntimicrobiano() ? '<p class="atb">Antimicrobiano · válida por 10 dias</p>' : ''}
      </div>
      <footer class="folha__rodape">
        <p class="folha__data">${pf.cidade ? esc(pf.cidade) + ', ' : ''}${dataPorExtenso()}</p>
        <div class="folha__assina">
          <span class="folha__traco"></span>
          <p class="folha__medico">${esc(pf.nome || '')}</p>
          <p class="folha__crm">${crmFormatado(pf)}</p>
          ${pf.especialidade ? `<p class="folha__esp">${esc(pf.especialidade)}</p>` : ''}
        </div>
      </footer>`;
  }

  function textoDaReceita() {
    let n = 0;
    const itens = gruposPorVia().map((g) => {
      const linhas = g.itens.map(({ it, med, ap }) => `${++n}. ${med.nome} ${ap.conc}, ${ap.forma} — ${it.qtd}\n   ${it.texto}`);
      return `${VIAS[g.via].toUpperCase()}\n${linhas.join('\n')}`;
    }).join('\n\n');
    return itens + (estado.orientacoes.trim() ? `\n\nORIENTAÇÕES\n${estado.orientacoes.trim()}` : '');
  }

  // Receita pronta: é aqui que o produto cumpre o que promete, então o tempo medido aparece na hora.
  // Devolve a frase com o tempo, ou vazio se esta receita já foi contada ou é o exemplo.
  function concluir() {
    if (estado.concluida || !estado.inicio || estado.exemplo) return '';
    estado.concluida = true;
    // Teto de 15 minutos: acima disso o médico saiu e voltou, não estava escrevendo.
    const seg = Math.min(900, Math.max(1, Math.round((Date.now() - estado.inicio) / 1000)));
    const m = estado.metricas;
    m.receitas += 1;
    m.segundos += seg;
    // Posologia reescrita à mão indica que o padrão da base não é o que o médico usa.
    estado.itens.filter(textoFoiAlterado).forEach((it) => {
      const { med, ap } = POR_AP.get(it.apId);
      const anterior = m.alteradas[it.apId];
      m.alteradas[it.apId] = { nome: `${med.nome} ${ap.conc}`, texto: it.texto.trim(), vezes: (anterior ? anterior.vezes : 0) + 1 };
    });
    guarda.gravar('metricas', m);
    renderAcumulado();
    renderPerfil();
    return m.receitas === 1 ? `Sua primeira receita ficou pronta em ${duracao(seg)}.` : `Receita pronta em ${duracao(seg)}.`;
  }

  // forcar: imprime mesmo sem nome e CRM (o médico decidiu assim, ou acabou de sair do preenchimento).
  function imprimir(forcar) {
    if (!estado.itens.length) return avisar('Escolha um medicamento antes de imprimir.');
    // Os dados do médico são pedidos aqui, na hora em que fazem falta, e uma vez só.
    if (!forcar && !(estado.perfil.nome && estado.perfil.crm)) {
      estado.imprimirAoSalvar = true;
      return abrirPerfil('Falta seu nome e CRM para a receita sair completa. Você preenche uma vez só e fica salvo neste navegador.');
    }
    // RDC 471/2021, art. 10: a 2ª via fica retida na farmácia e a 1ª volta com o paciente.
    const vias = temAntimicrobiano() ? ['1ª via · paciente', '2ª via · retenção na farmácia'] : [''];
    $('#impressao').innerHTML = vias.map((v) => `<article class="folha folha--impressa">${folhaParaImprimir(v)}</article>`).join('');
    const tempo = concluir();
    window.print();
    if (tempo) avisar(tempo);
  }

  /* ------------------------------------------------------------------ */
  /* Modelos                                                             */
  /* ------------------------------------------------------------------ */

  function renderModelos() {
    $('#modelos').innerHTML = estado.modelos.map((m) => `
      <li class="modelo">
        <button type="button" class="modelo__usar" data-modelo="${esc(m.id)}">${esc(m.nome)} <span>${m.itens.length} ${m.itens.length === 1 ? 'item' : 'itens'}</span></button>
        <button type="button" class="modelo__del" data-excluir="${esc(m.id)}" aria-label="Excluir modelo ${esc(m.nome)}">×</button>
      </li>`).join('');
    renderAtalhos();
  }

  function aoClicarModelo(ev) {
    const usar = ev.target.closest('[data-modelo]');
    if (usar) {
      const m = estado.modelos.find((x) => x.id === usar.dataset.modelo);
      if (!m) return;
      const entrou = m.itens.map((i) => adicionar(i.apId, i)).filter(Boolean).length;
      if (m.orientacoes && !estado.orientacoes.trim()) {
        estado.orientacoes = m.orientacoes;
        preencherCampos();
      }
      renderItens();
      renderAtalhos();
      avisar(`${m.nome}: ${entrou} ${entrou === 1 ? 'item escrito' : 'itens escritos'} na receita.`);
      return;
    }
    const del = ev.target.closest('[data-excluir]');
    if (del) {
      const i = estado.modelos.findIndex((x) => x.id === del.dataset.excluir);
      if (i < 0) return;
      const [removido] = estado.modelos.splice(i, 1);
      guarda.gravar('modelos', estado.modelos);
      renderModelos();
      avisar(`Modelo “${removido.nome}” excluído.`, 'Desfazer', () => {
        estado.modelos.splice(i, 0, removido);
        guarda.gravar('modelos', estado.modelos);
        renderModelos();
      });
    }
  }

  function salvarModelo(nome) {
    estado.modelos.unshift({
      id: 'm' + Date.now().toString(36),
      nome,
      itens: estado.itens.map((it) => ({ apId: it.apId, texto: it.texto, qtd: it.qtd })),
      orientacoes: estado.orientacoes.trim(),
    });
    guarda.gravar('modelos', estado.modelos);
    renderModelos();
    avisar(`Modelo “${nome}” salvo.`);
  }

  /* ------------------------------------------------------------------ */
  /* Prontuário                                                          */
  /* ------------------------------------------------------------------ */

  let fichas = [];
  const maiuscula = (t) => t.replace(/^([a-zà-ÿ])/, (c) => c.toUpperCase());
  const maiusculaNasFrases = (t) => t.replace(/(^|[.!?]\s+)([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
  // Palavra inteira: "hidratado" não pode casar dentro de "desidratado".
  const fraseRe = (frase) => new RegExp('(?<![\\p{L}\\p{N}])' + paraRegex(frase) + '(?![\\p{L}\\p{N}])', 'iu');
  const contem = (texto, frase) => fraseRe(frase).test(texto);

  function incluirFrase(texto, ficha) {
    const v = texto.replace(/\s+$/, '');
    if (ficha.token) {
      if (!v) return maiuscula(ficha.t);
      return /[.!?:]$/.test(v) ? `${v} ${maiuscula(ficha.t)}` : `${v}, ${ficha.t}`;
    }
    if (!v) return ficha.t;
    return `${/[.!?]$/.test(v) ? v : v + '.'} ${ficha.t}`;
  }

  function retirarFrase(texto, frase) {
    const achado = fraseRe(frase).exec(texto);
    if (!achado) return texto;
    const limpo = (texto.slice(0, achado.index) + texto.slice(achado.index + achado[0].length))
      .replace(/\s+,/g, ',')
      .replace(/,(\s*,)+/g, ',')
      .replace(/\.\s*,\s*/g, '. ')
      .replace(/,\s*\./g, '.')
      .replace(/\.(\s*\.)+/g, '.')
      .replace(/^[\s,.;]+/, '')
      .replace(/,\s*$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return maiusculaNasFrases(limpo);
  }

  function gruposDaSecao(id) {
    const queixa = PRONT.queixas.find((q) => q.id === estado.pront.queixa);
    if (id === 'qp') return queixa.qp.length ? [{ grupo: '', chips: queixa.qp }] : [];
    if (id === 'hda') return [{ grupo: '', chips: queixa.hda }];
    if (id === 'hd') return queixa.hd.length ? [{ grupo: '', chips: queixa.hd }] : [];
    return PRONT.comuns[id] || [];
  }

  function renderQueixas() {
    $('#queixas').innerHTML = PRONT.queixas.map((q) => `
      <button type="button" class="chip chip--queixa${q.id === estado.pront.queixa ? ' chip--on' : ''}" role="radio" aria-checked="${q.id === estado.pront.queixa}" data-queixa="${esc(q.id)}">${esc(q.nome)}</button>`).join('');
  }

  function renderSecoes() {
    fichas = [];
    $('#secoes').innerHTML = PRONT.secoes.map((s) => {
      const valor = estado.pront.sec[s.id] || '';
      const grupos = gruposDaSecao(s.id).map((g) => `
        <div class="sec__grupo">
          ${g.grupo ? `<span class="sec__rotulo">${esc(g.grupo)}</span>` : ''}
          ${g.chips.map((c) => {
            fichas.push(c);
            const on = contem(valor, c.t);
            return `<button type="button" class="chip${on ? ' chip--on' : ''}" aria-pressed="${on}" data-ficha="${fichas.length - 1}">${esc(c.t)}</button>`;
          }).join('')}
        </div>`).join('');
      return `
        <section class="sec" data-sec="${esc(s.id)}">
          <div class="sec__cab">
            <h3 class="via__nome">${esc(s.titulo)}</h3>
            <button type="button" class="sec__copiar" data-copiar-sec aria-label="Copiar ${esc(s.titulo)}">Copiar</button>
          </div>
          <textarea class="sec__texto" rows="1" placeholder="${esc(s.dica)}" aria-label="${esc(s.titulo)}">${esc(valor)}</textarea>
          <div class="chips">${grupos}${s.id === 'cd' ? '<div class="sec__grupo"><button type="button" class="chip chip--acao" data-inserir-rx>+ Inserir prescrição atual</button></div>' : ''}</div>
        </section>`;
    }).join('');
    $$('#secoes .sec__texto').forEach(ajustarAltura);
  }

  function marcarFichas(sec) {
    const valor = $('.sec__texto', sec).value;
    $$('[data-ficha]', sec).forEach((b) => {
      const on = contem(valor, fichas[Number(b.dataset.ficha)].t);
      b.classList.toggle('chip--on', on);
      b.setAttribute('aria-pressed', on);
    });
  }

  function resumoDaPrescricao() {
    const partes = estado.itens.map((it) => {
      const { med, ap } = POR_AP.get(it.apId);
      const uso = it.texto.trim().replace(/\.$/, '');
      return `${med.nome.toLowerCase()} ${ap.conc} (${uso.charAt(0).toLowerCase() + uso.slice(1)})`;
    });
    return `Prescrito: ${partes.join('; ')}.`;
  }

  function aoClicarSecao(ev) {
    const sec = ev.target.closest('.sec');
    if (!sec) return;
    const area = $('.sec__texto', sec);

    // Os sistemas das UPAs têm um campo para cada parte: aqui sai só o texto desta seção, sem o rótulo.
    if (ev.target.closest('[data-copiar-sec]')) {
      let texto = area.value.trim();
      const titulo = PRONT.secoes.find((s) => s.id === sec.dataset.sec).titulo;
      if (!texto) return avisar(`${titulo}: ainda está vazio.`);
      if (!/[.!?]$/.test(texto)) texto += '.';
      return copiar(texto, `${titulo} copiado. É só colar no campo do sistema.`);
    }

    if (ev.target.closest('[data-inserir-rx]')) {
      if (!estado.itens.length) return avisar('A receita está vazia. Escreva a prescrição primeiro.');
      area.value = incluirFrase(area.value, { t: resumoDaPrescricao(), token: false });
    } else {
      const botao = ev.target.closest('[data-ficha]');
      if (!botao) return;
      const ficha = fichas[Number(botao.dataset.ficha)];
      area.value = contem(area.value, ficha.t) ? retirarFrase(area.value, ficha.t) : incluirFrase(area.value, ficha);
    }
    estado.pront.sec[sec.dataset.sec] = area.value;
    ajustarAltura(area);
    marcarFichas(sec);

    // Leva o cursor para a primeira lacuna, que é o que falta digitar.
    const lacuna = area.value.indexOf('__');
    if (lacuna >= 0 && comMouse()) {
      area.focus();
      area.setSelectionRange(lacuna, lacuna + 2);
    }
  }

  function textoDoProntuario() {
    return PRONT.secoes.map((s) => {
      let v = (estado.pront.sec[s.id] || '').trim();
      if (!v) return '';
      if (!/[.!?]$/.test(v)) v += '.';
      return `${s.rotulo}: ${v}`;
    }).filter(Boolean).join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Perfil, avisos e área de transferência                              */
  /* ------------------------------------------------------------------ */

  const CAMPOS_PERFIL = ['nome', 'crm', 'uf', 'especialidade', 'unidade', 'endereco', 'cidade', 'telefone'];

  function renderPerfil() {
    const pf = estado.perfil;
    const ok = Boolean(pf.nome && pf.crm);
    // O lembrete no menu só aparece depois que o médico já fez uma receita aqui.
    $('#btnMenu').classList.toggle('btn--pendente', !ok && estado.metricas.receitas > 0);
    $('#perfilResumo').textContent = ok ? `Meus dados · ${pf.nome}` : 'Preencher meus dados';
  }

  // O que este aparelho registrou, pronto para o médico mandar a quem cuida do sistema.
  function dadosDoResumo() {
    const m = estado.metricas;
    const maisUsados = Object.entries(estado.uso)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .filter(([apId]) => POR_AP.has(apId))
      .map(([apId, n]) => { const { med, ap } = POR_AP.get(apId); return `${med.nome} ${ap.conc} (${n})`; });
    return {
      receitas: m.receitas,
      media: m.receitas ? duracao(Math.round(m.segundos / m.receitas)) : '',
      maisUsados,
      semResultado: m.semResultado.slice(),
      alteradas: Object.values(m.alteradas).sort((a, b) => b.vezes - a.vezes),
    };
  }

  function textoDoResumo() {
    const r = dadosDoResumo();
    const linhas = ['Rx Plantão: resumo de uso', `Receitas feitas: ${r.receitas}${r.media ? ` (tempo médio de ${r.media})` : ''}`];
    if (r.maisUsados.length) linhas.push(`Mais usados: ${r.maisUsados.join(', ')}`);
    linhas.push(`Buscas sem resultado: ${r.semResultado.length ? r.semResultado.join(', ') : 'nenhuma'}`);
    if (r.alteradas.length) {
      linhas.push('Posologias que reescrevi:');
      r.alteradas.forEach((a) => linhas.push(`- ${a.nome}: "${a.texto}" (${a.vezes}x)`));
    } else {
      linhas.push('Posologias que reescrevi: nenhuma');
    }
    return linhas.join('\n');
  }

  function abrirResumo() {
    const r = dadosDoResumo();
    const lista = (itens) => (itens.length ? `<ul>${itens.map((i) => `<li>${i}</li>`).join('')}</ul>` : '<p class="resumo__vazio">Nada até agora.</p>');
    $('#resumoCorpo').innerHTML = `
      <div class="resumo__numeros">
        <p><strong>${r.receitas}</strong><span>${r.receitas === 1 ? 'receita feita' : 'receitas feitas'}</span></p>
        <p><strong>${r.media || '—'}</strong><span>tempo médio</span></p>
      </div>
      <h3>Mais usados</h3>${lista(r.maisUsados.map(esc))}
      <h3>Buscas sem resultado</h3>${lista(r.semResultado.map(esc))}
      <h3>Posologias que você reescreveu</h3>${lista(r.alteradas.map((a) => `<strong>${esc(a.nome)}</strong> ${esc(a.texto)} <span>${a.vezes}x</span>`))}`;
    abrirDialogo('#dlgResumo');
  }

  // returnValue sobrevive entre aberturas; sem zerar, um Esc repetiria o último "salvar".
  function abrirDialogo(sel) {
    const dlg = $(sel);
    dlg.returnValue = '';
    dlg.showModal();
  }

  const PERFIL_SUB = 'Aparecem no cabeçalho e na assinatura da receita. Ficam salvos só neste navegador.';

  // motivo: por que o preenchimento está sendo pedido agora (por exemplo, na hora de imprimir).
  function abrirPerfil(motivo) {
    const form = $('#formPerfil');
    CAMPOS_PERFIL.forEach((c) => { form.elements[c].value = estado.perfil[c] || ''; });
    $('#dlgPerfilSub').textContent = typeof motivo === 'string' ? motivo : PERFIL_SUB;
    abrirDialogo('#dlgPerfil');
  }

  let avisoTimer;
  function avisar(msg, rotuloAcao, acao) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${rotuloAcao ? `<button type="button">${esc(rotuloAcao)}</button>` : ''}`;
    if (acao) $('button', el).addEventListener('click', () => { acao(); el.classList.remove('toast--on'); });
    el.classList.add('toast--on');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => el.classList.remove('toast--on'), acao ? 6000 : 2600);
  }

  async function copiar(texto, ok) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    avisar(ok);
  }

  function preencherCampos() {
    $('#pacNome').value = estado.paciente.nome;
    $('#pacIdade').value = estado.paciente.idade;
    $('#pacSexo').value = estado.paciente.sexo;
    $('#pacEndereco').value = estado.paciente.endereco;
    $('#cmpEndereco').hidden = !estado.paciente.endereco;
    $('#btnEndereco').hidden = Boolean(estado.paciente.endereco);
    $('#orientacoes').value = estado.orientacoes;
    ajustarAltura($('#orientacoes'));
  }

  function novaReceita() {
    const vazia = !estado.itens.length && !estado.orientacoes.trim() && !Object.values(estado.paciente).some((v) => v.trim());
    if (vazia) return $('#busca').focus();
    const antes = { itens: estado.itens, paciente: { ...estado.paciente }, orientacoes: estado.orientacoes };
    const relogio = { inicio: estado.inicio, concluida: estado.concluida };
    estado.itens = [];
    estado.paciente = { nome: '', idade: '', sexo: '', endereco: '' };
    estado.orientacoes = '';
    estado.inicio = 0;
    estado.concluida = false;
    estado.exemplo = false;
    voltarParaNome('');
    preencherCampos();
    renderItens();
    avisar('Receita em branco.', 'Desfazer', () => {
      estado.itens = antes.itens;
      estado.paciente = antes.paciente;
      estado.orientacoes = antes.orientacoes;
      estado.inicio = relogio.inicio;
      estado.concluida = relogio.concluida;
      preencherCampos();
      renderItens();
      renderResultados();
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (comMouse()) $('#pacNome').focus();
  }

  // Receita de exemplo: mostra o destino antes de o médico escrever a dele. Não conta como uso nem tem tempo medido.
  function carregarExemplo() {
    estado.itens = [];
    estado.inicio = 0;
    estado.concluida = false;
    estado.exemplo = true;
    estado.paciente = { nome: 'Paciente Exemplo', idade: '34 anos', sexo: 'Feminino', endereco: '' };
    ['amoxicilina-500', 'dipirona-500'].forEach((apId) => {
      const p = posologiasDe(POR_AP.get(apId).ap)[0];
      estado.itens.push({ uid: ++seq, apId, texto: p.texto, qtd: p.qtd, qtdTocada: false });
    });
    preencherCampos();
    renderItens();
    renderResultados();
    avisar('Receita de exemplo. Continue escrevendo ou comece outra.', 'Nova receita', novaReceita);
  }

  /* ------------------------------------------------------------------ */
  /* Eventos                                                             */
  /* ------------------------------------------------------------------ */

  function trocarAba(aba) {
    const naReceita = aba === 'prescricao';
    document.body.dataset.tab = aba;
    $('.tabs').dataset.ativo = aba;
    $$('.tabs__btn').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === aba));
    $('#tab-prescricao').hidden = !naReceita;
    $('#tab-prontuario').hidden = naReceita;
    // As ações acompanham a área: imprimir e modelos só fazem sentido na receita.
    $('#btnImprimir').hidden = !naReceita || Boolean(window.RX_SEM_IMPRESSAO);
    $('#btnCopiar').classList.toggle('btn--primario', !naReceita || Boolean(window.RX_SEM_IMPRESSAO));
    $('#btnSalvarModelo').hidden = !naReceita;
    $('#btnLimpar').hidden = !naReceita;
    $('#btnLimparPront').hidden = naReceita;
    $('#btnCopiar').textContent = naReceita ? 'Copiar' : 'Copiar tudo';
    // Campos escondidos medem altura zero; ao aparecer, voltam ao tamanho do texto.
    $$(naReceita ? '#tab-prescricao textarea' : '#secoes .sec__texto').forEach(ajustarAltura);
    window.scrollTo({ top: 0 });
  }

  function fecharMenu() {
    $('#menu').classList.remove('menu--aberto');
    $('#btnMenu').setAttribute('aria-expanded', 'false');
  }

  function limparProntuario() {
    const antes = { ...estado.pront.sec };
    if (!Object.values(antes).some((v) => v && v.trim())) return avisar('O prontuário já está vazio.');
    estado.pront.sec = {};
    renderSecoes();
    avisar('Prontuário limpo.', 'Desfazer', () => {
      estado.pront.sec = antes;
      renderSecoes();
    });
  }

  function ligar() {
    $$('.tabs__btn').forEach((b) => b.addEventListener('click', () => trocarAba(b.dataset.tab)));

    // A divisa do topo só aparece quando há conteúdo passando por baixo dele.
    const aoRolar = () => document.body.classList.toggle('rolou', window.scrollY > 4);
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();

    $('#btnMenu').addEventListener('click', () => {
      const aberto = $('#menu').classList.toggle('menu--aberto');
      $('#btnMenu').setAttribute('aria-expanded', aberto);
    });
    document.addEventListener('pointerdown', (ev) => { if (!ev.target.closest('#menu')) fecharMenu(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fecharMenu(); });
    $('#menuLista').addEventListener('click', fecharMenu);

    [['#pacNome', 'nome'], ['#pacIdade', 'idade'], ['#pacSexo', 'sexo'], ['#pacEndereco', 'endereco']].forEach(([sel, campo]) => {
      $(sel).addEventListener('input', (ev) => {
        estado.paciente[campo] = ev.target.value;
        marcarInicio();
        atualizarFolha();
      });
    });
    // Enter nos dados do paciente leva adiante até a linha de escrita.
    $('#pacNome').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#pacIdade').focus(); });
    $('#pacIdade').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#busca').focus(); });
    $('#btnEndereco').addEventListener('click', () => {
      $('#cmpEndereco').hidden = false;
      $('#btnEndereco').hidden = true;
      $('#pacEndereco').focus();
    });

    const busca = $('#busca');
    busca.addEventListener('input', () => { estado.sel = 0; renderResultados(); });
    busca.addEventListener('keydown', (ev) => {
      const n = estado.resultados.length;
      const naDose = estado.etapa === 'dose';
      const temTexto = Boolean(busca.value.trim());

      if (ev.key === 'ArrowDown' && n) { ev.preventDefault(); estado.sel = (estado.sel + 1) % n; renderResultados(); }
      if (ev.key === 'ArrowUp' && n) { ev.preventDefault(); estado.sel = (estado.sel - 1 + n) % n; renderResultados(); }

      // Enter confirma a etapa. Tab também aceita o nome sugerido.
      if (ev.key === 'Enter' || (ev.key === 'Tab' && !ev.shiftKey && !naDose && temTexto)) {
        if (naDose && n && ev.key === 'Enter') {
          ev.preventDefault();
          escolherDosagem(estado.resultados[estado.sel].ap.id);
        } else if (!naDose && temTexto && n) {
          ev.preventDefault();
          const r = estado.resultados[estado.sel];
          escolherMedicamento(r.med.id, r.termosDose);
        }
      }
      if (ev.key === 'Escape') voltarParaNome('');
      // Apagar com o campo vazio volta para o nome, pronto para corrigir.
      if (ev.key === 'Backspace' && naDose && !busca.value) { ev.preventDefault(); voltarParaNome(estado.med.nome); }
    });
    $('#buscaMed').addEventListener('click', () => { voltarParaNome(''); busca.focus(); });

    // O painel abre e fecha com o foco na linha de escrita.
    $('#compor').addEventListener('focusin', renderResultados);
    $('#compor').addEventListener('focusout', () => setTimeout(renderResultados, 0));
    // Clicar num resultado não pode tirar o foco do campo antes de o clique chegar.
    $('#pop').addEventListener('pointerdown', (ev) => ev.preventDefault());
    $('#pop').addEventListener('click', (ev) => {
      const med = ev.target.closest('[data-med]');
      if (med) {
        const r = estado.resultados.find((x) => x.med && x.med.id === med.dataset.med);
        return escolherMedicamento(med.dataset.med, r && r.termosDose);
      }
      const dose = ev.target.closest('[data-ap]');
      if (dose) escolherDosagem(dose.dataset.ap);
    });
    $('#atalhos').addEventListener('click', (ev) => {
      const atalho = ev.target.closest('[data-ap]');
      if (atalho) escolherDosagem(atalho.dataset.ap);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.target.closest('input, textarea, select, dialog')) return;
      if (document.body.dataset.tab !== 'prescricao') return;
      ev.preventDefault();
      busca.focus();
    });

    $('#itens').addEventListener('click', aoClicarItem);
    $('#itens').addEventListener('input', aoDigitarItem);
    $('#orientacoes').addEventListener('input', (ev) => { estado.orientacoes = ev.target.value; ajustarAltura(ev.target); });
    $('#modelos').addEventListener('click', aoClicarModelo);
    $('#btnLimpar').addEventListener('click', novaReceita);
    $('#btnLimparPront').addEventListener('click', limparProntuario);

    $('#btnImprimir').addEventListener('click', () => imprimir());
    $('#btnExemplo').addEventListener('click', carregarExemplo);
    $('#btnResumo').addEventListener('click', abrirResumo);
    $('#btnCopiarResumo').addEventListener('click', () => {
      $('#dlgResumo').close('copiar');
      copiar(textoDoResumo(), 'Resumo copiado. É só colar na conversa e enviar.');
    });
    // Copiar segue a área em que o médico está.
    $('#btnCopiar').addEventListener('click', () => {
      if (document.body.dataset.tab === 'prontuario') {
        const texto = textoDoProntuario();
        if (!texto) return avisar('O prontuário está vazio.');
        return copiar(texto, 'Prontuário copiado. É só colar no sistema da unidade.');
      }
      if (!estado.itens.length) return avisar('Escolha um medicamento antes de copiar.');
      const tempo = concluir();
      copiar(textoDaReceita(), tempo ? `${tempo} Copiada: é só colar no sistema da unidade.` : 'Prescrição copiada. É só colar no sistema da unidade.');
    });
    $('#btnSalvarModelo').addEventListener('click', () => {
      if (!estado.itens.length) return avisar('Escreva a receita antes de salvar como modelo.');
      $('#formModelo').reset();
      abrirDialogo('#dlgModelo');
    });
    $('#dlgModelo').addEventListener('close', (ev) => {
      const nome = $('#formModelo').elements.nome.value.trim();
      if (ev.target.returnValue === 'salvar' && nome) salvarModelo(nome);
    });

    $$('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close('cancelar')));
    $('#btnPerfil').addEventListener('click', abrirPerfil);
    $('#folha').addEventListener('click', (ev) => { if (ev.target.closest('[data-abrir="perfil"]')) abrirPerfil(); });
    $('#dlgPerfil').addEventListener('close', (ev) => {
      // Se o preenchimento foi pedido na hora de imprimir, a impressão segue de onde parou.
      const iaImprimir = estado.imprimirAoSalvar;
      estado.imprimirAoSalvar = false;
      if (ev.target.returnValue !== 'salvar') {
        if (iaImprimir) avisar('A receita não foi impressa.', 'Imprimir sem meus dados', () => imprimir(true));
        return;
      }
      const dados = Object.fromEntries(new FormData($('#formPerfil')).entries());
      Object.keys(dados).forEach((c) => { dados[c] = dados[c].trim(); });
      estado.perfil = dados;
      guarda.gravar('perfil', dados);
      renderPerfil();
      atualizarFolha();
      if (iaImprimir) return imprimir(true);
      avisar('Dados salvos neste navegador.');
    });

    $('#queixas').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-queixa]');
      if (!b) return;
      estado.pront.queixa = b.dataset.queixa;
      renderQueixas();
      renderSecoes();
    });
    $('#secoes').addEventListener('click', aoClicarSecao);
    $('#secoes').addEventListener('input', (ev) => {
      const sec = ev.target.closest('.sec');
      if (!sec || !ev.target.matches('.sec__texto')) return;
      estado.pront.sec[sec.dataset.sec] = ev.target.value;
      ajustarAltura(ev.target);
      marcarFichas(sec);
    });

    window.addEventListener('afterprint', () => { $('#impressao').innerHTML = ''; });
    window.addEventListener('resize', () => $$('.rx__uso, .rx__orienta, .sec__texto').forEach(ajustarAltura));
  }

  ligar();
  renderPerfil();
  renderModelos();
  renderItens();
  renderQueixas();
  renderSecoes();
  trocarAba('prescricao');
  if (window.RX_EXEMPLO) carregarExemplo();
  // Com teclado, o cursor já começa na linha de escrita: a primeira ação é digitar o remédio.
  else if (comMouse()) $('#busca').focus({ preventScroll: true });
  setTimeout(() => document.body.classList.remove('entrando'), 900);
})();

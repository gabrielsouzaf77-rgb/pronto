/*
  Demonstração: o Pronto no 7º dia de uso de uma plantonista fictícia.

  Só entra com ?demo no endereço (ou window.RX_DEMO_FORCAR, no link privado de teste).
  Os dados abaixo ficam na memória da aba: o app não lê nem grava o armazenamento do
  navegador nesse modo, então quem já usa o Pronto de verdade não perde nada.

  Médica, CRM, unidades e atendimentos são inventados. As posologias vêm da própria base
  (a primeira de cada apresentação), como se ela tivesse escolhido o padrão.
*/
(function () {
  'use strict';

  if (!window.RX_DEMO_FORCAR && !/[?&]demo\b/.test(location.search)) return;

  const AP = new Map();
  window.RX_MEDICAMENTOS.forEach((med) => med.apresentacoes.forEach((ap) => AP.set(ap.id, ap)));
  const item = (apId) => {
    const p = AP.get(apId).posologias[0];
    return { apId, texto: p.texto, qtd: p.qtd };
  };

  const DIA = 86400000;
  const agora = Date.now();
  const haDias = (d, h) => agora - d * DIA - (h || 0) * 3600000;

  const LOCAL_UPA = 'ldemo1';
  const LOCAL_PA = 'ldemo2';
  const campos = window.RX_PRONTUARIO.secoes.map((s) => ({ titulo: s.titulo, base: s.id }));

  // Cada diagnóstico guarda o último atendimento que ela finalizou com aquele nome.
  // As lacunas (__) ficam onde entra o dado de cada paciente.
  const diagnosticos = [
    {
      nome: 'Síndrome gripal', usos: 14, dias: 0, queixa: 'gripal',
      itens: ['dipirona-500', 'loratadina-10', 'soro-nasal-09'],
      orientacoes: 'Hidratação oral abundante e repouso. Retornar se falta de ar, febre por mais de 3 dias ou piora do estado geral.',
      sec: {
        qp: 'Tosse e febre há __ dias.',
        hda: 'Paciente refere tosse seca, coriza e dor no corpo há __ dias, com febre aferida de __ °C. Nega dispneia. Nega dor torácica.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas. Nega uso de medicações contínuas.',
        ef: 'BEG, corado, hidratado, eupneico. Orofaringe hiperemiada, sem exsudato. AR: MV presente bilateralmente, sem ruídos adventícios. PA __ mmHg, FC __ bpm, SatO2 __%, Tax __ °C.',
        hd: 'Síndrome gripal.',
        cd: 'Sintomáticos. Orientado sinais de alarme e retorno.',
      },
    },
    {
      nome: 'ITU baixa não complicada', usos: 9, dias: 1, queixa: 'urinario',
      itens: ['nitrofurantoina-100', 'dipirona-500'],
      orientacoes: 'Aumentar a ingestão de água. Retornar se febre, dor nas costas ou vômitos.',
      sec: {
        qp: 'Ardência ao urinar há __ dias.',
        hda: 'Paciente refere disúria, polaciúria e urgência miccional há __ dias. Nega febre. Nega dor lombar. Nega corrimento vaginal.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas. DUM: __. Nega gestação.',
        ef: 'BEG, corada, hidratada, afebril. Abdome flácido, doloroso à palpação em hipogástrio, sem sinais de irritação peritoneal. Giordano negativo bilateralmente. PA __ mmHg, FC __ bpm, Tax __ °C.',
        hd: 'ITU baixa não complicada.',
        cd: 'Antibioticoterapia oral e analgesia. Orientada quanto a sinais de pielonefrite e retorno.',
      },
    },
    {
      nome: 'Gastroenterite aguda', usos: 8, dias: 0, queixa: 'gastro',
      itens: ['sro-env', 'ondansetrona-4', 'escopolamina-dipirona-cp'],
      orientacoes: 'Soro de reidratação após cada evacuação líquida. Dieta leve e fracionada. Retornar se sangue nas fezes, vômitos persistentes ou sinais de desidratação.',
      sec: {
        qp: 'Diarreia e vômitos há __ dias.',
        hda: 'Paciente refere __ episódios de evacuação líquida por dia, sem sangue ou muco, associados a náuseas e __ episódios de vômito. Dor abdominal em cólica difusa. Nega febre.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas.',
        ef: 'BEG, corado, levemente desidratado (+/4+), afebril. Abdome flácido, RHA aumentados, doloroso difusamente à palpação profunda, sem sinais de irritação peritoneal. PA __ mmHg, FC __ bpm.',
        hd: 'Gastroenterite aguda.',
        cd: 'Hidratação oral, antiemético e antiespasmódico. Orientado sinais de desidratação e retorno.',
      },
    },
    {
      nome: 'Lombalgia mecânica', usos: 7, dias: 2, queixa: 'lombar',
      itens: ['ibuprofeno-600', 'ciclobenzaprina-5', 'dipirona-500'],
      orientacoes: 'Evitar carregar peso e manter-se ativo dentro do tolerável. Compressa morna no local. Retornar se perda de força, formigamento nas pernas ou alteração para urinar.',
      sec: {
        qp: 'Dor nas costas há __ dias.',
        hda: 'Paciente refere dor lombar há __ dias, após esforço físico, sem irradiação, com piora à movimentação. Nega trauma. Nega febre. Nega alteração urinária ou fecal. Nega perda de força.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas.',
        ef: 'BEG, deambulando com dificuldade. Dor à palpação de musculatura paravertebral lombar. Lasègue negativo bilateralmente. Força e sensibilidade preservadas em MMII. Giordano negativo.',
        hd: 'Lombalgia mecânica.',
        cd: 'Analgesia e relaxante muscular. Orientado sinais de alarme e retorno.',
      },
    },
    {
      nome: 'Faringoamigdalite bacteriana', usos: 5, dias: 1, queixa: 'garganta',
      itens: ['amoxicilina-500', 'dipirona-500', 'ibuprofeno-600'],
      orientacoes: 'Completar o antibiótico mesmo com melhora. Alimentação pastosa e fria nos primeiros dias. Retornar se dificuldade para abrir a boca, para engolir saliva ou falta de ar.',
      sec: {
        qp: 'Dor de garganta e febre há __ dias.',
        hda: 'Paciente refere odinofagia e febre aferida de __ °C há __ dias. Nega tosse. Nega coriza.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas.',
        ef: 'REG, corado, hidratado, febril (Tax __ °C). Orofaringe com hiperemia e hipertrofia amigdaliana com exsudato purulento bilateral. Linfonodos cervicais anteriores dolorosos à palpação. Sem abaulamento de palato.',
        hd: 'Faringoamigdalite bacteriana.',
        cd: 'Antibioticoterapia oral, analgesia e antitérmico. Orientado retorno.',
      },
    },
    {
      nome: 'Cefaleia tensional', usos: 4, dias: 3, queixa: 'cefaleia',
      itens: ['dipirona-1g', 'ciclobenzaprina-5'],
      orientacoes: 'Repouso em ambiente calmo, hidratação e sono regular. Retornar se a dor mudar de padrão, vier com febre, vômitos, rigidez de nuca ou alteração neurológica.',
      sec: {
        qp: 'Dor de cabeça há __.',
        hda: 'Paciente refere cefaleia em aperto, bilateral, de intensidade moderada, há __, sem náuseas, sem foto ou fonofobia. Nega febre. Nega trauma. Padrão semelhante a episódios prévios.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas.',
        ef: 'BEG, corado, hidratado, afebril. Sem rigidez de nuca. Glasgow 15, pupilas isocóricas e fotorreagentes, sem déficits focais. PA __ mmHg.',
        hd: 'Cefaleia tensional.',
        cd: 'Analgesia. Orientados sinais de alarme e retorno.',
      },
    },
    {
      nome: 'Rinossinusite viral', usos: 3, dias: 4, queixa: 'gripal',
      itens: ['soro-nasal-09', 'paracetamol-750', 'loratadina-10'],
      orientacoes: 'Lavagem nasal com soro várias vezes ao dia. Retornar se febre alta, dor intensa na face ou sintomas por mais de 10 dias.',
      sec: {
        qp: 'Nariz entupido e dor na face há __ dias.',
        hda: 'Paciente refere obstrução nasal, rinorreia e pressão em face há __ dias. Nega febre alta. Nega secreção purulenta persistente.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas.',
        ef: 'BEG, afebril. Rinoscopia com mucosa edemaciada e hiperemiada. Leve dor à percussão de seios maxilares. Orofaringe sem alterações.',
        hd: 'Rinossinusite aguda viral.',
        cd: 'Lavagem nasal e sintomáticos. Orientado retorno.',
      },
    },
    {
      nome: 'Pielonefrite aguda', usos: 2, dias: 5, queixa: 'urinario',
      itens: ['ciprofloxacino-500', 'dipirona-500', 'ondansetrona-4'],
      orientacoes: 'Aumentar a ingestão de água. Retornar imediatamente se vômitos que impeçam o remédio, piora da dor, confusão ou febre que não cede.',
      sec: {
        qp: 'Febre e dor nas costas há __ dias.',
        hda: 'Paciente refere disúria há __ dias, evoluindo com febre aferida de __ °C, calafrios e dor lombar à __. Náuseas, sem vômitos.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas. Nega gestação.',
        ef: 'REG, corada, hidratada, febril (Tax __ °C). Giordano positivo à __. Abdome flácido, sem sinais de irritação peritoneal. PA __ mmHg, FC __ bpm.',
        hd: 'Pielonefrite aguda.',
        cd: 'Exame de urina e urocultura. Antibioticoterapia oral, analgesia e antiemético. Reavaliação em 48 a 72 horas.',
      },
    },
    {
      nome: 'Dor abdominal a esclarecer', usos: 1, dias: 6, queixa: 'geral',
      itens: [],
      orientacoes: '',
      sec: {
        qp: 'Dor de barriga há __.',
        hda: 'Paciente refere dor abdominal em __, de início há __, intensidade __/10. Nega febre. Nega vômitos.',
        ant: 'Nega comorbidades. Nega alergias medicamentosas.',
        ef: 'BEG, corado, hidratado, afebril. Abdome __. PA __ mmHg, FC __ bpm.',
        hd: 'Dor abdominal a esclarecer.',
        cd: 'Exames complementares e reavaliação após resultado.',
      },
    },
  ].map((d, i) => ({
    id: 'ddemo' + i,
    nome: d.nome,
    chave: d.nome.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(),
    usos: d.usos,
    itens: d.itens.map(item),
    orientacoes: d.orientacoes,
    pront: { queixa: d.queixa, sec: d.sec },
    atualizado: haDias(d.dias, i),
  }));

  // Quantas vezes cada apresentação entrou numa receita na semana: é o que ordena a busca.
  const uso = {
    'dipirona-500': 38, 'loratadina-10': 17, 'soro-nasal-09': 17, 'nitrofurantoina-100': 9,
    'ibuprofeno-600': 12, 'ondansetrona-4': 10, 'sro-env': 8, 'escopolamina-dipirona-cp': 8,
    'ciclobenzaprina-5': 11, 'amoxicilina-500': 5, 'dipirona-1g': 4, 'paracetamol-750': 6, 'ciprofloxacino-500': 2,
  };

  window.RX_DEMO = {
    dados: {
      perfil: { nome: 'Dra. Helena Prado', crm: '000000', uf: 'MG', especialidade: 'Clínica médica' },
      locais: [
        { id: LOCAL_UPA, nome: 'UPA 24h Jardim das Flores', endereco: 'Av. das Acácias, 1200', cidade: 'Belo Horizonte', telefone: '', timbre: '', campos, geo: null },
        { id: LOCAL_PA, nome: 'Pronto Atendimento Central', endereco: 'Rua Principal, 45', cidade: 'Contagem', telefone: '', timbre: '', campos, geo: null },
      ],
      localAtual: LOCAL_UPA,
      metricas: { receitas: 61, segundos: 61 * 47, semResultado: ['bamifilina', 'buscopan composto gotas'], alteradas: {} },
      uso,
      modelos: [],
      padroes: {},
      diagnosticos,
    },
  };
})();

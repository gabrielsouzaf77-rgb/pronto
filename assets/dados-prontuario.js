/*
  Frases do prontuário. Nada entra no texto sozinho: o médico clica no que
  de fato perguntou ou examinou.

    k('...')  termo curto, entra na frase separado por vírgula
    s('...')  frase completa, entra depois de um ponto
    __        lacuna para o médico preencher
*/
(function () {
  const k = (t) => ({ t, token: true });
  const s = (t) => ({ t, token: false });

  window.RX_PRONTUARIO = {
    secoes: [
      { id: 'qp', titulo: 'Queixa principal', rotulo: 'QP', dica: 'Nas palavras do paciente, com o tempo de evolução.' },
      { id: 'hda', titulo: 'História da doença atual', rotulo: 'HDA', dica: 'Clique nas frases ou escreva livremente.' },
      { id: 'ant', titulo: 'História pregressa', rotulo: 'HPP', dica: 'Comorbidades, alergias e medicações em uso.' },
      { id: 'ef', titulo: 'Exame físico', rotulo: 'Exame físico', dica: 'Só o que foi examinado.' },
      { id: 'hd', titulo: 'Hipótese diagnóstica', rotulo: 'HD', dica: 'Hipótese e CID, se quiser.' },
      { id: 'cd', titulo: 'Conduta', rotulo: 'Conduta', dica: 'O que foi feito e orientado.' },
    ],

    comuns: {
      ant: [
        { grupo: '', chips: [
          k('nega comorbidades'), k('nega alergias medicamentosas'), k('nega uso de medicações contínuas'),
          k('HAS'), k('DM2'), k('asma'), k('alergia a __'), k('em uso de __'), k('nega gestação'), k('gestante de __ semanas'),
        ] },
      ],
      ef: [
        { grupo: 'Geral', chips: [
          k('BEG'), k('REG'), k('LOTE'), k('corado'), k('hidratado'), k('desidratado __/4+'),
          k('acianótico'), k('anictérico'), k('afebril'), k('eupneico em ar ambiente'),
        ] },
        { grupo: 'Sinais vitais', chips: [
          s('PA __x__ mmHg, FC __ bpm, FR __ irpm, Tax __ °C, SpO2 __% em ar ambiente.'),
        ] },
        { grupo: 'Aparelho respiratório', chips: [
          s('AR: murmúrio vesicular presente bilateralmente, sem ruídos adventícios.'),
          s('AR: sibilos difusos.'),
          s('AR: estertores em __.'),
        ] },
        { grupo: 'Cardiovascular', chips: [
          s('ACV: ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, sem sopros.'),
        ] },
        { grupo: 'Abdome', chips: [
          s('ABD: plano, flácido, ruídos hidroaéreos presentes, indolor à palpação, sem massas ou visceromegalias.'),
          s('ABD: doloroso à palpação em __, sem sinais de irritação peritoneal.'),
          s('Giordano negativo bilateralmente.'),
          s('Giordano positivo à __.'),
        ] },
        { grupo: 'Garganta e ouvidos', chips: [
          s('Oroscopia: hiperemia de orofaringe, sem exsudato.'),
          s('Oroscopia: hiperemia e hipertrofia de amígdalas com exsudato purulento.'),
          s('Oroscopia sem alterações.'),
          s('Otoscopia sem alterações bilateralmente.'),
          s('Otoscopia: hiperemia e abaulamento de membrana timpânica à __.'),
        ] },
        { grupo: 'Neurológico', chips: [
          s('Neuro: Glasgow 15, pupilas isocóricas e fotorreagentes, sem déficits focais.'),
          s('Sem rigidez de nuca.'),
        ] },
        { grupo: 'Osteomuscular', chips: [
          s('Dor à palpação da musculatura paravertebral lombar.'),
          s('Lasègue negativo bilateralmente.'),
          s('Força e sensibilidade preservadas em membros inferiores.'),
        ] },
        { grupo: 'Pele e extremidades', chips: [
          s('Extremidades: sem edemas, panturrilhas livres, tempo de enchimento capilar menor que 3 segundos.'),
          s('Pele sem exantema ou petéquias.'),
          s('Prova do laço negativa.'),
          s('Prova do laço positiva.'),
        ] },
      ],
      cd: [
        { grupo: '', chips: [
          s('Medicação sintomática administrada na unidade, com melhora.'),
          s('Prescrição de alta entregue e explicada.'),
          s('Oriento hidratação oral e repouso.'),
          s('Oriento sinais de alarme e retorno imediato se piora.'),
          s('Atestado médico por __ dias.'),
          s('Solicito __.'),
          s('Encaminho para __.'),
          s('Alta em bom estado geral.'),
        ] },
      ],
    },

    queixas: [
      { id: 'geral', nome: 'Geral', qp: [], hda: [
        k('refere __ há __ dias'), k('início súbito'), k('início gradual'), k('nega febre'), k('nega trauma'),
        k('nega episódios prévios semelhantes'), k('fez uso de __, sem melhora'),
      ], hd: [] },

      { id: 'gripal', nome: 'Síndrome gripal', qp: [k('tosse há __ dias'), k('febre há __ dias'), k('coriza'), k('dor de garganta'), k('dor no corpo')], hda: [
        k('tosse seca há __ dias'), k('tosse produtiva há __ dias'), k('coriza'), k('obstrução nasal'), k('odinofagia'),
        k('febre aferida de __ °C'), k('febre não aferida'), k('mialgia'), k('cefaleia'),
        k('nega dispneia'), k('nega dor torácica'), k('contato com pessoa com sintomas semelhantes'),
      ], hd: [k('síndrome gripal'), k('infecção de vias aéreas superiores')] },

      { id: 'garganta', nome: 'Dor de garganta', qp: [k('dor de garganta há __ dias'), k('febre'), k('dor para engolir')], hda: [
        k('odinofagia há __ dias'), k('febre aferida de __ °C'), k('febre não aferida'), k('nega tosse'), k('nega coriza'),
        k('disfagia'), k('nega dispneia'), k('nega trismo'),
      ], hd: [k('faringoamigdalite aguda')] },

      { id: 'lombar', nome: 'Dor lombar', qp: [k('dor nas costas há __ dias'), k('dor lombar há __ dias')], hda: [
        k('dor lombar há __ dias'), k('início após esforço físico'), k('piora à movimentação'), k('sem irradiação'),
        k('irradiação para membro inferior __'), k('nega trauma'), k('nega febre'),
        k('nega perda de força ou alteração de sensibilidade'), k('nega incontinência urinária ou fecal'),
        k('nega sintomas urinários'),
      ], hd: [k('lombalgia mecânica aguda')] },

      { id: 'cefaleia', nome: 'Cefaleia', qp: [k('dor de cabeça há __'), k('cefaleia há __')], hda: [
        k('cefaleia há __'), k('holocraniana'), k('hemicraniana à __'), k('pulsátil'), k('em aperto'),
        k('intensidade __/10'), k('fotofobia e fonofobia'), k('náuseas'), k('semelhante a episódios prévios'),
        k('nega início súbito'), k('nega febre'), k('nega déficit neurológico'), k('nega trauma'),
      ], hd: [k('cefaleia primária'), k('enxaqueca'), k('cefaleia tensional')] },

      { id: 'gastro', nome: 'Diarreia e vômitos', qp: [k('diarreia há __ dias'), k('vômitos há __ dias'), k('dor de barriga')], hda: [
        k('diarreia há __ dias'), k('__ evacuações líquidas ao dia'), k('sem sangue ou muco'), k('vômitos, __ episódios'),
        k('dor abdominal em cólica'), k('febre não aferida'), k('nega febre'), k('aceitando líquidos'),
        k('diurese preservada'), k('contactantes com quadro semelhante'),
      ], hd: [k('gastroenterite aguda')] },

      { id: 'urinario', nome: 'Sintomas urinários', qp: [k('ardência ao urinar há __ dias'), k('vontade de urinar toda hora')], hda: [
        k('disúria há __ dias'), k('polaciúria'), k('urgência miccional'), k('dor suprapúbica'),
        k('nega febre'), k('nega dor lombar'), k('nega hematúria'), k('nega corrimento vaginal'),
        k('nega episódios recentes semelhantes'),
      ], hd: [k('cistite aguda não complicada')] },

      { id: 'arbovirose', nome: 'Suspeita de arbovirose', qp: [k('febre há __ dias'), k('dor no corpo'), k('manchas na pele')], hda: [
        k('febre há __ dias'), k('mialgia'), k('cefaleia'), k('dor retro-orbitária'), k('artralgia'), k('exantema'),
        k('náuseas'), k('nega sangramentos'), k('nega dor abdominal intensa'), k('nega vômitos persistentes'),
        k('nega tontura ou desmaio'),
      ], hd: [k('arbovirose a esclarecer'), k('dengue sem sinais de alarme')] },
    ],
  };
})();

/*
  Base de medicamentos do MVP.

  RASCUNHO: posologias usuais de adulto, escritas a partir de bulas, ainda sem
  revisão de um médico. Todo item nasce com revisado: false.

  Estrutura:
    nome            denominação genérica (DCB), como sai na receita
    sinonimos       termos extras só para a busca (nomes comerciais, apelidos)
    antimicrobiano  true = receita em 2 vias, válida por 10 dias (RDC 471/2021)
    apresentacoes[] conc, forma, via e posologias[]
    posologias[]    rotulo (texto do botão), texto (linha da receita), qtd

  Formas pediátricas vêm com ____ para o médico preencher a dose.
  Não há medicamentos de controle especial nesta base.
*/
(function () {
  const p = (rotulo, texto, qtd) => ({ rotulo, texto, qtd });

  window.RX_VIAS = {
    oral: 'Uso oral',
    topica: 'Uso tópico',
    inalatoria: 'Uso inalatório',
    nasal: 'Uso nasal',
    im: 'Uso intramuscular',
  };

  window.RX_MEDICAMENTOS = [
    // ---------- Analgésicos e antitérmicos ----------
    {
      id: 'dipirona', nome: 'Dipirona', sinonimos: 'novalgina metamizol', classe: 'Analgésico e antitérmico',
      apresentacoes: [
        { id: 'dipirona-500', conc: '500 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('1 cp · 6/6 h', 'Tomar 1 comprimido de 6 em 6 horas se dor ou febre.', '10 comprimidos'),
          p('2 cp · 6/6 h', 'Tomar 2 comprimidos de 6 em 6 horas se dor ou febre.', '20 comprimidos'),
        ] },
        { id: 'dipirona-1g', conc: '1 g', forma: 'comprimido', via: 'oral', posologias: [
          p('1 cp · 6/6 h', 'Tomar 1 comprimido de 6 em 6 horas se dor ou febre.', '10 comprimidos'),
        ] },
        { id: 'dipirona-gts', conc: '500 mg/mL', forma: 'solução oral (gotas)', via: 'oral', posologias: [
          p('Adulto · 40 gts', 'Tomar 40 gotas de 6 em 6 horas se dor ou febre.', '1 frasco'),
          p('Criança', 'Tomar ____ gotas de 6 em 6 horas se dor ou febre.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'paracetamol', nome: 'Paracetamol', sinonimos: 'tylenol acetaminofeno', classe: 'Analgésico e antitérmico',
      apresentacoes: [
        { id: 'paracetamol-500', conc: '500 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('1 cp · 6/6 h', 'Tomar 1 comprimido de 6 em 6 horas se dor ou febre.', '10 comprimidos'),
          p('2 cp · 6/6 h', 'Tomar 2 comprimidos de 6 em 6 horas se dor ou febre.', '20 comprimidos'),
        ] },
        { id: 'paracetamol-750', conc: '750 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('1 cp · 6/6 h', 'Tomar 1 comprimido de 6 em 6 horas se dor ou febre.', '10 comprimidos'),
        ] },
        { id: 'paracetamol-gts', conc: '200 mg/mL', forma: 'solução oral (gotas)', via: 'oral', posologias: [
          p('Criança', 'Tomar ____ gotas de 6 em 6 horas se dor ou febre.', '1 frasco'),
          p('Adulto · 40 gts', 'Tomar 40 gotas de 6 em 6 horas se dor ou febre.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'ibuprofeno', nome: 'Ibuprofeno', sinonimos: 'advil alivium', classe: 'Anti-inflamatório',
      apresentacoes: [
        { id: 'ibuprofeno-600', conc: '600 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h · 5 dias', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, por 5 dias.', '15 comprimidos'),
          p('8/8 h · 3 dias', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, por 3 dias.', '9 comprimidos'),
        ] },
        { id: 'ibuprofeno-400', conc: '400 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h · 5 dias', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, por 5 dias.', '15 comprimidos'),
        ] },
        { id: 'ibuprofeno-gts-50', conc: '50 mg/mL', forma: 'suspensão oral (gotas)', via: 'oral', posologias: [
          p('Criança', 'Tomar ____ gotas de 8 em 8 horas se dor ou febre.', '1 frasco'),
        ] },
        { id: 'ibuprofeno-gts-100', conc: '100 mg/mL', forma: 'suspensão oral (gotas)', via: 'oral', posologias: [
          p('Criança', 'Tomar ____ gotas de 8 em 8 horas se dor ou febre.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'naproxeno', nome: 'Naproxeno', sinonimos: 'naprosyn flanax', classe: 'Anti-inflamatório',
      apresentacoes: [
        { id: 'naproxeno-500', conc: '500 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('12/12 h · 5 dias', 'Tomar 1 comprimido de 12 em 12 horas, após as refeições, por 5 dias.', '10 comprimidos'),
        ] },
      ],
    },
    {
      id: 'diclofenaco', nome: 'Diclofenaco sódico', sinonimos: 'voltaren', classe: 'Anti-inflamatório',
      apresentacoes: [
        { id: 'diclofenaco-50', conc: '50 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h · 5 dias', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições, por 5 dias.', '15 comprimidos'),
        ] },
      ],
    },
    {
      id: 'nimesulida', nome: 'Nimesulida', sinonimos: 'nisulid', classe: 'Anti-inflamatório',
      apresentacoes: [
        { id: 'nimesulida-100', conc: '100 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('12/12 h · 5 dias', 'Tomar 1 comprimido de 12 em 12 horas, após as refeições, por 5 dias.', '10 comprimidos'),
        ] },
      ],
    },
    {
      id: 'ciclobenzaprina', nome: 'Ciclobenzaprina', sinonimos: 'miosan relaxante muscular', classe: 'Relaxante muscular',
      apresentacoes: [
        { id: 'ciclobenzaprina-5', conc: '5 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('À noite · 7 dias', 'Tomar 1 comprimido à noite por 7 dias.', '7 comprimidos'),
        ] },
        { id: 'ciclobenzaprina-10', conc: '10 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('À noite · 7 dias', 'Tomar 1 comprimido à noite por 7 dias.', '7 comprimidos'),
        ] },
      ],
    },

    // ---------- Cólica, náusea e trato digestivo ----------
    {
      id: 'escopolamina', nome: 'Butilbrometo de escopolamina', sinonimos: 'buscopan hioscina', classe: 'Antiespasmódico',
      apresentacoes: [
        { id: 'escopolamina-10', conc: '10 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h se cólica', 'Tomar 1 comprimido de 8 em 8 horas se cólica.', '10 comprimidos'),
        ] },
      ],
    },
    {
      id: 'escopolamina-dipirona', nome: 'Butilbrometo de escopolamina + dipirona', sinonimos: 'buscopan composto hioscina', classe: 'Antiespasmódico e analgésico',
      apresentacoes: [
        { id: 'escopolamina-dipirona-cp', conc: '10 mg + 250 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('6/6 h se dor', 'Tomar 1 comprimido de 6 em 6 horas se dor.', '10 comprimidos'),
        ] },
        { id: 'escopolamina-dipirona-gts', conc: '6,67 mg/mL + 333,4 mg/mL', forma: 'solução oral (gotas)', via: 'oral', posologias: [
          p('Adulto · 40 gts', 'Tomar 40 gotas de 6 em 6 horas se dor.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'ondansetrona', nome: 'Ondansetrona', sinonimos: 'vonau zofran', classe: 'Antiemético',
      apresentacoes: [
        { id: 'ondansetrona-4', conc: '4 mg', forma: 'comprimido orodispersível', via: 'oral', posologias: [
          p('8/8 h se náusea', 'Dissolver 1 comprimido sobre a língua de 8 em 8 horas se náusea ou vômito.', '10 comprimidos'),
        ] },
        { id: 'ondansetrona-8', conc: '8 mg', forma: 'comprimido orodispersível', via: 'oral', posologias: [
          p('8/8 h se náusea', 'Dissolver 1 comprimido sobre a língua de 8 em 8 horas se náusea ou vômito.', '10 comprimidos'),
        ] },
      ],
    },
    {
      id: 'metoclopramida', nome: 'Metoclopramida', sinonimos: 'plasil', classe: 'Antiemético',
      apresentacoes: [
        { id: 'metoclopramida-10', conc: '10 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h se náusea', 'Tomar 1 comprimido de 8 em 8 horas se náusea ou vômito.', '10 comprimidos'),
        ] },
      ],
    },
    {
      id: 'bromoprida', nome: 'Bromoprida', sinonimos: 'digesan', classe: 'Antiemético',
      apresentacoes: [
        { id: 'bromoprida-10', conc: '10 mg', forma: 'cápsula', via: 'oral', posologias: [
          p('8/8 h se náusea', 'Tomar 1 cápsula de 8 em 8 horas se náusea ou vômito.', '10 cápsulas'),
        ] },
      ],
    },
    {
      id: 'omeprazol', nome: 'Omeprazol', sinonimos: 'losec protetor gastrico', classe: 'Inibidor de bomba de prótons',
      apresentacoes: [
        { id: 'omeprazol-20', conc: '20 mg', forma: 'cápsula', via: 'oral', posologias: [
          p('Jejum · 14 dias', 'Tomar 1 cápsula pela manhã, em jejum, por 14 dias.', '14 cápsulas'),
          p('Jejum · 28 dias', 'Tomar 1 cápsula pela manhã, em jejum, por 28 dias.', '28 cápsulas'),
        ] },
      ],
    },
    {
      id: 'sro', nome: 'Sais para reidratação oral', sinonimos: 'soro caseiro sro', classe: 'Reidratação',
      apresentacoes: [
        { id: 'sro-env', conc: 'envelope de 27,9 g', forma: 'pó para solução oral', via: 'oral', posologias: [
          p('1 env em 1 L', 'Dissolver 1 envelope em 1 litro de água filtrada ou fervida e tomar aos poucos ao longo do dia, principalmente após cada evacuação ou vômito.', '6 envelopes'),
        ] },
      ],
    },
    {
      id: 'simeticona', nome: 'Simeticona', sinonimos: 'luftal gases', classe: 'Antiflatulento',
      apresentacoes: [
        { id: 'simeticona-40', conc: '40 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h', 'Tomar 1 comprimido de 8 em 8 horas, após as refeições.', '10 comprimidos'),
        ] },
        { id: 'simeticona-gts', conc: '75 mg/mL', forma: 'emulsão oral (gotas)', via: 'oral', posologias: [
          p('Adulto · 16 gts', 'Tomar 16 gotas de 8 em 8 horas, após as refeições.', '1 frasco'),
          p('Criança', 'Tomar ____ gotas de 8 em 8 horas.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'albendazol', nome: 'Albendazol', sinonimos: 'zentel vermifugo', classe: 'Anti-helmíntico',
      apresentacoes: [
        { id: 'albendazol-400', conc: '400 mg', forma: 'comprimido mastigável', via: 'oral', posologias: [
          p('Dose única', 'Mastigar 1 comprimido em dose única.', '1 comprimido'),
        ] },
      ],
    },

    // ---------- Alergia e corticoides ----------
    {
      id: 'loratadina', nome: 'Loratadina', sinonimos: 'claritin antialergico', classe: 'Anti-histamínico',
      apresentacoes: [
        { id: 'loratadina-10', conc: '10 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('1x/dia · 7 dias', 'Tomar 1 comprimido 1 vez ao dia por 7 dias.', '7 comprimidos'),
        ] },
      ],
    },
    {
      id: 'dexclorfeniramina', nome: 'Dexclorfeniramina', sinonimos: 'polaramine antialergico', classe: 'Anti-histamínico',
      apresentacoes: [
        { id: 'dexclorfeniramina-2', conc: '2 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h · 5 dias', 'Tomar 1 comprimido de 8 em 8 horas por 5 dias.', '15 comprimidos'),
        ] },
        { id: 'dexclorfeniramina-sol', conc: '2 mg/5 mL', forma: 'solução oral', via: 'oral', posologias: [
          p('Criança', 'Tomar ____ mL de 8 em 8 horas por ____ dias.', '1 frasco'),
          p('Adulto · 5 mL', 'Tomar 5 mL de 8 em 8 horas por 5 dias.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'prednisona', nome: 'Prednisona', sinonimos: 'meticorten corticoide', classe: 'Corticoide',
      apresentacoes: [
        { id: 'prednisona-20', conc: '20 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('1 cp · 5 dias', 'Tomar 1 comprimido pela manhã por 5 dias.', '5 comprimidos'),
          p('2 cp · 5 dias', 'Tomar 2 comprimidos pela manhã por 5 dias.', '10 comprimidos'),
        ] },
      ],
    },
    {
      id: 'prednisolona', nome: 'Prednisolona', sinonimos: 'predsim prelone corticoide', classe: 'Corticoide',
      apresentacoes: [
        { id: 'prednisolona-sol', conc: '3 mg/mL', forma: 'solução oral', via: 'oral', posologias: [
          p('Criança', 'Tomar ____ mL 1 vez ao dia, pela manhã, por ____ dias.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'dexametasona-creme', nome: 'Dexametasona', sinonimos: 'pomada corticoide', classe: 'Corticoide tópico',
      apresentacoes: [
        { id: 'dexametasona-creme-01', conc: '1 mg/g', forma: 'creme', via: 'topica', posologias: [
          p('2x/dia · 7 dias', 'Aplicar fina camada sobre a área afetada 2 vezes ao dia por 7 dias.', '1 bisnaga'),
        ] },
      ],
    },

    // ---------- Respiratório ----------
    {
      id: 'salbutamol', nome: 'Salbutamol', sinonimos: 'aerolin bombinha', classe: 'Broncodilatador',
      apresentacoes: [
        { id: 'salbutamol-spray', conc: '100 mcg/dose', forma: 'aerossol', via: 'inalatoria', posologias: [
          p('2 jatos · 6/6 h', 'Inalar 2 jatos de 6 em 6 horas se falta de ar ou chiado.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'ambroxol', nome: 'Ambroxol', sinonimos: 'mucosolvan xarope', classe: 'Mucolítico',
      apresentacoes: [
        { id: 'ambroxol-adulto', conc: '30 mg/5 mL', forma: 'xarope adulto', via: 'oral', posologias: [
          p('5 mL · 8/8 h', 'Tomar 5 mL de 8 em 8 horas por 5 dias.', '1 frasco'),
        ] },
        { id: 'ambroxol-ped', conc: '15 mg/5 mL', forma: 'xarope pediátrico', via: 'oral', posologias: [
          p('Criança', 'Tomar ____ mL de 8 em 8 horas por 5 dias.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'acetilcisteina', nome: 'Acetilcisteína', sinonimos: 'fluimucil', classe: 'Mucolítico',
      apresentacoes: [
        { id: 'acetilcisteina-600', conc: '600 mg', forma: 'granulado (envelope)', via: 'oral', posologias: [
          p('1x/dia · 5 dias', 'Dissolver 1 envelope em meio copo de água e tomar 1 vez ao dia, à noite, por 5 dias.', '5 envelopes'),
        ] },
      ],
    },
    {
      id: 'soro-nasal', nome: 'Cloreto de sódio', sinonimos: 'soro fisiologico nasal rinosoro lavagem', classe: 'Higiene nasal',
      apresentacoes: [
        { id: 'soro-nasal-09', conc: '0,9%', forma: 'solução nasal', via: 'nasal', posologias: [
          p('4 a 6x/dia', 'Aplicar em cada narina de 4 a 6 vezes ao dia.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'oseltamivir', nome: 'Oseltamivir', sinonimos: 'tamiflu influenza gripe', classe: 'Antiviral',
      apresentacoes: [
        { id: 'oseltamivir-75', conc: '75 mg', forma: 'cápsula', via: 'oral', posologias: [
          p('12/12 h · 5 dias', 'Tomar 1 cápsula de 12 em 12 horas por 5 dias.', '10 cápsulas'),
        ] },
      ],
    },

    // ---------- Antimicrobianos (2 vias, validade de 10 dias) ----------
    {
      id: 'amoxicilina', nome: 'Amoxicilina', sinonimos: 'amoxil antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'amoxicilina-500', conc: '500 mg', forma: 'cápsula', via: 'oral', posologias: [
          p('8/8 h · 7 dias', 'Tomar 1 cápsula de 8 em 8 horas por 7 dias.', '21 cápsulas'),
          p('8/8 h · 10 dias', 'Tomar 1 cápsula de 8 em 8 horas por 10 dias.', '30 cápsulas'),
        ] },
        { id: 'amoxicilina-susp', conc: '250 mg/5 mL', forma: 'pó para suspensão oral', via: 'oral', posologias: [
          p('Criança · 8/8 h', 'Tomar ____ mL de 8 em 8 horas por ____ dias.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'amoxicilina-clavulanato', nome: 'Amoxicilina + clavulanato de potássio', sinonimos: 'clavulin antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'amoxiclav-875', conc: '875 mg + 125 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('12/12 h · 7 dias', 'Tomar 1 comprimido de 12 em 12 horas por 7 dias.', '14 comprimidos'),
          p('12/12 h · 10 dias', 'Tomar 1 comprimido de 12 em 12 horas por 10 dias.', '20 comprimidos'),
        ] },
        { id: 'amoxiclav-500', conc: '500 mg + 125 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h · 7 dias', 'Tomar 1 comprimido de 8 em 8 horas por 7 dias.', '21 comprimidos'),
        ] },
        { id: 'amoxiclav-susp', conc: '400 mg + 57 mg/5 mL', forma: 'pó para suspensão oral', via: 'oral', posologias: [
          p('Criança · 12/12 h', 'Tomar ____ mL de 12 em 12 horas por ____ dias.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'azitromicina', nome: 'Azitromicina', sinonimos: 'zitromax antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'azitromicina-500', conc: '500 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('1x/dia · 3 dias', 'Tomar 1 comprimido 1 vez ao dia por 3 dias.', '3 comprimidos'),
          p('1x/dia · 5 dias', 'Tomar 1 comprimido 1 vez ao dia por 5 dias.', '5 comprimidos'),
        ] },
        { id: 'azitromicina-susp', conc: '200 mg/5 mL', forma: 'pó para suspensão oral', via: 'oral', posologias: [
          p('Criança · 1x/dia', 'Tomar ____ mL 1 vez ao dia por ____ dias.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'cefalexina', nome: 'Cefalexina', sinonimos: 'keflex antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'cefalexina-500', conc: '500 mg', forma: 'cápsula', via: 'oral', posologias: [
          p('6/6 h · 7 dias', 'Tomar 1 cápsula de 6 em 6 horas por 7 dias.', '28 cápsulas'),
        ] },
        { id: 'cefalexina-susp', conc: '250 mg/5 mL', forma: 'pó para suspensão oral', via: 'oral', posologias: [
          p('Criança · 6/6 h', 'Tomar ____ mL de 6 em 6 horas por ____ dias.', '1 frasco'),
        ] },
      ],
    },
    {
      id: 'ciprofloxacino', nome: 'Ciprofloxacino', sinonimos: 'cipro antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'ciprofloxacino-500', conc: '500 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('12/12 h · 3 dias', 'Tomar 1 comprimido de 12 em 12 horas por 3 dias.', '6 comprimidos'),
          p('12/12 h · 7 dias', 'Tomar 1 comprimido de 12 em 12 horas por 7 dias.', '14 comprimidos'),
        ] },
      ],
    },
    {
      id: 'nitrofurantoina', nome: 'Nitrofurantoína', sinonimos: 'macrodantina antibiotico urinaria', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'nitrofurantoina-100', conc: '100 mg', forma: 'cápsula', via: 'oral', posologias: [
          p('6/6 h · 5 dias', 'Tomar 1 cápsula de 6 em 6 horas, junto com alimento, por 5 dias.', '20 cápsulas'),
          p('6/6 h · 7 dias', 'Tomar 1 cápsula de 6 em 6 horas, junto com alimento, por 7 dias.', '28 cápsulas'),
        ] },
      ],
    },
    {
      id: 'fosfomicina', nome: 'Fosfomicina trometamol', sinonimos: 'monuril antibiotico urinaria', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'fosfomicina-3g', conc: '3 g', forma: 'granulado (envelope)', via: 'oral', posologias: [
          p('Dose única', 'Dissolver 1 envelope em meio copo de água e tomar em dose única, à noite, após esvaziar a bexiga.', '1 envelope'),
        ] },
      ],
    },
    {
      id: 'smx-tmp', nome: 'Sulfametoxazol + trimetoprima', sinonimos: 'bactrim antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'smx-tmp-400', conc: '400 mg + 80 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('2 cp · 12/12 h · 3 dias', 'Tomar 2 comprimidos de 12 em 12 horas por 3 dias.', '12 comprimidos'),
          p('2 cp · 12/12 h · 7 dias', 'Tomar 2 comprimidos de 12 em 12 horas por 7 dias.', '28 comprimidos'),
        ] },
        { id: 'smx-tmp-800', conc: '800 mg + 160 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('12/12 h · 3 dias', 'Tomar 1 comprimido de 12 em 12 horas por 3 dias.', '6 comprimidos'),
          p('12/12 h · 7 dias', 'Tomar 1 comprimido de 12 em 12 horas por 7 dias.', '14 comprimidos'),
        ] },
      ],
    },
    {
      id: 'metronidazol', nome: 'Metronidazol', sinonimos: 'flagyl antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'metronidazol-400', conc: '400 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('8/8 h · 7 dias', 'Tomar 1 comprimido de 8 em 8 horas por 7 dias.', '21 comprimidos'),
        ] },
      ],
    },
    {
      id: 'doxiciclina', nome: 'Doxiciclina', sinonimos: 'vibramicina antibiotico', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'doxiciclina-100', conc: '100 mg', forma: 'comprimido', via: 'oral', posologias: [
          p('12/12 h · 7 dias', 'Tomar 1 comprimido de 12 em 12 horas por 7 dias.', '14 comprimidos'),
        ] },
      ],
    },
    {
      id: 'penicilina-benzatina', nome: 'Benzilpenicilina benzatina', sinonimos: 'benzetacil antibiotico injetavel', classe: 'Antibiótico', antimicrobiano: true,
      apresentacoes: [
        { id: 'penicilina-benzatina-1200', conc: '1.200.000 UI', forma: 'pó para suspensão injetável', via: 'im', posologias: [
          p('Dose única', 'Aplicar 1 frasco-ampola por via intramuscular profunda, em dose única.', '1 frasco-ampola'),
        ] },
      ],
    },
  ].map((m) => ({ antimicrobiano: false, revisado: false, ...m }));
})();

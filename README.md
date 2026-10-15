# Pronto (MVP)

Facilitador de redação de prescrição e prontuário para plantão. O médico escolhe
o medicamento e a apresentação; a linha da receita entra com via, intervalo e
duração usuais, e ele ajusta o que quiser antes de imprimir ou copiar.

O nome antigo era "Rx Plantão". A marca está em `marca/`. A pasta local ainda se
chama `rx-plantao`; o repositório e o site já se chamam `pronto`.

## Como abrir

- No computador: dê dois cliques em `index.html`.
- Pelo Claude Code: pré-visualização `rx-plantao` (porta 4210).

Não há instalação, servidor ou banco de dados. São arquivos estáticos; para
publicar, basta subir a pasta em qualquer hospedagem de site estático.

## O que faz

- **A receita é a tela.** Não há painel separado: o médico preenche o
  paciente, escolhe os remédios e edita tudo na própria folha, que vai sendo
  escrita a cada escolha.
- **Prescrição em três passos:** (1) na próxima linha da receita, o médico
  digita o nome e a busca já sugere o mais próximo, aceitando nome comercial e
  erro de digitação; (2) ele escolhe a dosagem; (3) a linha é escrita com via,
  intervalo, duração e quantidade usuais, tudo editável ali mesmo.
- **Receita:** cabeçalho da unidade, dados do paciente, itens numerados por
  via, orientações, fecho hachurado, data e assinatura com CRM. Imprime (2 vias
  quando há antimicrobiano) ou copia em texto para colar no sistema da unidade.
- **Meu padrão:** o médico salva a posologia que prefere para uma apresentação.
- **Meus modelos:** receitas inteiras salvas para repetir com um clique.
- **Prontuário:** frases clicáveis por queixa, exame físico e conduta, com o
  resumo da prescrição atual. Sai em texto para copiar: cada seção tem seu
  "Copiar" (o sistema da UPA tem um campo para cada uma) e o botão grande
  "Copiar prontuário inteiro" fica fixo no pé da folha. Ele ganhou esse
  destaque porque um médico de teste pediu um "copiar tudo" que já existia
  no topo e ele não tinha visto.

## Marca

O nome é **Pronto**: a receita fica pronta, é o Pronto Atendimento onde o médico
atende e é a raiz de prontuário. O logotipo "pronto." é de traço único,
desenhado à mão em SVG (sem depender de fonte), e o ponto final azul é o
símbolo. Arquivos em `marca/`; o guia completo (cores, tipografia, voz, usos)
está em https://claude.ai/artifact/EFyheFbvJE6dm9KPou9Y85.

## Visual

Limpo, minimalista e de cara médica, em azul claro e branco. Segue os
princípios da skill apple-design de Emil Kowalski
(github.com/emilkowalski/skills): fonte do sistema, topo e painéis em material
translúcido, resposta visual no toque, transições em mola sem ressalto que
saem pelo mesmo caminho por onde entraram, e ações secundárias um nível abaixo
(menu "⋯" e opções do item). Respeita as preferências de menos movimento,
menos transparência e mais contraste.

## Por diagnóstico

Barra à esquerda da folha (no celular, abre pelo botão "Por diagnóstico"). O
médico escreve o diagnóstico do atendimento e, ao finalizar a receita
(imprimir ou copiar) ou copiar o prontuário inteiro, o atendimento fica
guardado com aquele nome: receita, orientações e prontuário. Na próxima vez,
um clique devolve tudo preenchido para ajustar, com "Desfazer".

- Se ele não escrever na barra, vale a primeira frase da hipótese
  diagnóstica do prontuário.
- O diagnóstico escrito na barra também entra na hipótese do prontuário,
  enquanto ele não a mudar à mão.
- Cada diagnóstico guarda a última versão e conta quantas vezes foi usado; a
  lista vem ordenada pelos mais usados.
- Fica só no navegador (`rx.diagnosticos`), sem os dados do paciente
  (nome, idade, sexo, endereço).

O Pronto não sugere tratamento: a barra só devolve o que o próprio médico
escreveu, como um caderno dele. Isso mantém o produto como facilitador de
redação (ver a decisão sobre a Anvisa abaixo).

## Locais de atendimento

O plantonista atende em várias unidades, e cada uma tem seu receituário e seu
sistema. Em "⋯ > Locais de atendimento" ele cadastra cada unidade uma vez:

- **Dados da unidade:** nome, endereço, cidade e telefone, que vão no
  cabeçalho e na data da receita.
- **Modelo do hospital:** o médico envia o receituário ou o prontuário da
  unidade em PDF, Word (.docx), foto ou print. O Pronto extrai o texto no
  próprio aparelho (pdf.js para PDF, mammoth para Word e Tesseract para foto ou
  PDF escaneado, carregados só quando precisa), monta os campos do prontuário
  e mostra a primeira página com um controle para recortar o topo como timbre.
  O arquivo não é guardado nem enviado a lugar nenhum.
- **Timbre:** um print ou foto do topo do receituário oficial (logos da
  prefeitura, da unidade). Sai no lugar do cabeçalho do Pronto, na tela e no
  papel. A imagem é reduzida para JPEG de até 1600 px antes de guardar.
- **Prontuário da unidade:** ele cola um prontuário do sistema de lá
  (preenchido ou em branco) e o Pronto lê os títulos dos campos, na mesma
  ordem e com os mesmos nomes. Cada campo aponta para uma seção do Pronto, que
  dá as frases clicáveis, ou fica livre (ex.: "Classificação de risco").
  "Copiar" e "Copiar tudo" saem com os nomes da unidade.
- **Localização (opcional):** salva as coordenadas da unidade. Se o médico já
  liberou a localização no navegador, ao abrir o Pronto perto de uma unidade
  salva (até 500 m) ela é escolhida sozinha. O Pronto nunca pede permissão por
  conta própria.

O local escolhido fica guardado e volta na próxima abertura. Modelos de
receita salvos com um local ativo aparecem só nele. Tudo fica no navegador do
médico (`rx.locais`, `rx.localAtual`); outro aparelho não vê esses dados.

## Levar para outro aparelho e sair do computador

Enquanto não há contas, tudo do médico fica só no navegador em que ele usou.
Duas opções no menu "⋯" cobrem isso:

- **Levar para outro aparelho:** "Exportar arquivo" baixa
  `pronto-meus-dados-AAAA-MM-DD.json` com perfil, unidades (com timbre),
  modelos, padrões, contagem de uso e atendimentos por diagnóstico, nunca
  paciente. "Importar" junta o arquivo com o que já existe: listas unidas
  pelo id (diagnósticos pelo nome), e no conflito fica o mais recente.
  Importar o mesmo arquivo duas vezes não duplica nada.
- **Sair deste computador:** apaga todas as chaves `rx.` do navegador e
  recarrega a página, o que também tira da tela o paciente em andamento.
  Feito para o computador compartilhado da UPA, onde o próximo plantonista
  veria os modelos e o CRM do anterior.

Contas com login, para os dados aparecerem em qualquer aparelho, ficaram como
passo final (decisão do Gabriel em 15/10/2026).

## Primeiro uso e medição

Desenhado com a skill revenue-centric-design
(github.com/heliocosta-dev/revenue-centric-design), no que serve ao estágio de
MVP: encurtar o caminho até a primeira receita pronta.

- **Uma ação só no primeiro uso:** a folha abre com "Comece pelo remédio", o
  cursor já na busca, os atalhos de um clique e uma receita de exemplo.
- **Valor primeiro, pedido depois:** nome e CRM só são pedidos na hora de
  imprimir, uma vez. Antes da primeira receita, cabeçalho e assinatura são
  lugares reservados, sem cobrança.
- **Tempo medido:** ao imprimir ou copiar, o sistema mostra em quanto tempo a
  receita ficou pronta. É um número medido, não uma estimativa de economia.
- **O que o médico acumulou:** receitas feitas, tempo médio, padrões e modelos
  aparecem abaixo da folha.
- **Resumo de uso** (menu "⋯"): receitas, tempo médio, mais usados, buscas sem
  resultado e posologias reescritas, com botão de copiar para o médico enviar.
  Fica só no aparelho, sem nenhum dado de paciente. É a fonte para corrigir a
  base de medicamentos.

Ficaram de fora, de propósito, as táticas da skill baseadas em medo de perda,
escassez ou hábito forçado: não cabem numa ferramenta médica.

## Decisões que não devem ser desfeitas sem conversa

- **O software não calcula dose nem sugere tratamento.** Ele mostra informação
  de referência e o médico escolhe e confere. É isso que o mantém como
  facilitador de redação, fora do enquadramento de dispositivo médico da Anvisa
  (RDC 657/2022). Formas pediátricas vêm com `____` para o médico preencher.
- **Nenhum dado de paciente é salvo.** Paciente e receita ficam só na memória
  da aba. No navegador ficam apenas dados do médico, padrões, modelos e
  contagem de uso.
- **Sem medicamentos de controle especial.** A receita eletrônica deles exige
  integração com o SNCR da Anvisa (RDC 1.000/2025).

## Pendente antes de uso real

- Revisão clínica de `assets/dados-medicamentos.js` por um médico. Todos os
  itens estão com `revisado: false`.
- Revisão das frases de `assets/dados-prontuario.js`.
- Consulta de enquadramento à Anvisa antes de cobrar de clientes.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura da página |
| `assets/styles.css` | Visual, celular e impressão |
| `assets/app.js` | Busca, itens, folha, modelos e prontuário |
| `assets/dados-medicamentos.js` | Base de medicamentos e posologias |
| `assets/dados-prontuario.js` | Queixas e frases do prontuário |

## Site de teste

https://gabrielsouzaf77-rgb.github.io/pronto/

Hospedado no GitHub Pages a partir da branch `main` deste repositório
(github.com/gabrielsouzaf77-rgb/pronto, público). O endereço antigo
(`/rx-plantao/`) é outro repositório, de mesmo nome, que só redireciona para
este, para não quebrar os links já enviados. Abre sem login no
celular e no computador, e a impressão funciona. Para atualizar o site, rodar
`python ferramentas/versionar.py` (marca uma versão nova no CSS e no JS, senão
quem já abriu o site pode ver a página nova com o estilo antigo), fazer commit
e `git push`; o GitHub republica em cerca de um minuto. A página
pede aos buscadores que não a indexem.

**Demonstração:** https://gabrielsouzaf77-rgb.github.io/pronto/?demo abre o
Pronto no 7º dia de uso de uma plantonista fictícia (`assets/demo.js`): duas
unidades, 61 receitas e 9 diagnósticos guardados. Nesse modo o app não lê nem
grava o armazenamento do navegador, então os dados reais de quem abrir não são
tocados e nada fica salvo. O endereço sem `?demo` continua limpo.

## Link de teste no Claude

Versão publicada como artefato privado do Claude (sem impressão):
https://claude.ai/artifact/HTJJqhwMsherfLqMW2gy9j

A página publicada é o miolo do `<body>` de `index.html` (sem `<html>`,
`<head>` e `<body>`), precedido do `<title>`, do `styles.css` e de
duas marcações: `window.RX_SEM_IMPRESSAO = true` (o visualizador não abre a
impressão, então o botão some) e `window.RX_EXEMPLO = true` (abre com uma
receita de exemplo). Para atualizar o link, rodar
`python ferramentas/montar_pagina_teste.py <saída>` e publicar no mesmo
endereço junto com os arquivos de `assets/` e os ícones de `marca/`.

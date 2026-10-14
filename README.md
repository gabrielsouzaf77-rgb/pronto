# Rx Plantão (MVP)

Facilitador de redação de prescrição e prontuário para plantão. O médico escolhe
o medicamento e a apresentação; a linha da receita entra com via, intervalo e
duração usuais, e ele ajusta o que quiser antes de imprimir ou copiar.

"Rx Plantão" é um nome provisório.

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
  resumo da prescrição atual. Sai em texto para copiar.

## Visual

Limpo, minimalista e de cara médica, em azul claro e branco. Segue os
princípios da skill apple-design de Emil Kowalski
(github.com/emilkowalski/skills): fonte do sistema, topo e painéis em material
translúcido, resposta visual no toque, transições em mola sem ressalto que
saem pelo mesmo caminho por onde entraram, e ações secundárias um nível abaixo
(menu "⋯" e opções do item). Respeita as preferências de menos movimento,
menos transparência e mais contraste.

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

https://gabrielsouzaf77-rgb.github.io/rx-plantao/

Hospedado no GitHub Pages a partir da branch `main` deste repositório
(github.com/gabrielsouzaf77-rgb/rx-plantao, público). Abre sem login no
celular e no computador, e a impressão funciona. Para atualizar o site, basta
fazer commit e `git push`; o GitHub republica em cerca de um minuto. A página
pede aos buscadores que não a indexem.

## Link de teste no Claude

Versão publicada como artefato privado do Claude (sem impressão):
https://claude.ai/artifact/HTJJqhwMsherfLqMW2gy9j

A página publicada é o miolo do `<body>` de `index.html` (sem `<html>`,
`<head>` e `<body>`), precedido do `<title>`, do `styles.css` e de
duas marcações: `window.RX_SEM_IMPRESSAO = true` (o visualizador não abre a
impressão, então o botão some) e `window.RX_EXEMPLO = true` (abre com uma
receita de exemplo). Para atualizar o link, gerar essa página de novo e
publicar no mesmo endereço junto com os quatro arquivos de `assets/`.

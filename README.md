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

Os títulos usam **Outfit 600** (`assets/fontes/`, licença OFL), escolhida pelo
Gabriel em 22/10/2026 por ter o mesmo desenho geométrico do logotipo. Texto
corrido, campos, botões e a receita impressa continuam na fonte do sistema.

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

Com as contas (abaixo), "Levar para outro aparelho" fica escondido, porque a
sincronização faz o mesmo, e "Sair deste computador" vira "Sair da conta".
Na demonstração e no link de teste do Claude, que funcionam sem conta, as duas
opções continuam como antes.

## Tour de boas-vindas

`assets/tour.js`. No primeiro acesso (depois de entrar na conta), 9 cartões
apontam o principal: local de atendimento, modelo do hospital, busca do
remédio, imprimir/copiar, prontuário, "Por diagnóstico" e o menu. O último
oferece "Cadastrar meu local". Fica marcado em `rx.tourVisto` (que também vai
para a conta, então aparece uma vez por médico). Reabre pelo menu "Ver o tour
de novo" ou com `?tour` no endereço. Pedido do Gabriel em 22/10/2026.

## Contas e assinatura

Pedido do Gabriel em 22/10/2026: login obrigatório, 10 atendimentos grátis de
boas-vindas, depois 1 por dia, e assinatura de **R$ 49,90/mês** pelo
**Mercado Pago**. Um atendimento é a receita e o prontuário do mesmo paciente:
imprimir ou copiar de novo não gasta outro. Ele recomeça em "Nova receita",
"Limpar prontuário" ou depois de 40 minutos.

- **Supabase**, projeto `pronto` (ref `ukuzyoutntepdullrpzq`, São Paulo, plano
  grátis). SQL em `supabase/migrations/`, funções em `supabase/functions/`
  (código comum em `_shared/mercadopago.ts`). O grátis só deixa 2 projetos
  ativos por conta: em 30/10/2026 o `anuncios-de-barrio` foi pausado para o
  Pronto voltar. O grátis também pausa depois de 7 dias sem uso; a rotina
  `.github/workflows/manter-supabase-ativo.yml` consulta o banco a cada 3 dias.
  Com clientes pagando, o certo é o plano Pro (US$ 25/mês, backup diário).
- **Regra no servidor:** `consumir(atendimento)` registra e decide (10 de
  boas-vindas, 1 por dia no horário de Brasília, assinatura libera). O app não
  consegue se marcar como assinante: `contas` só muda pelas funções do servidor.
- **Entrar:** e-mail e senha. A conta é criada pela função `cadastrar`, já
  confirmada, porque o e-mail padrão do Supabase só entrega para a equipe.
  "Esqueci a senha" manda o link do Supabase e, na volta, pede a senha nova;
  só funciona para todos depois do SMTP próprio (ex.: Resend no domínio).
- **Minha conta:** situação do grátis ou da assinatura, "Cancelar assinatura"
  (função `cancelar-assinatura`, o CDC pede cancelamento pelo mesmo canal; o
  acesso segue até o fim do período pago) e "Excluir minha conta" (função
  `excluir-conta`: cancela a assinatura e apaga tudo, LGPD).
- **Pagamento confirmado sem depender do aviso:** `conferir-assinatura`
  pergunta ao Mercado Pago na volta do pagamento e a cada abertura de quem tem
  assinatura em andamento. O webhook continua sendo o caminho principal.
- **Furo fechado:** quem abre o pagamento e cancela sem pagar não ganha o
  "até o fim do período"; isso só vale para quem estava com assinatura ativa.
- **Sincronização:** o app continua gravando no navegador; `conta.js` sobe cada
  gravação para a tabela `dados` e, ao entrar, baixa o que está na conta.
  Paciente não está em nenhuma chave sincronizada.
- **Resposta na hora:** a liberação usa a última situação conhecida e o
  servidor confirma logo depois; sem internet na abertura, o Pronto não trava
  o plantão.
- **Termos e privacidade:** `termos.html` e `privacidade.html`, rascunhos com
  razão social, CNPJ e contato em branco. Revisar com advogado antes de cobrar.

### Ligar o Mercado Pago (feito pelo Gabriel, uma vez)

1. Na conta do Mercado Pago: Suas integrações → criar aplicação → copiar o
   **Access Token** (o de teste primeiro, depois o de produção).
2. Mandar o token no chat (o Claude grava na tabela `privado.config`, que só
   as funções do servidor leem) ou criar o segredo `MP_ACCESS_TOKEN` em
   Supabase → Edge Functions → Secrets. O segredo do ambiente vale primeiro.
3. No Mercado Pago, na aplicação: Webhooks → URL
   `https://ukuzyoutntepdullrpzq.supabase.co/functions/v1/mp-webhook`, eventos
   de **Planos e assinaturas**. Copiar a assinatura secreta e criar o segredo
   `MP_WEBHOOK_SECRET` no Supabase.
4. Testar com um comprador de teste do Mercado Pago antes de trocar para o
   token de produção.

### Entrar com Google e Apple (feito pelo Gabriel, uma vez)

Os botões ficam escondidos até o provedor ser ligado no Supabase (o app
consulta `/auth/v1/settings`). Quem entra por eles aceita os termos pelo texto
embaixo dos botões; o aceite vai para os metadados da conta. Se o e-mail já
tiver conta com senha, o Supabase junta as duas.

Antes dos dois: Supabase → Authentication → URL Configuration → Site URL
`https://gabrielsouzaf77-rgb.github.io/pronto/` e, em Redirect URLs, esse
mesmo endereço e `http://localhost:4210/`.

- **Google** (grátis): console.cloud.google.com → projeto novo → Tela de
  consentimento OAuth (Externo, nome "Pronto") → Credenciais → ID do cliente
  OAuth, tipo Aplicativo da Web. Origem: `https://gabrielsouzaf77-rgb.github.io`.
  URI de redirecionamento:
  `https://ukuzyoutntepdullrpzq.supabase.co/auth/v1/callback`. Colar o ID e o
  segredo em Supabase → Authentication → Sign In / Providers → Google.
- **Apple** (exige o Apple Developer Program, US$ 99 por ano):
  developer.apple.com → Identifiers → App ID com "Sign in with Apple" e um
  Services ID (ex.: `br.pronto.web`) com o domínio
  `ukuzyoutntepdullrpzq.supabase.co` e o retorno
  `https://ukuzyoutntepdullrpzq.supabase.co/auth/v1/callback`. Em Keys, criar
  uma chave de Sign in with Apple e baixar o `.p8` (anotar Key ID e Team ID).
  No Supabase → Providers → Apple: Services ID e o segredo gerado a partir do
  `.p8`. Esse segredo vence a cada 6 meses e precisa ser gerado de novo.

## Lançamento (30/10/2026)

- **App instalável:** `manifest.webmanifest` e ícones `marca/icone-*.png`. No
  celular, "Adicionar à tela inicial" abre o Pronto como app.
- **Abre rápido e aguenta internet ruim:** `sw.js` guarda CSS, JS, fonte,
  marca e a biblioteca do Supabase; a página vem da rede e, sem rede, da última
  versão. Supabase nunca passa pelo cache. O `versionar.py` troca a versão do
  cache junto com a do site. Não registra em `localhost`.
- **Prévia do link:** `marca/og.png` (1200 x 630) e tags Open Graph, para o
  link ir bonito no WhatsApp. Gerada por `ferramentas/gerar_imagens.py` a
  partir de `ferramentas/og.html`.

### Domínio próprio (pronto.med.br)

O `.med.br` é da categoria "profissionais liberais, destinado a médicos"
(Resolução CGI.br/RES/2008/008): sai no CPF do sócio médico, R$ 40/ano.
Estava livre em 22/10/2026. Combinar por escrito que o domínio é do Pronto.

1. Sócio registra `pronto.med.br` em registro.br e escolhe "usar os DNS do
   Registro.br".
2. No DNS: quatro registros `A` para `185.199.108.153`, `185.199.109.153`,
   `185.199.110.153`, `185.199.111.153` e `CNAME` de `www` para
   `gabrielsouzaf77-rgb.github.io`.
3. `python ferramentas/trocar_dominio.py pronto.med.br`, publicar o site e a
   função `assinar` de novo.
4. GitHub → repositório `pronto` → Settings → Pages: domínio `pronto.med.br`
   e "Enforce HTTPS".
5. Supabase → Authentication → URL Configuration: Site URL e Redirect URLs
   com `https://pronto.med.br/`. Google e Apple: trocar a origem também.
6. E-mail: Resend com o domínio (registros TXT/MX que ele mostrar) e o SMTP do
   Resend em Supabase → Authentication → SMTP. Isso libera "Esqueci a senha".

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
- Ligar o Mercado Pago (passos em "Contas e assinatura") e testar com comprador
  de teste.
- Preencher razão social, CNPJ e contato em `termos.html` e `privacidade.html`
  e passar por advogado.
- SMTP próprio no Supabase para "esqueci a senha" e confirmação de e-mail
  (hoje qualquer e-mail cria conta, o que permite repetir os 10 grátis).
- Levar o código para um repositório privado (Vercel ou Cloudflare Pages).

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura da página |
| `assets/styles.css` | Visual, celular e impressão |
| `assets/app.js` | Busca, itens, folha, modelos e prontuário |
| `assets/tour.js` | Tour de boas-vindas |
| `assets/conta.js` | Entrada, sincronização, uso grátis e assinatura |
| `assets/demo.js` | Dados da demonstração (`?demo`) |
| `termos.html`, `privacidade.html` | Rascunhos legais (`assets/legal.css`) |
| `supabase/` | Banco (migrações) e funções do servidor |
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

// Fotografa o Pronto de verdade (app.html?demo) em alta resolução para a vitrine.
// Precisa do servidor local (pré-visualização rx-plantao, porta 4210).
// Uso: PPT=<caminho do puppeteer-core> CHROME=<chrome.exe> node ferramentas/capturar_telas.cjs
const puppeteer = require(process.env.PPT);
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:4210/app.html?demo';
const SAIDA = path.join(__dirname, '..', 'assets', 'telas');
fs.mkdirSync(SAIDA, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Monta o atendimento: paciente preenchido e a ITU trazida pelo "Por diagnóstico".
async function montar(p) {
  await p.evaluate(() => {
    document.querySelector('.demo-faixa')?.remove();
    const pront = window.Pronto;
    if (pront) pront.guarda.gravar('tourVisto', true);
    document.querySelector('.tour')?.remove();
    const campo = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    campo('#pacNome', 'Ana Beatriz Souza');
    campo('#pacIdade', '28 anos');
    const sexo = document.querySelector('#pacSexo');
    sexo.value = [...sexo.options].find((o) => /fem/i.test(o.textContent))?.value || sexo.options[1].value;
    sexo.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-diag="ddemo1"]').click();
    document.querySelector('#toast')?.classList.remove('toast--on');
  });
  await espera(900);
  await p.evaluate(() => document.querySelector('#toast')?.classList.remove('toast--on'));
}

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: 'new', args: ['--no-sandbox', '--lang=pt-BR'] });

  // 1 e 2: computador, receita e prontuário
  const p = await b.newPage();
  await p.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await espera(1500);
  await montar(p);
  await p.evaluate(() => window.scrollTo(0, 0));
  await espera(400);
  await p.screenshot({ path: path.join(SAIDA, 'receita.png'), clip: { x: 0, y: 0, width: 1200, height: 900 } });
  await p.evaluate(() => { document.querySelector('#tabbtn-prontuario').click(); window.scrollTo(0, 0); });
  await espera(900);
  await p.screenshot({ path: path.join(SAIDA, 'prontuario.png'), clip: { x: 0, y: 0, width: 1200, height: 900 } });

  // 3: a receita impressa (o que sai da impressora)
  await p.evaluate(() => {
    document.querySelector('#tabbtn-prescricao').click();
    window.print = () => {};
    document.querySelector('#btnImprimir').click();
  });
  await espera(600);
  await p.emulateMediaType('print');
  await p.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await espera(600);
  const folha = await p.$('#impressao .folha--impressa');
  if (folha) await folha.screenshot({ path: path.join(SAIDA, 'impressa.png') });
  await p.close();

  // 4: celular
  const c = await b.newPage();
  await c.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await c.goto(BASE, { waitUntil: 'networkidle0' });
  await espera(1500);
  await montar(c);
  await c.evaluate(() => window.scrollTo(0, 0));
  await espera(500);
  await c.screenshot({ path: path.join(SAIDA, 'celular.png') });

  await b.close();
  console.log(fs.readdirSync(SAIDA).join(', '));
})();

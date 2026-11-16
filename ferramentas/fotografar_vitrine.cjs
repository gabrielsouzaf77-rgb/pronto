// Fotografa a vitrine em várias alturas da rolagem (as animações dependem dela), no computador e no celular.
// Uso: PPT=<puppeteer-core> CHROME=<chrome.exe> node ferramentas/fotografar_vitrine.cjs [url] [pasta]
const puppeteer = require(process.env.PPT);
const path = require('path');
const fs = require('fs');

const URL_ = process.argv[2] || 'http://localhost:4210/?vitrine';
const SAIDA = process.argv[3] || path.join(__dirname, '..', '.taste-skill', 'fotos');
fs.mkdirSync(SAIDA, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function rodar(b, nome, viewport) {
  const p = await b.newPage();
  await p.setViewport(viewport);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await espera(2600);
  const altura = await p.evaluate(() => document.documentElement.scrollHeight);
  const passo = Math.round(viewport.height * 0.85);
  let i = 0;
  for (let y = 0; y < altura; y += passo) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await espera(1400);
    await p.screenshot({ path: path.join(SAIDA, `${nome}-${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 78 });
    i++;
  }
  await p.close();
  return i;
}

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: 'new', args: ['--no-sandbox', '--lang=pt-BR'] });
  const n1 = await rodar(b, 'pc', { width: 1440, height: 900, deviceScaleFactor: 1 });
  const n2 = await rodar(b, 'cel', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await b.close();
  console.log('pc', n1, 'cel', n2, SAIDA);
})();

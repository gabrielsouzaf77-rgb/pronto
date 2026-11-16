"""Marca uma versão nova nos arquivos que as páginas carregam (styles.css?v=..., app.js?v=...).

O GitHub Pages deixa o navegador guardar CSS e JS por alguns minutos. Sem a marca, quem já abriu o
site pode receber a página nova com o estilo antigo. Vale para a vitrine (index.html) e para o
sistema (app.html). Rode antes de cada publicação:

    python ferramentas/versionar.py
"""
import io
import os
import re
import time

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
versao = time.strftime('%Y%m%d%H%M')

for pagina in ('index.html', 'app.html'):
    caminho = os.path.join(RAIZ, pagina)
    html = io.open(caminho, encoding='utf-8').read()
    novo, trocas = re.subn(r'((?:href|src)="assets/[^"?]+)(?:\?v=[^"]*)?"', rf'\1?v={versao}"', html)
    io.open(caminho, 'w', encoding='utf-8', newline='\n').write(novo)
    print(f'{pagina}: versão {versao} em {trocas} arquivos')

# O service worker troca de cache junto, para o app instalado não ficar com a versão velha.
sw = os.path.join(RAIZ, 'sw.js')
codigo = io.open(sw, encoding='utf-8').read()
io.open(sw, 'w', encoding='utf-8', newline='\n').write(re.sub(r"const VERSAO = '[^']*';", f"const VERSAO = '{versao}';", codigo))
print('sw.js na mesma versão')

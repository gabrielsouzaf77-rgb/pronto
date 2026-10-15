"""Marca uma versão nova nos arquivos que o index.html carrega (styles.css?v=..., app.js?v=...).

O GitHub Pages deixa o navegador guardar CSS e JS por alguns minutos. Sem a marca, quem já abriu o
site pode receber a página nova com o estilo antigo. Rode antes de cada publicação:

    python ferramentas/versionar.py
"""
import io
import os
import re
import time

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
caminho = os.path.join(RAIZ, 'index.html')
versao = time.strftime('%Y%m%d%H%M')

html = io.open(caminho, encoding='utf-8').read()
novo, trocas = re.subn(r'((?:href|src)="assets/[^"?]+)(?:\?v=[^"]*)?"', rf'\1?v={versao}"', html)
io.open(caminho, 'w', encoding='utf-8', newline='\n').write(novo)
print(f'versão {versao} em {trocas} arquivos')

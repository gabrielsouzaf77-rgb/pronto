"""Monta a página do link privado de teste (artefato do Claude) a partir do index.html.

O publicador do artefato já envolve o conteúdo em <html>/<head>/<body>, então aqui vai só o
miolo do <body>, com o título, os ícones, o CSS e duas marcações da versão de teste:
sem impressão (o visualizador não permite) e com uma receita de exemplo ao abrir.

Uso: python ferramentas/montar_pagina_teste.py [arquivo de saída]
"""
import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
saida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'pagina-teste.html')

h = io.open(os.path.join(RAIZ, 'index.html'), encoding='utf-8').read()
cabeca = h[h.index('<head>'):h.index('</head>')]
titulo = re.search(r'<title>.*?</title>', cabeca).group(0)
links = '\n'.join(re.findall(r'<link rel="(?:icon|apple-touch-icon|stylesheet)"[^>]*>', cabeca))
miolo = h[h.index('<body'):h.index('</body>')]
miolo = miolo[miolo.index('>') + 1:]

pagina = (
    f'{titulo}\n{links}\n'
    '<script>\n'
    '  window.RX_SEM_IMPRESSAO = true;\n'
    '  window.RX_EXEMPLO = true;\n'
    "  document.body.classList.add('entrando');\n"
    "  document.body.dataset.tab = 'prescricao';\n"
    '</script>\n'
    + miolo
)
assert '<!doctype' not in pagina.lower() and '<html' not in pagina and '<body' not in pagina
io.open(saida, 'w', encoding='utf-8', newline='\n').write(pagina)
print('ok', saida, len(pagina))

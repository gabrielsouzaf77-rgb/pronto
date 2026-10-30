"""Passa o Pronto para o domínio próprio (ex.: pronto.med.br).

Faz, de uma vez:
- cria o arquivo CNAME (o GitHub Pages passa a servir o site no domínio);
- troca o endereço antigo pelo novo na prévia do link (index.html) e no retorno do pagamento
  (supabase/functions/assinar).

Depois de rodar: publicar o site, publicar de novo a função "assinar" e seguir o checklist
"Domínio próprio" do README (DNS no Registro.br, HTTPS no GitHub, URLs no Supabase).

Uso: python ferramentas/trocar_dominio.py pronto.med.br
"""
import io
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ANTIGO = 'https://gabrielsouzaf77-rgb.github.io/pronto/'

if len(sys.argv) != 2 or not re.fullmatch(r'[a-z0-9-]+(\.[a-z0-9-]+)+', sys.argv[1]):
    sys.exit('Uso: python ferramentas/trocar_dominio.py pronto.med.br')
dominio = sys.argv[1]
novo = f'https://{dominio}/'

(RAIZ / 'CNAME').write_text(dominio + '\n', encoding='utf-8')
print('CNAME ->', dominio)

for relativo in ['index.html', 'supabase/functions/assinar/index.ts']:
    arquivo = RAIZ / relativo
    texto = io.open(arquivo, encoding='utf-8').read()
    if ANTIGO in texto:
        io.open(arquivo, 'w', encoding='utf-8', newline='\n').write(texto.replace(ANTIGO, novo))
        print('atualizado', relativo)

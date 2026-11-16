"""Converte as capturas de assets/telas (capturar_telas.cjs) para .webp e recorta o "Por diagnóstico".

Uso: python ferramentas/telas_webp.py
"""
from pathlib import Path
from PIL import Image

TELAS = Path(__file__).resolve().parent.parent / 'assets' / 'telas'
SAIDAS = {
    'receita.png': ('tela-receita.webp', None, 2400),
    'prontuario.png': ('tela-prontuario.webp', None, 2400),
    'impressa.png': ('tela-impressa.webp', None, 1200),
    'celular.png': ('tela-celular.webp', None, 780),
    'diagnostico.png': ('tela-diagnostico.webp', None, 560),
}

for origem, (destino, recorte, largura) in SAIDAS.items():
    arq = TELAS / origem.split('#')[0]
    if not arq.exists():
        continue
    img = Image.open(arq).convert('RGB')
    if recorte:
        img = img.crop(recorte)
    if img.width > largura:
        img = img.resize((largura, round(img.height * largura / img.width)), Image.LANCZOS)
    img.save(TELAS / destino, 'WEBP', quality=86, method=6)
    print(destino, img.size)

for png in TELAS.glob('*.png'):
    png.unlink()

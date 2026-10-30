"""Gera as imagens do lançamento com o Chrome sem janela:

- marca/og.png (1200 x 630): prévia do link no WhatsApp e nas redes, a partir de ferramentas/og.html;
- marca/icone-192.png e marca/icone-512.png: ícones do app instalado (manifesto), a partir de
  marca/pronto-icone-ios.svg (quadrado azul com o "p.", já com margem para o recorte do Android).

Uso: python ferramentas/gerar_imagens.py
"""
import os
import pathlib
import subprocess

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CHROME = next(p for p in [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    '/usr/bin/google-chrome',
] if os.path.exists(p))


def foto(origem: pathlib.Path, destino: pathlib.Path, largura: int, altura: int):
    subprocess.run([
        CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        f'--window-size={largura},{altura}', '--virtual-time-budget=3000', '--default-background-color=00000000',
        f'--screenshot={destino}', origem.as_uri(),
    ], check=True, capture_output=True)
    print('ok', destino.relative_to(RAIZ))


foto(RAIZ / 'ferramentas' / 'og.html', RAIZ / 'marca' / 'og.png', 1200, 630)
foto(RAIZ / 'marca' / 'pronto-icone-ios.svg', RAIZ / 'marca' / 'icone-512.png', 512, 512)
# O Chrome sem janela não abre menor que ~500 px: o de 192 sai reduzindo o de 512.
from PIL import Image  # noqa: E402
Image.open(RAIZ / 'marca' / 'icone-512.png').convert('RGB').resize((192, 192), Image.LANCZOS).save(RAIZ / 'marca' / 'icone-192.png', optimize=True)
print('ok marca/icone-192.png')

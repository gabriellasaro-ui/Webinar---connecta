"""
Gera as imagens otimizadas que a pagina usa (static/image/) a partir dos
originais em statics/ e do BG.jpg.jpeg.

Trocou algum arquivo em statics/? Rode:

    python gerar_imagens.py

So roda na maquina local (precisa de Pillow). O deploy leva apenas o
resultado em static/image/.
"""

import os

from PIL import Image

RAIZ = os.path.dirname(os.path.abspath(__file__))
ORIGEM = os.path.join(RAIZ, "statics")
DESTINO = os.path.join(RAIZ, "static", "image")


def abrir(nome):
    return Image.open(os.path.join(ORIGEM, nome))


def salvar(im, nome, **kw):
    caminho = os.path.join(DESTINO, nome)
    im.save(caminho, **kw)
    print(f"  {nome:<22} {im.size[0]}x{im.size[1]}  {os.path.getsize(caminho) // 1024} KB")


def main():
    os.makedirs(DESTINO, exist_ok=True)

    # fundo da identidade: o original tem 5000px, a pagina nao precisa disso
    bg = Image.open(os.path.join(RAIZ, "BG.jpg.jpeg")).convert("RGB")
    bg.thumbnail((2400, 2400), Image.LANCZOS)
    salvar(bg, "bg.webp", quality=74, method=6)

    # banners do hero
    pc = abrir("banner pc.png").convert("RGB")
    salvar(pc, "banner-pc.webp", quality=86, method=6)
    salvar(abrir("banner mobile.png").convert("RGB"), "banner-mobile.webp", quality=84, method=6)

    # previa de compartilhamento (WhatsApp, redes): 1200x630 a partir do banner
    og = pc.resize((1200, round(1200 * pc.height / pc.width)), Image.LANCZOS)
    topo = max(0, (og.height - 630) // 2)
    salvar(og.crop((0, topo, 1200, topo + 630)), "og.jpg", quality=84, optimize=True, progressive=True)

    # foto da secao "Quem e Pedro Lucas"
    salvar(abrir("pedro.jpeg").convert("RGB"), "pedro.webp", quality=84, method=6)

    # prints de depoimento (conversas de WhatsApp)
    for n in range(1, 5):
        salvar(abrir(f"depoimento {n}.jpeg").convert("RGB"), f"depoimento-{n}.webp", quality=86, method=6)

    # logo branca recortada rente ao desenho
    logo = abrir("logo-marca-branca.png").convert("RGBA")
    logo = logo.crop(logo.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox())
    salvar(logo, "logo.webp", quality=90, lossless=True)
    salvar(logo, "logo.png", optimize=True)

    # favicon: quadrado azul da marca
    fav = abrir("logo-480.png").convert("RGB")
    salvar(fav.resize((192, 192), Image.LANCZOS), "favicon.png", optimize=True)
    salvar(fav.resize((180, 180), Image.LANCZOS), "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    print("Gerando imagens em static/image/ ...")
    main()
    print("Pronto.")

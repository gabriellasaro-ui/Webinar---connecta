"""
Servidor da LP da live Imobiliaria Previsivel.

Uma unica app Flask serve todas as LPs guardadas em templates/.
Rotas:
    /                 -> templates/index.html
    /<slug>           -> templates/<slug>.html
    /lp/<slug>        -> mesmo alvo, mantem o padrao /lp/<slug> do sistema
    /health           -> checagem usada pelo EasyPanel
"""

import os
import re

from flask import Flask, abort, jsonify, render_template

app = Flask(__name__)

# ---------------------------------------------------------------- config ----
IS_DEV = os.getenv("FLASK_ENV", "production").lower() in ("dev", "development")

# Em desenvolvimento nada fica em cache. Em producao os estaticos ficam 7 dias.
app.config["TEMPLATES_AUTO_RELOAD"] = IS_DEV
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0 if IS_DEV else 60 * 60 * 24 * 7
app.jinja_env.auto_reload = IS_DEV

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


@app.url_defaults
def versionar_estaticos(endpoint, values):
    """Anexa ?v=<data do arquivo> a todo url_for('static', ...).

    Os estaticos ficam 7 dias em cache no navegador. Com a versao na URL,
    trocar uma imagem ou o CSS aparece na hora, sem esperar o cache vencer.
    """
    if endpoint != "static" or "filename" not in values:
        return
    caminho = os.path.join(app.static_folder, values["filename"])
    if os.path.isfile(caminho):
        values["v"] = int(os.path.getmtime(caminho))


# Convite do grupo de WhatsApp da live. Todos os botoes da pagina levam
# para ele: o template usa {{ grupo_whatsapp }}. Troque aqui ou defina a
# variavel URL_GRUPO_WHATSAPP no EasyPanel.
GRUPO_WHATSAPP = os.getenv(
    "URL_GRUPO_WHATSAPP",
    "https://chat.whatsapp.com/GlutBD2HTw7ANQ70eN8Cr4",
)


@app.context_processor
def injetar_links():
    return {"grupo_whatsapp": GRUPO_WHATSAPP}


# ------------------------------------------------------------- landing -----
def _render_lp(slug):
    """Renderiza templates/<slug>.html, barrando slug fora do padrao."""
    if not SLUG_RE.match(slug or ""):
        abort(404)

    path = os.path.join(app.root_path, "templates", f"{slug}.html")
    if not os.path.isfile(path):
        abort(404)

    return render_template(f"{slug}.html")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/lp/<slug>")
def lp_prefixed(slug):
    return _render_lp(slug)


@app.route("/<slug>")
def lp(slug):
    return _render_lp(slug)


# -------------------------------------------------------------- utilidades -
@app.get("/health")
def health():
    return jsonify(status="ok", dev=IS_DEV)


@app.get("/lp/help")
def list_slugs():
    slugs = sorted(
        f[:-5] for f in os.listdir(os.path.join(app.root_path, "templates"))
        if f.endswith(".html") and not f.startswith("_")
    )
    return jsonify(total=len(slugs), slugs=slugs)


@app.errorhandler(404)
def nao_encontrado(_err):
    return jsonify(ok=False, error="pagina nao encontrada"), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5011, debug=IS_DEV)

import os
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

from excel_to_json import convert_excel_to_json

APP_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(APP_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
JSON_DIR = os.path.join(DATA_DIR, "json")
XLSX_DIR = os.path.join(DATA_DIR, "xlsx")
IGNORE_LIST_PATH = os.path.join(BASE_DIR, "ignore_quizzes.txt")

os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(XLSX_DIR, exist_ok=True)

app = Flask(__name__, static_folder=APP_DIR, static_url_path="")


KNOWN_LABELS = {
    "az900.json": "AZ-900 (Azure Fundamentals)",
    "sc900.json": "SC-900 (Security, Compliance)",
    "ai900.json": "AI-900 (AI Fundamentals)"
}


def build_label(filename: str) -> str:
    lower_name = filename.lower()
    if lower_name in KNOWN_LABELS:
        return KNOWN_LABELS[lower_name]
    name = os.path.splitext(filename)[0].upper()
    return f"{name} (import)"


def list_json_files():
    if not os.path.isdir(JSON_DIR):
        return []
    ignored = load_ignored_quizzes()
    files = [
        f for f in os.listdir(JSON_DIR)
        if os.path.isfile(os.path.join(JSON_DIR, f)) and f.lower().endswith(".json")
    ]
    files = [f for f in files if f.lower() not in ignored]
    return sorted(files, key=str.lower)


def load_ignored_quizzes():
    if not os.path.isfile(IGNORE_LIST_PATH):
        return set()
    ignored = set()
    with open(IGNORE_LIST_PATH, "r", encoding="utf-8") as handle:
        for line in handle:
            entry = line.strip()
            if not entry or entry.startswith("#"):
                continue
            ignored.add(entry.lower())
    return ignored


@app.route("/")
def index():
    return send_from_directory(APP_DIR, "index.html")


@app.route("/api/upload-xlsx", methods=["POST"])
def upload_xlsx():
    if "file" not in request.files:
        return jsonify({"error": "Brak pliku w żądaniu."}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nie wybrano pliku."}), 400

    filename = secure_filename(file.filename)
    if not filename.lower().endswith(".xlsx"):
        return jsonify({"error": "Dozwolone są tylko pliki .xlsx."}), 400

    xlsx_path = os.path.join(XLSX_DIR, filename)
    file.save(xlsx_path)

    json_filename = f"{os.path.splitext(filename)[0]}.json"
    json_path = os.path.join(JSON_DIR, json_filename)

    questions = convert_excel_to_json(xlsx_path, json_path)
    if not questions:
        return jsonify({"error": "Konwersja nie powiodła się."}), 500

    return jsonify({
        "filename": f"data/json/{json_filename}",
        "label": build_label(json_filename),
        "total_questions": len(questions)
    })


@app.route("/api/quizzes", methods=["GET"])
def list_quizzes():
    items = []
    for filename in list_json_files():
        items.append({
            "filename": f"data/json/{filename}",
            "label": build_label(filename)
        })
    return jsonify({"quizzes": items})


@app.route("/data/<path:filename>")
def data_files(filename):
    return send_from_directory(DATA_DIR, filename)


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(APP_DIR, filename)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)

import os
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Permitimos TODO para probar
CORS(app, supports_credentials=True, origins=["https://jimqm03.github.io"])

@app.route('/')
def test():
    return jsonify({"mensaje": "EL SERVIDOR VIVE"}), 200

@app.route('/login', methods=['POST', 'OPTIONS'])
def login_test():
    return jsonify({"status": "success", "mensaje": "CORS corregido"}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
import os
import mysql.connector
from flask import Flask, request, jsonify
from flask_cors import CORS # Importante
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt

app = Flask(__name__)


app.secret_key = "llave_secreta_gestion_g"
JWT_SECRET = "jwt_secret_key_gestion_g_2024"

# --- CONEXIÓN DIRECTA A TU DB DE RAILWAY ---
def conectar_db():
    try:
        return mysql.connector.connect(
            host="nozomi.proxy.rlwy.net",
            user="root",
            password="egddxkxJxQTroZyaHVvEGdZJSAsFFiTS",
            database="railway",
            port=32514,
            connect_timeout=10
        )
    except Exception as e:
        print(f"Error de conexión DB: {e}")
        return None

@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    data = request.json
    db = conectar_db()
    if not db: return jsonify({"status": "error", "mensaje": "Sin DB"}), 500
    
    try:
        cursor = db.cursor()
        query = "INSERT INTO ingresos (monto, descripcion, fecha, usuario_id) VALUES (%s, %s, %s, %s)"
        # Usamos usuario_id 1 por defecto para facilitar la entrega
        cursor.execute(query, (data['monto'], data['descripcion'], datetime.now(), 1))
        db.commit()
        return jsonify({"status": "success", "mensaje": "Ingreso guardado"})
    except Exception as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        db.close()

@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    data = request.json
    db = conectar_db()
    if not db: return jsonify({"status": "error", "mensaje": "Sin DB"}), 500
    
    try:
        cursor = db.cursor()
        query = "INSERT INTO gastos (nombre, valor, fecha, usuario_id) VALUES (%s, %s, %s, %s)"
        cursor.execute(query, (data['nombre'], data['valor'], data['fecha'], 1))
        db.commit()
        return jsonify({"status": "success", "mensaje": "Gasto guardado"})
    except Exception as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        db.close()

@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    db = conectar_db()
    if not db: return jsonify({"status": "error"}), 500
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT COALESCE(SUM(monto), 0) as t FROM ingresos WHERE usuario_id = 1")
    ing = float(cursor.fetchone()['t'])
    cursor.execute("SELECT COALESCE(SUM(valor), 0) as t FROM gastos WHERE usuario_id = 1")
    gas = float(cursor.fetchone()['t'])
    db.close()
    return jsonify({"status": "success", "total_ingresos": ing, "saldo": ing - gas})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
import os
import mysql.connector
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)

# Configuración de CORS corregida
CORS(app, 
     origins=["http://127.0.0.1:5500", "http://localhost:5500", "https://jimqm03.github.io"],
     supports_credentials=True)

app.secret_key = "llave_secreta_gestion_g"

# --- CONEXIÓN A DB ---
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

# --- LOGIN ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u = data.get('usuario')
    p = data.get('password')
    db = conectar_db()
    if not db: return jsonify({"status": "error", "mensaje": "Error DB"}), 500
    
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE usuario = %s", (u,))
    user = cursor.fetchone()
    db.close()
    
    if user and check_password_hash(user['password'], p):
        session['usuario'] = u
        return jsonify({"status": "success", "usuario": u})
    return jsonify({"status": "error", "mensaje": "Credenciales incorrectas"}), 401

# --- LOGOUT ---
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('usuario', None)
    return jsonify({"status": "success"})

# --- GESTIÓN DE GASTOS ---
@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    usuario = session.get('usuario')
    if not usuario: return jsonify({"error": "No autenticado"}), 401
    
    data = request.json
    db = conectar_db()
    if not db: return jsonify({"status": "error"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO gastos (usuario, nombre, valor, prioridad, fecha) VALUES (%s, %s, %s, %s, %s)",
            (usuario, data['nombre'], data['valor'], data.get('prioridad', 'Media'), data['fecha'])
        )
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        db.close()

@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    usuario = session.get('usuario')
    if not usuario: return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM gastos WHERE usuario = %s ORDER BY fecha DESC", (usuario,))
        # Corregido "fechall" a "fetchall"
        gastos = cursor.fetchall()
        return jsonify(gastos)
    finally:
        db.close()

# --- GESTIÓN DE INGRESOS ---
@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    usuario = session.get('usuario')
    if not usuario: return jsonify({"error": "No autenticado"}), 401
    
    data = request.json
    db = conectar_db()
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO ingresos (usuario, monto, clases, descripcion, fecha) VALUES (%s, %s, %s, %s, %s)",
            (usuario, data['monto'], data.get('clases', 0), data.get('descripcion', ''), datetime.now().date())
        )
        db.commit()
        return jsonify({"status": "success"})
    finally:
        db.close()

# --- CÁLCULO DE SALDO ---
@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    usuario = session.get('usuario')
    if not usuario: return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT SUM(monto) as total FROM ingresos WHERE usuario = %s", (usuario,))
        total_ingresos = cursor.fetchone()['total'] or 0

        cursor.execute("SELECT SUM(valor) as total FROM gastos WHERE usuario = %s", (usuario,))
        total_gastos = cursor.fetchone()['total'] or 0

        return jsonify({
            "status": "success",
            "saldo": float(total_ingresos - total_gastos),
            "total_ingresos": float(total_ingresos),
            "total_gastos": float(total_gastos)
        })
    finally:
        db.close()

@app.route('/eliminar-gasto/<int:id>', methods=['DELETE'])
def eliminar_gasto(id):
    usuario = session.get('usuario')
    if not usuario: return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM gastos WHERE id = %s AND usuario = %s", (id, usuario))
    db.commit()
    db.close()
    return jsonify({"status": "success"})

@app.route('/')
def index():
    return "<h1>Servidor GestionG Online Corregido</h1>"

# --- ELIMINAR EL HISTORIAL ---
@app.route('/eliminar-historial', methods=['DELETE'])
def eliminar_historial():
    usuario = session.get('usuario')
    if not usuario: 
        return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    if not db: 
        return jsonify({"status": "error", "mensaje": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        # Eliminamos solo los gastos que pertenecen al usuario logueado
        cursor.execute("DELETE FROM gastos WHERE usuario = %s", (usuario,))
        db.commit()
        return jsonify({"status": "success", "mensaje": "Historial borrado en DB"})
    except Exception as e:
        print(f"Error al borrar historial: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# SIEMPRE DEBE IR AL FINAL
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
import os
import mysql.connector
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

# =================================================================
# 1. CONFIGURACIÓN DE SEGURIDAD Y ENTORNO
# =================================================================
app.secret_key = os.getenv("SECRET_KEY", "clave_maestra_segura_12345")

# CONFIGURACIÓN DE COOKIES (VITAL PARA RAILWAY Y MULTIUSUARIO)
app.config.update(
    SESSION_COOKIE_SAMESITE='None',
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True
)

# supports_credentials es VITAL para que el navegador guarde la sesión del usuario
CORS(app, supports_credentials=True)

# -----------------------------------------------------------------
# EL DICCIONARIO DE CORREOS
# -----------------------------------------------------------------
CORREOS_CLIENTES = {
    "admin": "Jimq293@gmail.com",
    "usuario1": "cristiane.ruizp281@gmail.com",
    "socio2": " ",
    # Agrega los demás aquí...
}

DB_CONFIG = {
    "host": "nozomi.proxy.rlwy.net",
    "user": "root",
    "password": "egddxkxJxQTroZyaHVvEGdZJSAsFFiTS",
    "database": "railway",
    "port": 32514
}

def conectar_db():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"❌ Error de conexión: {err}")
        return None

# =================================================================
# 2. SISTEMA DE ACCESO (Login)
# =================================================================

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u, p = data.get('usuario'), data.get('password')
    
    db = conectar_db()
    if not db: return jsonify({"status": "error", "mensaje": "Error DB"}), 500
    
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, usuario, password FROM usuarios WHERE usuario = %s", (u,))
    user = cursor.fetchone()
    db.close()

    if user and check_password_hash(user['password'], p):
        session.clear()
        session['user_id'] = user['id']
        session['usuario'] = user['usuario']
        return jsonify({"status": "success", "usuario": u})
    
    return jsonify({"status": "error", "mensaje": "Credenciales inválidas"}), 401

@app.route('/logout', methods=['GET'])
def logout():
    session.clear()
    return jsonify({"status": "success"})

# =================================================================
# 3. ENDPOINT DE SALDO GLOBAL (NUEVO PARA EL SCRIPT.JS)
# =================================================================

@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "No login"}), 401
    
    db = conectar_db()
    cursor = db.cursor(dictionary=True)
    try:
        # Sumar ingresos
        cursor.execute("SELECT SUM(monto) as total FROM ingresos WHERE usuario_id = %s", (user_id,))
        ingresos = cursor.fetchone()['total'] or 0
        
        # Sumar gastos
        cursor.execute("SELECT SUM(monto) as total FROM gastos WHERE usuario_id = %s", (user_id,))
        gastos = cursor.fetchone()['total'] or 0
        
        saldo_final = ingresos - gastos
        
        return jsonify({
            "status": "success",
            "saldo": saldo_final,
            "total_ingresos": ingresos,
            "total_gastos": gastos
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# =================================================================
# 4. OPERACIONES DE DATOS
# =================================================================

@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    user_id = session.get('user_id')
    if not user_id: return jsonify({"error": "No login"}), 401
    
    data = request.json
    db = conectar_db()
    cursor = db.cursor()
    # Usamos data['monto'] que es como lo envía el nuevo script.js
    sql = "INSERT INTO gastos (nombre, monto, fecha, prioridad, usuario_id) VALUES (%s, %s, %s, %s, %s)"
    cursor.execute(sql, (data['nombre'], data['monto'], data['fecha'], data['prioridad'], user_id))
    db.commit()
    db.close()
    return jsonify({"status": "success"}), 201

@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    user_id = session.get('user_id')
    if not user_id: return jsonify({"error": "No login"}), 401
    
    data = request.json
    db = conectar_db()
    cursor = db.cursor()
    sql = "INSERT INTO ingresos (monto, clases, descripcion, usuario_id) VALUES (%s, %s, %s, %s)"
    cursor.execute(sql, (data['monto'], data['clases'], data['descripcion'], user_id))
    db.commit()
    db.close()
    return jsonify({"status": "success"}), 201

@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    user_id = session.get('user_id')
    if not user_id: return jsonify([]), 401
    
    db = conectar_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT nombre, monto, fecha, prioridad FROM gastos WHERE usuario_id = %s ORDER BY fecha DESC", (user_id,))
    gastos = cursor.fetchall()
    db.close()
    return jsonify(gastos)

# =================================================================
# 5. CREACIÓN DE USUARIOS (Solo para ti)
# =================================================================

@app.route('/crear-usuario/<u强制/强制p>')
def crear_usuario(u, p):
    db = conectar_db()
    cursor = db.cursor()
    try:
        cursor.execute("INSERT INTO usuarios (usuario, password) VALUES (%s, %s)", 
                      (u, generate_password_hash(p)))
        db.commit()
        return f"✅ Usuario {u} creado correctamente."
    except Exception as e: return str(e)
    finally: db.close()

if __name__ == '__main__':
    # Usar el puerto que Railway asigne
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
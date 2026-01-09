import os
import mysql.connector
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt

app = Flask(__name__)

# Configuración de CORS para GitHub Pages
CORS(app, 
     origins=["https://jimqm03.github.io", "http://localhost:5500", "http://127.0.0.1:5500"],
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.secret_key = "llave_secreta_gestion_g"
JWT_SECRET = "jwt_secret_key_gestion_g_2024"

# --- DICCIONARIO DE CORREOS ---
CORREOS_CLIENTES = {
    "Jim": "Jimq293@gmail.com",
    "CristianRuiz": "cristian@correo.com",
    "Socio3": "socio3@correo.com"
}

# --- CONEXIÓN A BASE DE DATOS ---
def conectar_db():
    try:
        # Forzamos los datos de tu .env directamente para asegurar la entrega
        return mysql.connector.connect(
            host="nozomi.proxy.rlwy.net",
            user="root",
            password="egddxkxJxQTroZyaHVvEGdZJSAsFFiTS",
            database="railway",
            port=32514
        )
    except Exception as e:
        print(f"Error de conexión: {e}")
        return None

# --- FUNCIÓN PARA VERIFICAR TOKEN ---
def verificar_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    try:
        token = auth_header.split(' ')[1]  # "Bearer TOKEN"
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except:
        return None

# --- RUTA PRINCIPAL ---
@app.route('/')
def index():
    return "<h1>Servidor GestionG Online ✅</h1><p>Backend funcionando correctamente</p>"

# --- CREAR USUARIO ---
@app.route('/crear-usuario/<u>/<p>')
def crear_usuario(u, p):
    db = conectar_db()
    if not db:
        return "Error de conexión"
    cursor = db.cursor()
    try:
        hash_p = generate_password_hash(p)
        email = CORREOS_CLIENTES.get(u, f"{u}@gestiong.com")
        
        cursor.execute("""
            INSERT INTO usuarios (nombre_usuario, email_notificaciones, password_hash) 
            VALUES (%s, %s, %s)
        """, (u, email, hash_p))
        db.commit()
        return f"✅ Usuario '{u}' creado correctamente."
    except Exception as e:
        return f"Error: {e}"
    finally:
        db.close()

# --- LOGIN CON JWT ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u = data.get('usuario')
    p = data.get('password')
    
    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "Error de conexión a BD"}), 500
    
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE nombre_usuario = %s", (u,))
    user = cursor.fetchone()
    db.close()
    
    if user and check_password_hash(user['password_hash'], p):
        # Crear token JWT
        token = jwt.encode({
            'usuario_id': user['id'],
            'usuario': u,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        return jsonify({
            "status": "success", 
            "usuario": u,
            "token": token,
            "email": user.get('email_notificaciones', "")
        })
    
    return jsonify({"status": "error", "mensaje": "Usuario o contraseña incorrectos"}), 401

# --- LOGOUT ---
@app.route('/logout', methods=['POST'])
def logout():
    return jsonify({"status": "success"})

# --- GUARDAR GASTO ---
@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    payload = verificar_token()
    if not payload:
        return jsonify({"error": "No autorizado"}), 401
    
    data = request.json
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute("""
            INSERT INTO gastos (usuario_id, tipo, nombre, valor, prioridad, fecha) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            payload['usuario_id'],
            data.get('tipo', 'Gasto General'),
            data.get('nombre'),
            data.get('valor'),
            data.get('prioridad', 'Media'),
            data.get('fecha')
        ))
        db.commit()
        return jsonify({"status": "success", "mensaje": "Gasto guardado"})
    except Exception as e:
        print(f"Error guardando gasto: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# --- GUARDAR INGRESO ---
@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    payload = verificar_token()
    if not payload:
        return jsonify({"error": "No autorizado"}), 401
    
    data = request.json
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute("""
            INSERT INTO ingresos (usuario_id, monto, descripcion, fecha_registro) 
            VALUES (%s, %s, %s, NOW())
        """, (
            payload['usuario_id'],
            data.get('monto'),
            data.get('descripcion', 'Ingreso de clases')
        ))
        db.commit()
        return jsonify({"status": "success", "mensaje": "Ingreso guardado"})
    except Exception as e:
        print(f"Error guardando ingreso: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# --- OBTENER GASTOS ---
@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    payload = verificar_token()
    if not payload:
        return jsonify({"error": "No autorizado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, tipo, nombre, valor, prioridad, fecha 
            FROM gastos 
            WHERE usuario_id = %s 
            ORDER BY fecha DESC
        """, (payload['usuario_id'],))
        gastos = cursor.fetchall()
        
        for gasto in gastos:
            if 'valor' in gasto:
                gasto['valor'] = float(gasto['valor'])
        
        return jsonify(gastos)
    except Exception as e:
        print(f"Error obteniendo gastos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# --- CALCULAR SALDO ---
@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    payload = verificar_token()
    if not payload:
        return jsonify({"error": "No autorizado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0) as total 
            FROM ingresos 
            WHERE usuario_id = %s
        """, (payload['usuario_id'],))
        total_ingresos = float(cursor.fetchone()['total'])
        
        cursor.execute("""
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM gastos 
            WHERE usuario_id = %s
        """, (payload['usuario_id'],))
        total_gastos = float(cursor.fetchone()['total'])
        
        saldo = total_ingresos - total_gastos
        
        return jsonify({
            "status": "success",
            "total_ingresos": total_ingresos,
            "total_gastos": total_gastos,
            "saldo": saldo
        })
    except Exception as e:
        print(f"Error calculando saldo: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
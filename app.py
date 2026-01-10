import os
import mysql.connector
from flask import Flask, request, jsonify
from flask_cors import CORS # Importante
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
from flask_cors import CORS

app = Flask(__name__)

# Permite que jimqm03.github.io entre a la base de datos sin problemas.
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


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
# --- INCIALIZAR TABLAS ---
def inicializar_tablas():
    """Crea las tablas necesarias si no existen"""
    db = conectar_db()
    if not db:
        print("No se pudo conectar a la base de datos para inicializar tablas")
        return
    
    cursor = db.cursor()

    try:
        # Tabla de usuarios
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usuarios(
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabla de gastos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gastos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario VARCHAR(50) NOT NULL,
                nombre VARCHAR(255) NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                prioridad VARCHAR(20) DEFAULT 'Media',
                fecha DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
            )               
        """)

        # Tabla de ingresos
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ingresos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                       usuario VARCHAR(50) NOT NULL,
                       monto DECIMAL(10,2) NOT NULL,
                       clases  INT DEFAULT 0,
                       descripcion TEXT,
                       fecha DATE NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        db.commit()
        print("Tablas inicializadas correctamente")

    except Exception as e:
        print(f"Error al crear tablas: {e}")
    finally:
        cursor.close()
        db.close()
        
# --- RUTA PRINCIPAL (Para que Railway no de error) ---
@app.route('/')
def index():
    return "<h1>Servidor GestionG Online</h1>"

# --- CREAR USUARIO (Tu herramienta de admin) ---
@app.route('/crear-usuario/<u>/<p>')
def crear_usuario(u, p):

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
    if user and check_password_hash(user['password'], p):
        session['usuario'] = u
        return jsonify({"status": "success", "usuario": u, "email": CORREOS_CLIENTES.get(u, "")})
    return jsonify({"status": "error", "mensaje": "Credenciales incorrectas"}), 401

# --- LOGOUT ---
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('usuario', None)
    return jsonify({"status": "success"})

# --- GESTIÓN DE GASTOS E INGRESOS ---
@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    data = request.json
    usuario = session.get('usuario', 'invitado')

    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute(
            """INSERT INTO gastos (usuario, nombre, valor, prioriodad, fecha)
               VALUES (%s, %s, %s, %s, %s)""",
            (usuario, data['nombre'], data['valor'], data['prioridad'], data['fecha'])
        )
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error al guardar gasto: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# --- GUARDAR INGRESO ---
@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    data = request.json
    usuario = session.get('usuario', 'invitado')
    
    db = conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute(
            """INSERT INTO movimientos (usuario, tipo, monto, categoria, fecha) 
               VALUES (%s, %s, %s, %s, %s)""",
            (usuario, data['monto'], data['clases'], data['descripcion'], datetime.now().date())
        )
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error al guardar ingreso: {e}")
        return jsonify({"status": "error"}), 500
    finally:
        cursor.close()
        db.close()

# --- OBTENER GASTOS ---
@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    usurario = session.get('usuario')
    if not usurario:
        return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify([]), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM gastos WHERE usuario = %s ORDER BY fecha DESC",
            (usurario,)
        )
        gastos = cursor.fechall()
        return jsonify(gastos)
    except Exception as e:
        print(f"Error al obtener gastos: {e}")
        return jsonify([]), 500
    finally:
        cursor.close()
        db.close()

# --- ELIMINAR GASTO ---
@app.route('/eliminar-gasto/<int:id>', methods=['DELETE'])
def eliminar_gasto(id):
    usuario = session.get('usuario')
    if not usuario:
        return jsonify({"error": "No autenticado"}), 401
    
    db= conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM gastos WHERE id = %s AND usuario = %s", (id, usuario))
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(F"Error al eliminar: {e}")
        return jsonify({"status": "error"}), 500
    finally: 
        cursor.close()
        db.close()

# --- CALCULAR SALDO ---
@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    usuario = session.get('usuario')
    if not usuario:
        return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        # Total de ingresos
        cursor.execute("SELECT SUM(monto) as total FROM ingresos WHERE usuario = %s", (usuario,))
        result_ingresos = cursor.fetchone()
        total_ingresos = result_ingresos['total'] or 0

        # Total de gastos
        cursor.execute("SELECT SUM(valor) as total FROM gastos WHERE usuario = %s", (usuario,))
        result_gastos = cursor.fetchone()
        total_gastos = result_gastos['total'] or 0

        saldo = total_ingresos - total_gastos
        
        return jsonify({
            "status": "success",
            "saldo": saldo,
            "total_ingresos": total_ingresos,
            "total_gastos": total_gastos
        })
    except Exception as e:
        print(f"Error al calcular saldo: {e}")
        return jsonify({"status": "error"}), 500
    finally:
        cursor.close()
        db.close()

# --- INICIALIZACIÓN AL ARRANCAR ---
# IMPORTANTE: Esta sección del codigo siempre debe quedar al final del codigo
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
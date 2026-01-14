import os
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from datetime import datetime
import psycopg  # ← CAMBIADO
from psycopg import sql  # ← CAMBIADO
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cri-2026-jim")

# CORS (igual)
CORS(app, 
     resources={r"/*": {
         "origins": [
             "https://jimqm03.github.io", 
             "https://jimqm03.github.io/GestionG",
             "http://localhost:5500",
             "http://localhost:8000"
         ]
     }}, 
     supports_credentials=True)

# --- CONEXIÓN A DB (MODIFICADO) ---
def conectar_db():
    try:
        conn = psycopg.connect(
            host=os.environ.get("DB_HOST"),
            dbname=os.environ.get("DB_NAME"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            port=int(os.environ.get("DB_PORT", 5432))
        )
        print("✅ Conexión exitosa a PostgreSQL con psycopg")
        return conn
    except Exception as e:
        print(f"❌ Error DB: {e}")
        return None

# --- LOGIN (adaptado para psycopg) ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u = data.get('usuario')
    p = data.get('password')

    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "Error de conexión DB"}), 500
    
    try:
        cursor = db.cursor(row_factory=psycopg.rows.dict_row)  # Para obtener diccionarios
        cursor.execute("SELECT * FROM usuarios WHERE nombre_usuario = %s", (u,))
        user = cursor.fetchone()
        
        if user and user['contrasena'] == p:
            session['usuario'] = user['nombre_usuario']
            return jsonify({
                "status": "success", 
                "usuario": user['nombre_usuario']
            }), 200
        
        return jsonify({"status": "error", "mensaje": "Usuario o contraseña incorrectos"}), 401
        
    except Exception as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db:
            db.close()

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
    if not usuario:
        return jsonify({"error": "No autenticado"}), 401

    db = conectar_db()
    cursor = db.cursor()

    try:
        cursor.execute(
            "SELECT id, usuario, nombre, valor, prioridad, fecha "
            "FROM gastos WHERE usuario = %s ORDER BY fecha DESC",
            (usuario,)
        )

        gastos = cursor.fetchall()

        gastos_json = [
            {
                "id": g[0],
                "usuario": g[1],
                "nombre": g[2],
                "valor": float(g[3]),
                "prioridad": g[4],
                "fecha": str(g[5])
            }
            for g in gastos
        ]

        return jsonify(gastos_json)

    except Exception as e:
        print("Error obteniendo gastos:", e)
        return jsonify({"error": "Error interno"}), 500

    finally:
        cursor.close()
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

# === NUEVOS ENDPOINTS (AGREGAR ESTO) ===

# --- VERIFICACIÓN DE SALUD ---
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "GestionG API"}), 200

# --- PÁGINA DE INICIO ---
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "GestionG API",
        "version": "1.0",
        "endpoints": ["/login", "/guardar-gasto", "/obtener-gastos", "/guardar-ingreso", "/calcular-saldo"]
    }), 200

# ========================================

# SIEMPRE DEBE IR AL FINAL
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)


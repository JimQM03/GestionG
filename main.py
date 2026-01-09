import os
import mysql.connector
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)
app.secret_key = "llave_secreta_gestion_g"

# --- DICCIONARIO DE CORREOS (Tu lista de socios) ---
CORREOS_CLIENTES = {
    "Jim": "Jimq293@gmail.com",
    "CristianRuiz": "cristian@correo.com",
    "Socio3": "socio3@correo.com"
}

# --- CONEXIÓN A BASE DE DATOS ---
def conectar_db():
    try:
        return mysql.connector.connect(
            host=os.getenv("MYSQLHOST"),
            user=os.getenv("MYSQLUSER"),
            password=os.getenv("MYSQLPASSWORD"),
            database=os.getenv("MYSQLDATABASE"),
            port=int(os.getenv("MYSQLPORT", 32514))
        )
    except Exception as e:
        print(f"ERROR DB: {e}")
        return None

# --- RUTA PRINCIPAL (Para que Railway no de error) ---
@app.route('/')
def index():
    return "<h1>Servidor GestionG Online</h1>"

# --- CREAR USUARIO (Tu herramienta de admin) ---
@app.route('/crear-usuario/<u>/<p>')
def crear_usuario(u, p):
    db = conectar_db()
    if not db: return "Error de conexión"
    cursor = db.cursor()
    try:
        hash_p = generate_password_hash(p)
        cursor.execute("INSERT INTO usuarios (usuario, password) VALUES (%s, %s)", (u, hash_p))
        db.commit()
        return f"✅ Usuario '{u}' creado correctamente."
    except Exception as e:
        return f"Error: {e}"
    finally:
        db.close()

# --- LOGIN ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u = data.get('usuario')
    p = data.get('password')
    db = conectar_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM usuarios WHERE usuario = %s", (u,))
    user = cursor.fetchone()
    db.close()
    if user and check_password_hash(user['password'], p):
        return jsonify({"status": "success", "usuario": u, "email": CORREOS_CLIENTES.get(u, "")})
    return jsonify({"status": "error"}), 401

# --- GESTIÓN DE GASTOS E INGRESOS ---
@app.route('/get-datos/<usuario>')
def get_datos(usuario):
    db = conectar_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM movimientos WHERE usuario = %s", (usuario,))
    datos = cursor.fetchall()
    db.close()
    return jsonify(datos)

@app.route('/add-movimiento', methods=['POST'])
def add_movimiento():
    d = request.json
    db = conectar_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO movimientos (usuario, tipo, monto, categoria, fecha) VALUES (%s, %s, %s, %s, %s)",
        (d['usuario'], d['tipo'], d['monto'], d['categoria'], d['fecha'])
    )
    db.commit()
    db.close()
    return jsonify({"msg": "ok"})

# --- AGENDA ---
@app.route('/get-agenda/<usuario>')
def get_agenda(usuario):
    db = conectar_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM agenda WHERE usuario = %s", (usuario,))
    tareas = cursor.fetchall()
    db.close()
    return jsonify(tareas)

@app.route('/add-tarea', methods=['POST'])
def add_tarea():
    d = request.json
    db = conectar_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO agenda (usuario, tarea, fecha) VALUES (%s, %s, %s)",
        (d['usuario'], d['tarea'], d['fecha'])
    )
    db.commit()
    db.close()
    return jsonify({"msg": "ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
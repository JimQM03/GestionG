import os
import mysql.connector
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__)

# Configuración de CORS con credenciales
CORS(app, supports_credentials=True, origins=["*"])
app.secret_key = "llave_secreta_gestion_g"

# --- DICCIONARIO DE CORREOS ---
CORREOS_CLIENTES = {
    "Jim": "Jimq293@gmail.com",
    "CristianRuiz": "cristian@correo.com",
    "Socio3": "socio3@correo.com"
}

# --- CONEXIÓN A BASE DE DATOS ---
def conectar_db():
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "nozomi.proxy.rlwy.net"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", "egddxkxJxQTroZyaHVvEGdZJSAsFFiTS"),
            database=os.getenv("DB_NAME", "railway"),
            port=int(os.getenv("DB_PORT", 32514))
        )
    except Exception as e:
        print(f"ERROR DB: {e}")
        return None

# --- RUTA PRINCIPAL ---
@app.route('/')
def index():
    return "<h1>Servidor GestionG Online ✅</h1><p>Backend funcionando correctamente</p>"

# --- CREAR USUARIO (Compatible con tu estructura existente) ---
@app.route('/crear-usuario/<u>/<p>')
def crear_usuario(u, p):
    db = conectar_db()
    if not db:
        return "Error de conexión"
    cursor = db.cursor()
    try:
        hash_p = generate_password_hash(p)
        email = CORREOS_CLIENTES.get(u, f"{u}@gestiong.com")
        
        # Usar tu estructura de tabla usuarios
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

# --- LOGIN ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u = data.get('usuario')
    p = data.get('password')
    
    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "Error de conexión a BD"}), 500
    
    cursor = db.cursor(dictionary=True)
    # Buscar por nombre_usuario en tu tabla
    cursor.execute("SELECT * FROM usuarios WHERE nombre_usuario = %s", (u,))
    user = cursor.fetchone()
    db.close()
    
    if user and check_password_hash(user['password_hash'], p):
        session['usuario'] = u
        session['usuario_id'] = user['id']
        return jsonify({
            "status": "success", 
            "usuario": u, 
            "email": user.get('email_notificaciones', "")
        })
    
    return jsonify({"status": "error", "mensaje": "Usuario o contraseña incorrectos"}), 401

# --- LOGOUT ---
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('usuario', None)
    session.pop('usuario_id', None)
    return jsonify({"status": "success"})

# --- GUARDAR GASTO (Usando tus tablas existentes) ---
@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    if 'usuario_id' not in session:
        return jsonify({"error": "No autorizado"}), 401
    
    data = request.json
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        # Insertar en tu tabla gastos con usuario_id
        cursor.execute("""
            INSERT INTO gastos (usuario_id, tipo, nombre, valor, prioridad, fecha) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            session['usuario_id'],
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

# --- GUARDAR INGRESO (Usando tus tablas existentes) ---
@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    if 'usuario_id' not in session:
        return jsonify({"error": "No autorizado"}), 401
    
    data = request.json
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        # Insertar en tu tabla ingresos con usuario_id
        cursor.execute("""
            INSERT INTO ingresos (usuario_id, monto, descripcion, fecha_registro) 
            VALUES (%s, %s, %s, NOW())
        """, (
            session['usuario_id'],
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

# --- OBTENER GASTOS (Usando tu query UNION) ---
@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    if 'usuario_id' not in session:
        return jsonify({"error": "No autorizado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        # Solo gastos para la tabla
        cursor.execute("""
            SELECT id, tipo, nombre, valor, prioridad, fecha 
            FROM gastos 
            WHERE usuario_id = %s 
            ORDER BY fecha DESC
        """, (session['usuario_id'],))
        gastos = cursor.fetchall()
        
        # Convertir Decimal a float para JSON
        for gasto in gastos:
            if 'valor' in gasto:
                gasto['valor'] = float(gasto['valor'])
        
        return jsonify(gastos)
    except Exception as e:
        print(f"Error obteniendo gastos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# --- OBTENER MOVIMIENTOS (UNION de Ingresos y Gastos) ---
@app.route('/obtener-movimientos', methods=['GET'])
def obtener_movimientos():
    if 'usuario_id' not in session:
        return jsonify({"error": "No autorizado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        # Tu query UNION
        cursor.execute("""
            SELECT 'Ingreso' as tipo, monto as valor, descripcion, fecha_registro as fecha 
            FROM ingresos 
            WHERE usuario_id = %s
            UNION ALL
            SELECT 'Gasto' as tipo, valor, nombre as descripcion, fecha 
            FROM gastos 
            WHERE usuario_id = %s
            ORDER BY fecha DESC 
            LIMIT 50
        """, (session['usuario_id'], session['usuario_id']))
        
        movimientos = cursor.fetchall()
        
        # Convertir Decimal a float
        for mov in movimientos:
            if 'valor' in mov:
                mov['valor'] = float(mov['valor'])
        
        return jsonify(movimientos)
    except Exception as e:
        print(f"Error obteniendo movimientos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# --- CALCULAR SALDO (Con tus tablas) ---
@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    if 'usuario_id' not in session:
        return jsonify({"error": "No autorizado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        # Sumar ingresos
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0) as total 
            FROM ingresos 
            WHERE usuario_id = %s
        """, (session['usuario_id'],))
        total_ingresos = float(cursor.fetchone()['total'])
        
        # Sumar gastos
        cursor.execute("""
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM gastos 
            WHERE usuario_id = %s
        """, (session['usuario_id'],))
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
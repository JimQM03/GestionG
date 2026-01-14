import os
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from datetime import datetime
import psycopg  # ← ESTO es lo correcto para Python 3.9+
from psycopg.rows import dict_row  # ← ASÍ se importa para diccionarios
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cri-2026-jim")

# CORS
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

# --- CONEXIÓN A SUPABASE CON psycopg (v3.x) ---
def conectar_db():
    try:
        db_host = os.environ.get("DB_HOST", "db.uxzhjsmhbsemuvhragmc.supabase.co")
        db_name = os.environ.get("DB_NAME", "postgres")
        db_user = os.environ.get("DB_USER", "postgres")
        db_pass = os.environ.get("DB_PASSWORD")
        db_port = os.environ.get("DB_PORT", "5432")
        
        print(f"🔧 Conectando a: {db_host}")
        
        # OPCIÓN 2: Con verify-full (recomendado para producción)
        conn = psycopg.connect(
            host=db_host,
            dbname=db_name,
            user=db_user,
            password=db_pass,
            port=int(db_port),
            sslmode="verify-full"
        )
        
        print("✅ Conexión exitosa (verify-full)")
        return conn
        
    except Exception as e:
        print(f"❌ Error: {e}")
        
        # Intentar con sslmode=require como fallback
        try:
            print("🔄 Intentando con sslmode=require...")
            conn = psycopg.connect(
                host=db_host,
                dbname=db_name,
                user=db_user,
                password=db_pass,
                port=int(db_port),
                sslmode="require"
            )
            print("✅ Conexión exitosa (require)")
            return conn
        except Exception as e2:
            print(f"❌ Fallback también falló: {e2}")
            return None
        
# --- LOGIN (psycopg v3.x) ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u = data.get('usuario')
    p = data.get('password')

    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "Error de conexión DB"}), 500
    
    try:
        # CON psycopg v3.x se usa row_factory
        cursor = db.cursor(row_factory=dict_row)
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
        print(f"Error en login: {e}")
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
    if not usuario: 
        return jsonify({"error": "No autenticado"}), 401
    
    data = request.json
    db = conectar_db()
    if not db: 
        return jsonify({"status": "error"}), 500
    
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
    if not db:
        return jsonify({"error": "Error DB"}), 500
    
    # CON psycopg v3.x
    cursor = db.cursor(row_factory=dict_row)

    try:
        cursor.execute(
            "SELECT id, usuario, nombre, valor, prioridad, fecha "
            "FROM gastos WHERE usuario = %s ORDER BY fecha DESC",
            (usuario,)
        )

        gastos = cursor.fetchall()

        # Los resultados ya son diccionarios con row_factory=dict_row
        gastos_json = [
            {
                "id": g['id'],
                "usuario": g['usuario'],
                "nombre": g['nombre'],
                "valor": float(g['valor']),
                "prioridad": g['prioridad'],
                "fecha": str(g['fecha'])
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
    if not usuario: 
        return jsonify({"error": "No autenticado"}), 401
    
    data = request.json
    db = conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO ingresos (usuario, monto, clases, descripcion, fecha) VALUES (%s, %s, %s, %s, %s)",
            (usuario, data['monto'], data.get('clases', 0), data.get('descripcion', ''), datetime.now().date())
        )
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        db.close()

# --- CÁLCULO DE SALDO ---
@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    usuario = session.get('usuario')
    if not usuario: 
        return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor(row_factory=dict_row)
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
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        db.close()

# --- ELIMINAR GASTO ---
@app.route('/eliminar-gasto/<int:id>', methods=['DELETE'])
def eliminar_gasto(id):
    usuario = session.get('usuario')
    if not usuario: 
        return jsonify({"error": "No autenticado"}), 401
    
    db = conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM gastos WHERE id = %s AND usuario = %s", (id, usuario))
        db.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        db.close()

# --- ELIMINAR HISTORIAL ---
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
        cursor.execute("DELETE FROM gastos WHERE usuario = %s", (usuario,))
        db.commit()
        return jsonify({"status": "success", "mensaje": "Historial borrado en DB"})
    except Exception as e:
        print(f"Error al borrar historial: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# --- ENDPOINT DE PRUEBA CRÍTICO ---
@app.route('/test-db', methods=['GET'])
def test_db():
    """Endpoint para probar conexión a DB"""
    print("🔍 Ejecutando test-db...")
    
    # Verificar variables de entorno primero
    env_vars = {
        "DB_HOST": os.environ.get("DB_HOST"),
        "DB_USER": os.environ.get("DB_USER"),
        "DB_PASSWORD_set": bool(os.environ.get("DB_PASSWORD")),
        "DATABASE_URL_set": bool(os.environ.get("DATABASE_URL"))
    }
    
    db = conectar_db()
    if not db:
        return jsonify({
            "status": "error", 
            "message": "No se pudo conectar a DB",
            "env_vars": env_vars,
            "suggestion": "Verifica DB_PASSWORD en Render"
        }), 500
    
    cursor = db.cursor(row_factory=dict_row)
    try:
        # Test 1: Versión de PostgreSQL
        cursor.execute("SELECT version()")
        version_result = cursor.fetchone()
        version = version_result['version'] if version_result else "No version"
        
        # Test 2: Tablas disponibles
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row['table_name'] for row in cursor.fetchall()]
        
        # Test 3: Usuarios existentes
        usuarios = []
        if 'usuarios' in tables:
            cursor.execute("SELECT nombre_usuario FROM usuarios LIMIT 5")
            usuarios = [row['nombre_usuario'] for row in cursor.fetchall()]
        
        return jsonify({
            "status": "success",
            "database": "Supabase PostgreSQL",
            "version": version.split(',')[0] if ',' in version else version,
            "tables": tables,
            "usuarios_ejemplo": usuarios,
            "env_vars": env_vars,
            "message": "✅ Conexión exitosa a Supabase"
        })
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": str(e),
            "env_vars": env_vars
        }), 500
    finally:
        cursor.close()
        db.close()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "GestionG API"}), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "GestionG API",
        "version": "1.0",
        "endpoints": [
            "/login", "/logout", "/test-db",
            "/guardar-gasto", "/obtener-gastos",
            "/guardar-ingreso", "/calcular-saldo",
            "/eliminar-gasto", "/eliminar-historial"        
        ]
    }), 200

@app.route('/debug-supabase', methods=['GET'])
def debug_supabase():
    """Endpoint para debug específico de Supabase"""
    import socket
    
    host = "db.uxzhjsmhbsemuvhragmc.supabase.co"
    port = 5432
    
    try:
        # Test de resolución DNS
        ip = socket.gethostbyname(host)
        
        # Test de conexión TCP
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((ip, port))
        sock.close()
        
        return jsonify({
            "status": "debug",
            "supabase_host": host,
            "resolved_ip": ip,
            "port": port,
            "tcp_connection": "reachable" if result == 0 else "unreachable",
            "error_code": result,
            "env_vars": {
                "DB_HOST": os.environ.get("DB_HOST"),
                "DB_USER": os.environ.get("DB_USER"),
                "DB_PASSWORD_set": bool(os.environ.get("DB_PASSWORD")),
                "DB_PORT": os.environ.get("DB_PORT", 5432)
            },
            "message": "✅ Host resuelve correctamente" if result == 0 else "❌ No se puede conectar"
        })
        
    except socket.gaierror as e:
        return jsonify({
            "status": "error",
            "error": "DNS resolution failed",
            "message": str(e),
            "host": host
        }), 500
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": type(e).__name__,
            "message": str(e)
        }), 500

@app.route('/test-connection', methods=['GET'])
def test_connection():
    """Prueba simple de conexión sin consultas complejas"""
    import psycopg
    
    try:
        conn = psycopg.connect(
            host="db.uxzhjsmhbsemuvhragmc.supabase.co",
            dbname="postgres",
            user="postgres",
            password=os.environ.get("DB_PASSWORD", ""),
            port=5432,
            sslmode="require"  # Probar con esto primero
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "✅ Conexión a Supabase exitosa",
            "test_result": result[0]
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "type": type(e).__name__,
            "suggestion": "Verifica DB_PASSWORD en variables de entorno"
        }), 500

# SIEMPRE DEBE IR AL FINAL
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
import os
import socket
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
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

# --- CONEXIÓN A SUPABASE CON IPV4 FORZADA ---
def conectar_db():
    try:
        # Obtener credenciales
        db_host = os.environ.get("DB_HOST", "db.uxzhjsmhbsemuvhragmc.supabase.co")
        db_name = os.environ.get("DB_NAME", "postgres")
        db_user = os.environ.get("DB_USER", "postgres")
        db_pass = os.environ.get("DB_PASSWORD")
        db_port = int(os.environ.get("DB_PORT", 5432))
        
        print(f"🔧 Conectando a Supabase: {db_user}@{db_host}:{db_port}")
        
        # FORZAR RESOLUCIÓN SOLO A IPV4 Y USAR LA PRIMERA DISPONIBLE
        try:
            # Obtener solo direcciones IPv4
            ip_info = socket.getaddrinfo(
                db_host, 
                db_port, 
                socket.AF_INET,  # Solo IPv4
                socket.SOCK_STREAM
            )
            
            if not ip_info:
                raise ValueError("No se encontraron direcciones IPv4")
                
            # Tomar la primera IP IPv4
            ipv4_address = ip_info[0][4][0]
            print(f"   ✅ Resuelto a IPv4: {ipv4_address}")
            
            # Usar la IP directamente
            actual_host = ipv4_address
            
        except (socket.gaierror, ValueError) as resolve_error:
            print(f"   ⚠️ No se pudo resolver IPv4, usando hostname: {resolve_error}")
            actual_host = db_host
        
        # CONEXIÓN CON PARÁMETROS OPTIMIZADOS
        conn = psycopg.connect(
            host=actual_host,
            dbname=db_name,
            user=db_user,
            password=db_pass,
            port=db_port,
            sslmode="require",  # Requerido para Supabase
            connect_timeout=10,
            
            # Parámetros para evitar problemas de red
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=3,
            
            # Evitar IPv6
            options="-c connect_timeout=10 -c statement_timeout=30000"
        )
        
        print("✅ Conexión exitosa a Supabase")
        return conn
        
    except Exception as e:
        print(f"❌ Error DB: {type(e).__name__}: {e}")
        return None

# --- FUNCIÓN AUXILIAR PARA FORZAR IPV4 ---
def get_ipv4_address(hostname):
    """Obtiene una dirección IPv4 para un hostname, evitando IPv6"""
    try:
        # Método 1: Intentar con getaddrinfo específico para IPv4
        ip_info = socket.getaddrinfo(
            hostname, 
            80,  # Puerto dummy para la resolución
            socket.AF_INET,  # SOLO IPv4
            socket.SOCK_STREAM
        )
        
        if ip_info:
            return ip_info[0][4][0]  # Primera dirección IPv4
        
        # Método 2: Si falla, intentar con gethostbyname (obsoleto pero solo IPv4)
        try:
            return socket.gethostbyname(hostname)
        except:
            pass
            
    except Exception:
        pass
    
    # Método 3: Devolver el hostname original
    return hostname

# --- ENDPOINT DE DIAGNÓSTICO MEJORADO ---
@app.route('/network-diagnosis', methods=['GET'])
def network_diagnosis():
    """Diagnóstico completo de red para Supabase"""
    host = "db.uxzhjsmhbsemuvhragmc.supabase.co"
    port = 5432
    
    results = {
        "target": f"{host}:{port}",
        "timestamp": datetime.now().isoformat(),
        "tests": {}
    }
    
    try:
        # Test 1: Resolución DNS IPv4 (forzada)
        try:
            ipv4_address = get_ipv4_address(host)
            results["tests"]["ipv4_resolution"] = {
                "status": "success",
                "method": "forced_ipv4",
                "ip": ipv4_address,
                "note": "Dirección IPv4 obtenida forzando AF_INET"
            }
        except Exception as dns_error:
            results["tests"]["ipv4_resolution"] = {
                "status": "error",
                "error": str(dns_error),
                "method": "forced_ipv4"
            }
        
        # Test 2: Test de conectividad TCP
        if results["tests"]["ipv4_resolution"]["status"] == "success":
            test_ip = results["tests"]["ipv4_resolution"]["ip"]
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            tcp_result = sock.connect_ex((test_ip, port))
            sock.close()
            
            results["tests"]["tcp_connection"] = {
                "status": "success" if tcp_result == 0 else "failed",
                "ip": test_ip,
                "port": port,
                "error_code": tcp_result,
                "description": "Conexión TCP exitosa" if tcp_result == 0 else f"Error TCP: {tcp_result}"
            }
        
        # Test 3: Variables de entorno críticas
        results["environment"] = {
            "DB_HOST": os.environ.get("DB_HOST"),
            "DB_USER": os.environ.get("DB_USER"),
            "DB_PASSWORD_set": bool(os.environ.get("DB_PASSWORD")),
            "DB_PORT": os.environ.get("DB_PORT"),
            "IN_RENDER": bool(os.environ.get("RENDER")),
            "RENDER_EXTERNAL_HOSTNAME": os.environ.get("RENDER_EXTERNAL_HOSTNAME")
        }
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "type": type(e).__name__,
            "message": "Error durante el diagnóstico"
        }), 500

# --- ENDPOINT SIMPLIFICADO DE PRUEBA DE CONEXIÓN ---
@app.route('/test-connection', methods=['GET'])
def test_connection():
    """Prueba simple de conexión forzando IPv4"""
    
    # Obtener credenciales
    host = os.environ.get("DB_HOST", "db.uxzhjsmhbsemuvhragmc.supabase.co")
    dbname = os.environ.get("DB_NAME", "postgres")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "")
    port = int(os.environ.get("DB_PORT", 5432))
    
    # Forzar IPv4
    resolved_ip = get_ipv4_address(host)
    
    try:
        conn = psycopg.connect(
            host=resolved_ip,
            dbname=dbname,
            user=user,
            password=password,
            port=port,
            sslmode="require",
            connect_timeout=5
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test, version() as version")
        result = cursor.fetchone()
        
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "✅ Conexión a Supabase exitosa",
            "connection_details": {
                "original_host": host,
                "resolved_ip": resolved_ip,
                "used_ip_version": "IPv4",
                "database_version": result[1].split(',')[0] if result else "Unknown"
            }
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "type": type(e).__name__,
            "connection_details": {
                "original_host": host,
                "resolved_ip": resolved_ip,
                "attempted_ip_version": "IPv4"
            },
            "suggestion": "Verifica DB_PASSWORD en variables de entorno de Render"
        }), 500

# --- SIMULATE CONNECTION (sin realmente conectar) ---
@app.route('/simulate-connection', methods=['GET'])
def simulate_connection():
    """Simula la cadena de conexión sin conectar realmente"""
    
    host = "db.uxzhjsmhbsemuvhragmc.supabase.co"
    user = "postgres"
    password = os.environ.get("DB_PASSWORD", "[NOT_SET]")
    resolved_ip = get_ipv4_address(host)
    
    # Crear cadena de conexión para mostrar
    conn_string = f"postgresql://{user}:{password[:3]}...@{resolved_ip}:5432/postgres?sslmode=require"
    
    return jsonify({
        "connection_string_sample": conn_string,
        "parameters": {
            "original_host": host,
            "resolved_ip": resolved_ip,
            "user": user,
            "password_length": len(password) if password else 0,
            "port": 5432,
            "database": "postgres",
            "sslmode": "require",
            "ip_version": "IPv4 (forzado)"
        },
        "note": "Esta es solo una simulación para verificar parámetros. IPv4 forzado activado."
    })

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
    
    cursor = db.cursor(row_factory=dict_row)

    try:
        cursor.execute(
            "SELECT id, usuario, nombre, valor, prioridad, fecha "
            "FROM gastos WHERE usuario = %s ORDER BY fecha DESC",
            (usuario,)
        )

        gastos = cursor.fetchall()

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
    
    env_vars = {
        "DB_HOST": os.environ.get("DB_HOST"),
        "DB_USER": os.environ.get("DB_USER"),
        "DB_PASSWORD_set": bool(os.environ.get("DB_PASSWORD")),
        "DATABASE_URL_set": bool(os.environ.get("DATABASE_URL")),
        "IN_RENDER": bool(os.environ.get("RENDER"))
    }
    
    db = conectar_db()
    if not db:
        return jsonify({
            "status": "error", 
            "message": "No se pudo conectar a DB",
            "env_vars": env_vars,
            "suggestion": "Verifica DB_PASSWORD en Render y asegúrate de que la conexión use IPv4"
        }), 500
    
    cursor = db.cursor(row_factory=dict_row)
    try:
        cursor.execute("SELECT version()")
        version_result = cursor.fetchone()
        version = version_result['version'] if version_result else "No version"
        
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row['table_name'] for row in cursor.fetchall()]
        
        usuarios = []
        if 'usuarios' in tables:
            cursor.execute("SELECT nombre_usuario FROM usuarios LIMIT 5")
            usuarios = [row['nombre_usuario'] for row in cursor.fetchall()]
        
        # Obtener IP usada
        host = os.environ.get("DB_HOST", "db.uxzhjsmhbsemuvhragmc.supabase.co")
        resolved_ip = get_ipv4_address(host)
        
        return jsonify({
            "status": "success",
            "database": "Supabase PostgreSQL",
            "version": version.split(',')[0] if ',' in version else version,
            "tables": tables,
            "usuarios_ejemplo": usuarios,
            "connection_info": {
                "original_host": host,
                "resolved_ip": resolved_ip,
                "ip_version": "IPv4 (forzado)"
            },
            "env_vars": env_vars,
            "message": "✅ Conexión exitosa a Supabase usando IPv4"
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
    return jsonify({
        "status": "healthy", 
        "service": "GestionG API",
        "ipv4_forced": True,
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "GestionG API",
        "version": "1.0",
        "features": [
            "IPv4 forzado para evitar problemas de conectividad",
            "Compatible con Render y Supabase",
            "Conexiones optimizadas"
        ],
        "endpoints": [
            "/login", "/logout", "/test-db", "/test-connection",
            "/network-diagnosis", "/simulate-connection",
            "/guardar-gasto", "/obtener-gastos",
            "/guardar-ingreso", "/calcular-saldo",
            "/eliminar-gasto", "/eliminar-historial",
            "/health", "/debug-supabase"
        ]
    }), 200

@app.route('/debug-supabase', methods=['GET'])
def debug_supabase():
    """Endpoint para debug específico de Supabase con IPv4 forzado"""
    
    host = "db.uxzhjsmhbsemuvhragmc.supabase.co"
    port = 5432
    
    try:
        # Obtener IPv4 forzada
        ipv4 = get_ipv4_address(host)
        
        # Test de conexión TCP
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((ipv4, port))
        sock.close()
        
        return jsonify({
            "status": "debug",
            "supabase_host": host,
            "resolved_ipv4": ipv4,
            "port": port,
            "tcp_connection": "reachable" if result == 0 else "unreachable",
            "error_code": result,
            "ip_version": "IPv4 (forzado)",
            "env_vars": {
                "DB_HOST": os.environ.get("DB_HOST"),
                "DB_USER": os.environ.get("DB_USER"),
                "DB_PASSWORD_set": bool(os.environ.get("DB_PASSWORD")),
                "DB_PORT": os.environ.get("DB_PORT", 5432),
                "RENDER": os.environ.get("RENDER")
            },
            "message": "✅ Host resuelve a IPv4 correctamente" if result == 0 else "❌ No se puede conectar via IPv4"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": type(e).__name__,
            "message": str(e)
        }), 500

# SIEMPRE DEBE IR AL FINAL
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"🚀 Iniciando GestionG API en puerto {port}")
    print("🔧 Configuración IPv4 forzada activada para Supabase")
    app.run(host='0.0.0.0', port=port, debug=False)
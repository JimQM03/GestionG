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

# --- CONEXIÓN A SUPABASE CON IP RESUELTA MANUALMENTE ---
def conectar_db():
    try:
        # Obtener credenciales
        db_host = os.environ.get("DB_HOST", "db.uxzhjsmhbsemuvhragmc.supabase.co")
        db_name = os.environ.get("DB_NAME", "postgres")
        db_user = os.environ.get("DB_USER", "postgres")
        db_pass = os.environ.get("DB_PASSWORD")
        db_port = int(os.environ.get("DB_PORT", 5432))
        
        print(f"🔧 Conectando a Supabase: {db_user}@{db_host}:{db_port}")
        
        # RESOLVER HOSTNAME A IPV4 MANUALMENTE
        try:
            # Forzar resolución IPv4
            ip_info = socket.getaddrinfo(
                db_host, db_port,
                socket.AF_INET,  # Solo IPv4
                socket.SOCK_STREAM
            )
            ipv4_address = ip_info[0][4][0]  # Obtener la primera IP IPv4
            print(f"   Resuelto a IPv4: {ipv4_address}")
            
            # Usar IP directamente
            actual_host = ipv4_address
        except Exception as resolve_error:
            print(f"   ❌ No se pudo resolver IPv4: {resolve_error}")
            actual_host = db_host
        
        # CONEXIÓN CON TIMEOUT Y PARÁMETROS ESPECÍFICOS
        conn = psycopg.connect(
            host=actual_host,
            dbname=db_name,
            user=db_user,
            password=db_pass,
            port=db_port,
            sslmode="require",  # Requerido para Supabase
            connect_timeout=10,  # Timeout de conexión
            # Opciones para evitar problemas de red
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=3,
            # Forzar reconexión en caso de error
            options="-c statement_timeout=30000"
        )
        
        print("✅ Conexión exitosa a Supabase")
        return conn
        
    except Exception as e:
        print(f"❌ Error DB: {type(e).__name__}: {e}")
        
        # DEBUG: Imprimir información de red
        try:
            print("🔍 Información de red:")
            print(f"   Hostname: {db_host}")
            print(f"   Intentando resolver...")
            
            # Intentar todas las direcciones IP
            all_ips = socket.getaddrinfo(db_host, db_port)
            print(f"   Todas las IPs encontradas: {all_ips}")
            
        except Exception as net_error:
            print(f"   Error en diagnóstico de red: {net_error}")
        
        return None

# --- ENDPOINT DE DIAGNÓSTICO MEJORADO ---
@app.route('/network-diagnosis', methods=['GET'])
def network_diagnosis():
    """Diagnóstico completo de red para Supabase"""
    host = "db.uxzhjsmhbsemuvhragmc.supabase.co"
    port = 5432
    
    results = {
        "target": f"{host}:{port}",
        "tests": {}
    }
    
    try:
        # Test 1: Resolución DNS IPv4
        try:
            ipv4_list = []
            for info in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
                ipv4_list.append(info[4][0])
            
            results["tests"]["dns_ipv4"] = {
                "status": "success",
                "ips": list(set(ipv4_list)),  # Eliminar duplicados
                "count": len(set(ipv4_list))
            }
        except Exception as dns_error:
            results["tests"]["dns_ipv4"] = {
                "status": "error",
                "error": str(dns_error)
            }
        
        # Test 2: Resolución DNS IPv6 (para comparar)
        try:
            ipv6_list = []
            for info in socket.getaddrinfo(host, port, socket.AF_INET6, socket.SOCK_STREAM):
                ipv6_list.append(info[4][0])
            
            results["tests"]["dns_ipv6"] = {
                "status": "success",
                "ips": list(set(ipv6_list)),
                "count": len(set(ipv6_list))
            }
        except Exception as ipv6_error:
            results["tests"]["dns_ipv6"] = {
                "status": "error",
                "error": str(ipv6_error)
            }
        
        # Test 3: Conexión TCP a primera IP IPv4
        if results["tests"]["dns_ipv4"]["status"] == "success" and results["tests"]["dns_ipv4"]["ips"]:
            test_ip = results["tests"]["dns_ipv4"]["ips"][0]
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            tcp_result = sock.connect_ex((test_ip, port))
            sock.close()
            
            results["tests"]["tcp_connection"] = {
                "status": "success" if tcp_result == 0 else "failed",
                "ip": test_ip,
                "port": port,
                "error_code": tcp_result,
                "description": "Connection successful" if tcp_result == 0 else "Connection failed"
            }
        
        # Test 4: Variables de entorno
        results["environment"] = {
            "DB_HOST": os.environ.get("DB_HOST"),
            "DB_USER": os.environ.get("DB_USER"),
            "DB_PASSWORD_set": bool(os.environ.get("DB_PASSWORD")),
            "DB_PORT": os.environ.get("DB_PORT")
        }
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({
            "error": str(e),
            "type": type(e).__name__,
            "message": "Error durante el diagnóstico"
        }), 500

# --- SIMULATE CONNECTION (sin realmente conectar) ---
@app.route('/simulate-connection', methods=['GET'])
def simulate_connection():
    """Simula la cadena de conexión sin conectar realmente"""
    import urllib.parse
    
    host = "db.uxzhjsmhbsemuvhragmc.supabase.co"
    user = "postgres"
    password = os.environ.get("DB_PASSWORD", "[NOT_SET]")
    
    # Crear cadena de conexión para mostrar
    conn_string = f"postgresql://{user}:{password[:3]}...@{host}:5432/postgres?sslmode=require"
    
    return jsonify({
        "connection_string_sample": conn_string,
        "parameters": {
            "host": host,
            "user": user,
            "password_length": len(password) if password else 0,
            "port": 5432,
            "database": "postgres",
            "sslmode": "require"
        },
        "note": "Esta es solo una simulación para verificar parámetros"
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
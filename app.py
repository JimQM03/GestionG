import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cri-2026-jim")

CORS(app, supports_credentials=True)

print("=" * 60)
print("🚀 GestionG API con Neon PostgreSQL")
print("=" * 60)

# Mostrar configuración
print("🔧 Configuración de Neon:")
print(f"   Host: {os.environ.get('DB_HOST', 'No configurado')}")
print(f"   User: {os.environ.get('DB_USER', 'No configurado')}")
print(f"   DB: {os.environ.get('DB_NAME', 'No configurado')}")
print(f"   Password: {'*' * len(os.environ.get('DB_PASSWORD', '')) if os.environ.get('DB_PASSWORD') else 'No configurado'}")
print("=" * 60)

# --- CONEXIÓN A NEON ---
def conectar_neon():
    """Conexión optimizada para Neon usando variables individuales"""
    try:
        db_host = os.environ.get("DB_HOST")
        db_name = os.environ.get("DB_NAME", "neondb")
        db_user = os.environ.get("DB_USER", "neondb_owner")
        db_pass = os.environ.get("DB_PASSWORD")
        db_port = int(os.environ.get("DB_PORT", 5432))
        
        if not all([db_host, db_user, db_pass]):
            print("❌ Faltan variables de conexión")
            return None
        
        print(f"🔗 Conectando a: {db_user}@{db_host}:{db_port}/{db_name}")
        
        conn = psycopg.connect(
            host=db_host,
            dbname=db_name,
            user=db_user,
            password=db_pass,
            port=db_port,
            sslmode="require",
            connect_timeout=10,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=3
        )
        
        # Test rápido de conexión
        with conn.cursor() as cur:
            cur.execute("SELECT 1 as test")
            result = cur.fetchone()
            if result and result[0] == 1:
                print("✅ Conexión exitosa a Neon")
            else:
                print("⚠️ Conexión establecida pero test falló")
                return None
        
        return conn
        
    except Exception as e:
        print(f"❌ Error conectando a Neon: {type(e).__name__}: {str(e)[:100]}")
        return None

# --- INICIALIZAR TABLAS ---
def inicializar_db():
    """Crear tablas si no existen"""
    print("🔄 Inicializando base de datos...")
    conn = conectar_neon()
    if not conn:
        print("⚠️ No se pudo conectar para inicializar DB")
        return False
    
    try:
        with conn.cursor() as cur:
            # Tabla de gastos
            cur.execute("""
                CREATE TABLE IF NOT EXISTS gastos (
                    id SERIAL PRIMARY KEY,
                    usuario VARCHAR(50) DEFAULT 'german',
                    nombre VARCHAR(200) NOT NULL,
                    valor DECIMAL(10,2) NOT NULL,
                    prioridad VARCHAR(20) DEFAULT 'Media',
                    fecha DATE DEFAULT CURRENT_DATE,
                    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Tabla de ingresos
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ingresos (
                    id SERIAL PRIMARY KEY,
                    usuario VARCHAR(50) DEFAULT 'german',
                    monto DECIMAL(10,2) NOT NULL,
                    clases INTEGER DEFAULT 0,
                    descripcion TEXT,
                    fecha DATE DEFAULT CURRENT_DATE,
                    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            print("✅ Tablas creadas/verificadas en Neon")
            
            # Verificar que las tablas existen
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('gastos', 'ingresos')
            """)
            tablas_existentes = [row[0] for row in cur.fetchall()]
            print(f"   Tablas existentes: {tablas_existentes}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error inicializando DB: {e}")
        return False
    finally:
        conn.close()

# Inicializar al inicio
inicializar_db()

# ================================================
# ENDPOINTS PRINCIPALES
# ================================================

@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    data = request.json
    print(f"📝 Guardando gasto: {data.get('nombre', 'Sin nombre')} - ${data.get('valor', 0)}")
    
    if not data or 'nombre' not in data or 'valor' not in data:
        return jsonify({"error": "Datos incompletos"}), 400
    
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión a Neon"}), 500
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO gastos (usuario, nombre, valor, prioridad, fecha)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                "german",
                data['nombre'],
                float(data['valor']),
                data.get('prioridad', 'Media'),
                data.get('fecha', datetime.now().date())
            ))
            
            id_gasto = cur.fetchone()[0]
            conn.commit()
            
            print(f"✅ Gasto guardado ID: {id_gasto}")
            return jsonify({
                "status": "success",
                "mensaje": "Gasto guardado",
                "id": id_gasto
            })
            
    except Exception as e:
        print(f"❌ Error guardando gasto: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    data = request.json
    print(f"💰 Guardando ingreso: ${data.get('monto', 0)}")
    
    if not data or 'monto' not in data:
        return jsonify({"error": "Datos incompletos"}), 400
    
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión a Neon"}), 500
    
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ingresos (usuario, monto, clases, descripcion)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (
                "german",
                float(data['monto']),
                int(data.get('clases', 0)),
                data.get('descripcion', '')
            ))
            
            id_ingreso = cur.fetchone()[0]
            conn.commit()
            
            print(f"✅ Ingreso guardado ID: {id_ingreso}")
            return jsonify({
                "status": "success",
                "mensaje": "Ingreso guardado",
                "id": id_ingreso
            })
            
    except Exception as e:
        print(f"❌ Error guardando ingreso: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    print("📊 Obteniendo gastos...")
    conn = conectar_neon()
    if not conn:
        return jsonify([])
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nombre, valor, prioridad, fecha
                FROM gastos 
                WHERE usuario = 'german'
                ORDER BY fecha DESC, id DESC
            """)
            
            gastos = cur.fetchall()
            print(f"✅ Obtenidos {len(gastos)} gastos")
            
            resultado = [
                {
                    "id": g['id'],
                    "nombre": g['nombre'],
                    "valor": float(g['valor']),
                    "prioridad": g['prioridad'],
                    "fecha": str(g['fecha'])
                }
                for g in gastos
            ]
            
            return jsonify(resultado)
            
    except Exception as e:
        print(f"❌ Error obteniendo gastos: {e}")
        return jsonify([])
    finally:
        conn.close()

@app.route('/calcular-totales', methods=['GET'])
def calcular_totales():
    print("🧮 Calculando totales...")
    conn = conectar_neon()
    if not conn:
        return jsonify({
            "total_ingresos": 0,
            "total_gastos": 0,
            "saldo": 0
        })
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Total ingresos
            cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM ingresos WHERE usuario = 'german'")
            total_ingresos = cur.fetchone()['total']
            
            # Total gastos
            cur.execute("SELECT COALESCE(SUM(valor), 0) as total FROM gastos WHERE usuario = 'german'")
            total_gastos = cur.fetchone()['total']
            
            saldo = float(total_ingresos) - float(total_gastos)
            
            print(f"✅ Totales: Ingresos=${total_ingresos}, Gastos=${total_gastos}, Saldo=${saldo}")
            
            return jsonify({
                "status": "success",
                "total_ingresos": float(total_ingresos),
                "total_gastos": float(total_gastos),
                "saldo": saldo
            })
            
    except Exception as e:
        print(f"❌ Error calculando totales: {e}")
        return jsonify({
            "status": "error",
            "total_ingresos": 0,
            "total_gastos": 0,
            "saldo": 0
        })
    finally:
        conn.close()

@app.route('/eliminar-gasto/<int:id>', methods=['DELETE'])
def eliminar_gasto(id):
    print(f"🗑️ Eliminando gasto ID: {id}")
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM gastos WHERE id = %s AND usuario = 'german' RETURNING id", (id,))
            resultado = cur.fetchone()
            conn.commit()
            
            if resultado:
                print(f"✅ Gasto {id} eliminado")
                return jsonify({"status": "success", "mensaje": "Gasto eliminado"})
            else:
                print(f"⚠️ Gasto {id} no encontrado")
                return jsonify({"error": "Gasto no encontrado"}), 404
                
    except Exception as e:
        print(f"❌ Error eliminando gasto: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/eliminar-todos-gastos', methods=['DELETE'])
def eliminar_todos_gastos():
    print("🗑️ Eliminando TODOS los gastos...")
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM gastos WHERE usuario = 'german' RETURNING COUNT(*)")
            eliminados = cur.fetchone()[0]
            conn.commit()
            
            print(f"✅ Eliminados {eliminados} gastos")
            return jsonify({
                "status": "success",
                "mensaje": f"Se eliminaron {eliminados} gastos"
            })
                
    except Exception as e:
        print(f"❌ Error eliminando gastos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ================================================
# ENDPOINTS DE DIAGNÓSTICO
# ================================================

@app.route('/test-neon', methods=['GET'])
def test_neon():
    """Prueba completa de conexión a Neon"""
    print("🧪 Ejecutando test de Neon...")
    conn = conectar_neon()
    if not conn:
        return jsonify({
            "status": "error",
            "mensaje": "No se pudo conectar a Neon",
            "variables_configuradas": {
                "DB_HOST": bool(os.environ.get("DB_HOST")),
                "DB_USER": bool(os.environ.get("DB_USER")),
                "DB_NAME": bool(os.environ.get("DB_NAME")),
                "DB_PASSWORD": bool(os.environ.get("DB_PASSWORD")),
                "DB_PORT": os.environ.get("DB_PORT", "5432")
            }
        }), 500
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Versión
            cur.execute("SELECT version()")
            version = cur.fetchone()['version']
            
            # Tablas
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
            tablas = [row['table_name'] for row in cur.fetchall()]
            
            # Conteos
            cur.execute("SELECT COUNT(*) as count FROM gastos WHERE usuario = 'german'")
            count_gastos = cur.fetchone()['count']
            
            cur.execute("SELECT COUNT(*) as count FROM ingresos WHERE usuario = 'german'")
            count_ingresos = cur.fetchone()['count']
            
            print(f"✅ Test Neon exitoso: {len(tablas)} tablas, {count_gastos} gastos, {count_ingresos} ingresos")
            
            return jsonify({
                "status": "success",
                "database": "Neon PostgreSQL",
                "version": version.split(',')[0],
                "tablas": tablas,
                "conteos": {
                    "gastos": count_gastos,
                    "ingresos": count_ingresos
                },
                "usuario": "german",
                "mensaje": "✅ Conexión a Neon exitosa"
            })
            
    except Exception as e:
        print(f"❌ Error en test Neon: {e}")
        return jsonify({
            "status": "error",
            "mensaje": str(e)
        }), 500
    finally:
        conn.close()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "GestionG API",
        "database": "Neon PostgreSQL",
        "usuario": "german",
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "GestionG API con Neon",
        "version": "3.0",
        "usuario": "german",
        "endpoints": [
            "/guardar-gasto (POST)",
            "/guardar-ingreso (POST)", 
            "/obtener-gastos (GET)",
            "/calcular-totales (GET)",
            "/eliminar-gasto/<id> (DELETE)",
            "/eliminar-todos-gastos (DELETE)",
            "/test-neon (GET)",
            "/health (GET)"
        ]
    }), 200

# ================================================
# INICIALIZACIÓN
# ================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print("=" * 60)
    print(f"🚀 Servicio iniciado en puerto {port}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=False)
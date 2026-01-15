import os
import socket
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# CORS - Permitir todo para simplificar
CORS(app, supports_credentials=True)

# --- CONEXIÓN SIMPLIFICADA A SUPABASE ---
def conectar_db():
    """Conexión simplificada solo para datos"""
    try:
        conn = psycopg.connect(
            host=os.environ.get("DB_HOST", "db.uxzhjsmhbsemuvhragmc.supabase.co"),
            dbname=os.environ.get("DB_NAME", "postgres"),
            user=os.environ.get("DB_USER", "postgres"),
            password=os.environ.get("DB_PASSWORD"),
            port=int(os.environ.get("DB_PORT", 5432)),
            sslmode="require",
            connect_timeout=10
        )
        return conn
    except Exception as e:
        print(f"❌ Error de conexión DB: {e}")
        return None

# --- ENDPOINTS PARA DATOS (sin autenticación compleja) ---

@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    """Guarda un gasto en la base de datos"""
    data = request.json
    
    # Validaciones básicas
    if not data or 'nombre' not in data or 'valor' not in data:
        return jsonify({"error": "Datos incompletos"}), 400
    
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión DB"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO gastos (usuario, nombre, valor, prioridad, fecha) VALUES (%s, %s, %s, %s, %s)",
            ("german", data['nombre'], data['valor'], data.get('prioridad', 'Media'), data.get('fecha', datetime.now().date()))
        )
        db.commit()
        return jsonify({"status": "success", "mensaje": "Gasto guardado"})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    """Guarda un ingreso en la base de datos"""
    data = request.json
    
    if not data or 'monto' not in data:
        return jsonify({"error": "Datos incompletos"}), 400
    
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión DB"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO ingresos (usuario, monto, clases, descripcion, fecha) VALUES (%s, %s, %s, %s, %s)",
            ("german", data['monto'], data.get('clases', 0), data.get('descripcion', ''), datetime.now().date())
        )
        db.commit()
        return jsonify({"status": "success", "mensaje": "Ingreso guardado"})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    """Obtiene todos los gastos del usuario"""
    db = conectar_db()
    if not db:
        return jsonify([])
    
    cursor = db.cursor(row_factory=dict_row)
    try:
        cursor.execute(
            "SELECT id, nombre, valor, prioridad, fecha FROM gastos WHERE usuario = 'german' ORDER BY fecha DESC"
        )
        gastos = cursor.fetchall()
        
        # Formatear respuesta
        gastos_json = [
            {
                "id": g['id'],
                "nombre": g['nombre'],
                "valor": float(g['valor']),
                "prioridad": g['prioridad'],
                "fecha": str(g['fecha'])
            }
            for g in gastos
        ]
        
        return jsonify(gastos_json)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify([])
    finally:
        cursor.close()
        db.close()

@app.route('/obtener-ingresos', methods=['GET'])
def obtener_ingresos():
    """Obtiene todos los ingresos del usuario"""
    db = conectar_db()
    if not db:
        return jsonify([])
    
    cursor = db.cursor(row_factory=dict_row)
    try:
        cursor.execute(
            "SELECT monto, clases, descripcion, fecha FROM ingresos WHERE usuario = 'german' ORDER BY fecha DESC"
        )
        ingresos = cursor.fetchall()
        return jsonify(ingresos)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify([])
    finally:
        cursor.close()
        db.close()

@app.route('/calcular-totales', methods=['GET'])
def calcular_totales():
    """Calcula los totales de ingresos y gastos"""
    db = conectar_db()
    if not db:
        return jsonify({
            "total_ingresos": 0,
            "total_gastos": 0,
            "saldo": 0
        })
    
    cursor = db.cursor(row_factory=dict_row)
    try:
        # Total ingresos
        cursor.execute("SELECT SUM(monto) as total FROM ingresos WHERE usuario = 'german'")
        total_ingresos = cursor.fetchone()['total'] or 0
        
        # Total gastos
        cursor.execute("SELECT SUM(valor) as total FROM gastos WHERE usuario = 'german'")
        total_gastos = cursor.fetchone()['total'] or 0
        
        return jsonify({
            "total_ingresos": float(total_ingresos),
            "total_gastos": float(total_gastos),
            "saldo": float(total_ingresos - total_gastos)
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({
            "total_ingresos": 0,
            "total_gastos": 0,
            "saldo": 0
        })
    finally:
        cursor.close()
        db.close()

@app.route('/eliminar-gasto/<int:id>', methods=['DELETE'])
def eliminar_gasto(id):
    """Elimina un gasto específico"""
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM gastos WHERE id = %s AND usuario = 'german'", (id,))
        db.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"status": "success", "mensaje": "Gasto eliminado"})
        else:
            return jsonify({"error": "Gasto no encontrado"}), 404
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/eliminar-todos-gastos', methods=['DELETE'])
def eliminar_todos_gastos():
    """Elimina todos los gastos del usuario"""
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM gastos WHERE usuario = 'german'")
        db.commit()
        return jsonify({"status": "success", "mensaje": "Todos los gastos eliminados"})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# --- ENDPOINTS DE DIAGNÓSTICO ---

@app.route('/test-db', methods=['GET'])
def test_db():
    """Prueba la conexión a la base de datos"""
    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "No se pudo conectar a DB"}), 500
    
    cursor = db.cursor(row_factory=dict_row)
    try:
        cursor.execute("SELECT version()")
        version = cursor.fetchone()['version']
        
        cursor.execute("SELECT COUNT(*) as count FROM gastos WHERE usuario = 'german'")
        count_gastos = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM ingresos WHERE usuario = 'german'")
        count_ingresos = cursor.fetchone()['count']
        
        return jsonify({
            "status": "success",
            "database": "Supabase",
            "version": version.split(',')[0] if ',' in version else version,
            "gastos_registrados": count_gastos,
            "ingresos_registrados": count_ingresos,
            "mensaje": "✅ Conexión exitosa"
        })
    except Exception as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "GestionG API",
        "version": "2.0",
        "usuario": "german"
    }), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "GestionG API - Solo datos",
        "endpoints": [
            "/guardar-gasto (POST)",
            "/guardar-ingreso (POST)",
            "/obtener-gastos (GET)",
            "/obtener-ingresos (GET)",
            "/calcular-totales (GET)",
            "/eliminar-gasto/<id> (DELETE)",
            "/eliminar-todos-gastos (DELETE)",
            "/test-db (GET)",
            "/health (GET)"
        ],
        "note": "Login manejado localmente en el frontend"
    }), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print("🚀 Iniciando API de datos GestionG...")
    print("📊 Endpoints de datos activos")
    print(f"🌐 Escuchando en puerto {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
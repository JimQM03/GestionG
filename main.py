import os
import mysql.connector
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# CORS permite que tu página web (Frontend) hable con este servidor (Backend)
CORS(app)

# CONFIGURACIÓN DE BASE DE DATOS (Credenciales de Railway)
DB_CONFIG = {
    "host": "nozomi.proxy.rlwy.net",
    "user": "root",
    "password": "egddxkxJxQTroZyaHVvEGdZJSAsFFiTS",
    "database": "railway",
    "port": 32514,
    "auth_plugin": "mysql_native_password",
    "connect_timeout": 15
}

@app.route('/')
def home():
    return "<h1>Servidor GestionG Online</h1><p>El puerto 5000 está escuchando correctamente.</p>"

# ================================================================
# ENDPOINTS PARA GASTOS
# ================================================================

# 1. GUARDAR GASTO
@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    db = None
    try:
        datos = request.json
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        # SQL ajustado a tus columnas: tipo, nombre, valor, prioridad, fecha
        sql = """INSERT INTO gastos (tipo, nombre, valor, prioridad, fecha) 
                 VALUES (%s, %s, %s, %s, %s)"""
        
        valores = (
            datos.get('tipo', 'Gasto General'),
            datos.get('nombre'),
            datos.get('valor'),
            datos.get('prioridad', 'Media'),
            datos.get('fecha')
        )
        
        cursor.execute(sql, valores)
        db.commit()
        cursor.close()
        return jsonify({"status": "success", "mensaje": "Gasto guardado en MySQL"}), 200
    
    except Exception as e:
        print(f"Error en guardar gasto: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 2. OBTENER TODOS LOS GASTOS
@app.route('/obtener-gastos', methods=['GET'])
def obtener_gastos():
    db = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)
        
        # Consulta para obtener todos los gastos ordenados por fecha
        sql = "SELECT * FROM gastos ORDER BY fecha DESC"
        cursor.execute(sql)
        gastos = cursor.fetchall()
        
        cursor.close()
        return jsonify(gastos), 200
    
    except Exception as e:
        print(f"Error al obtener gastos: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# ================================================================
# ENDPOINTS PARA INGRESOS
# ================================================================

# 3. GUARDAR INGRESO
@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    db = None
    try:
        datos = request.json
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        # SQL ajustado a tu tabla de ingresos
        # Columnas: tipo, monto, clases, descripcion
        # fecha_registro se genera automáticamente con CURRENT_TIMESTAMP
        sql = """INSERT INTO ingresos (tipo, monto, clases, descripcion) 
                 VALUES (%s, %s, %s, %s)"""
        
        valores = (
            datos.get('tipo', 'Ingreso Quincenal'),
            datos.get('monto'),
            datos.get('clases', 0),
            datos.get('descripcion', '')
        )
        
        cursor.execute(sql, valores)
        db.commit()
        cursor.close()
        return jsonify({"status": "success", "mensaje": "Ingreso guardado en MySQL"}), 200
    
    except Exception as e:
        print(f"Error en guardar ingreso: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 4. OBTENER TODOS LOS INGRESOS
@app.route('/obtener-ingresos', methods=['GET'])
def obtener_ingresos():
    db = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)
        
        # Consulta para obtener todos los ingresos ordenados por fecha de registro
        sql = "SELECT * FROM ingresos ORDER BY fecha_registro DESC"
        cursor.execute(sql)
        ingresos = cursor.fetchall()
        
        cursor.close()
        return jsonify(ingresos), 200
    
    except Exception as e:
        print(f"Error al obtener ingresos: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# ================================================================
# LÓGICA DE NEGOCIO - DÍA 3
# ================================================================

# 5. CALCULAR SALDO TOTAL (Ingresos - Gastos)
@app.route('/calcular-saldo', methods=['GET'])
def calcular_saldo():
    db = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)
        
        # Calcular total de ingresos
        cursor.execute("SELECT SUM(monto) as total_ingresos FROM ingresos")
        resultado_ingresos = cursor.fetchone()
        total_ingresos = float(resultado_ingresos['total_ingresos']) if resultado_ingresos['total_ingresos'] else 0
        
        # Calcular total de gastos
        cursor.execute("SELECT SUM(valor) as total_gastos FROM gastos")
        resultado_gastos = cursor.fetchone()
        total_gastos = float(resultado_gastos['total_gastos']) if resultado_gastos['total_gastos'] else 0
        
        # Calcular saldo (lo que te queda)
        saldo = total_ingresos - total_gastos
        
        cursor.close()
        
        return jsonify({
            "status": "success",
            "total_ingresos": total_ingresos,
            "total_gastos": total_gastos,
            "saldo": saldo
        }), 200
    
    except Exception as e:
        print(f"Error al calcular saldo: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 6. ESTADÍSTICAS DETALLADAS
@app.route('/estadisticas', methods=['GET'])
def estadisticas():
    db = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor(dictionary=True)
        
        # Total de ingresos
        cursor.execute("SELECT SUM(monto) as total, COUNT(*) as cantidad FROM ingresos")
        ingresos_data = cursor.fetchone()
        
        # Total de gastos
        cursor.execute("SELECT SUM(valor) as total, COUNT(*) as cantidad FROM gastos")
        gastos_data = cursor.fetchone()
        
        # Gastos por prioridad
        cursor.execute("""
            SELECT prioridad, SUM(valor) as total 
            FROM gastos 
            GROUP BY prioridad
        """)
        gastos_por_prioridad = cursor.fetchall()
        
        # Últimos 5 movimientos (combinando gastos e ingresos)
        cursor.execute("""
            SELECT 'Ingreso' as tipo, monto as valor, descripcion, fecha_registro as fecha 
            FROM ingresos 
            UNION ALL
            SELECT 'Gasto' as tipo, valor, nombre as descripcion, fecha 
            FROM gastos 
            ORDER BY fecha DESC 
            LIMIT 5
        """)
        ultimos_movimientos = cursor.fetchall()
        
        cursor.close()
        
        total_ingresos = float(ingresos_data['total']) if ingresos_data['total'] else 0
        total_gastos = float(gastos_data['total']) if gastos_data['total'] else 0
        
        return jsonify({
            "status": "success",
            "ingresos": {
                "total": total_ingresos,
                "cantidad": ingresos_data['cantidad']
            },
            "gastos": {
                "total": total_gastos,
                "cantidad": gastos_data['cantidad']
            },
            "saldo": total_ingresos - total_gastos,
            "gastos_por_prioridad": gastos_por_prioridad,
            "ultimos_movimientos": ultimos_movimientos
        }), 200
    
    except Exception as e:
        print(f"Error al obtener estadísticas: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 7. ELIMINAR GASTO
@app.route('/eliminar-gasto/<int:id>', methods=['DELETE'])
def eliminar_gasto(id):
    db = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        sql = "DELETE FROM gastos WHERE id = %s"
        cursor.execute(sql, (id,))
        db.commit()
        cursor.close()
        
        return jsonify({"status": "success", "mensaje": "Gasto eliminado"}), 200
    
    except Exception as e:
        print(f"Error al eliminar gasto: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 8. ELIMINAR INGRESO
@app.route('/eliminar-ingreso/<int:id>', methods=['DELETE'])
def eliminar_ingreso(id):
    db = None
    try:
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        sql = "DELETE FROM ingresos WHERE id = %s"
        cursor.execute(sql, (id,))
        db.commit()
        cursor.close()
        
        return jsonify({"status": "success", "mensaje": "Ingreso eliminado"}), 200
    
    except Exception as e:
        print(f"Error al eliminar ingreso: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# ================================================================
# Esto siempre debe estar en el final
# ================================================================
if __name__ == '__main__':
    # Railway requiere host='0.0.0.0' para ser visible externamente
    app.run(host='0.0.0.0', port=5000, debug=True)
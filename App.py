import os
import mysql.connector
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# CONFIGURACIÓN DE BASE DE DATOS
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
    return "<h1>Servidor GestionG Online</h1><p>El puerto 5000 está escuchando.</p>"

# 1. RUTA PARA GUARDAR GASTOS (Actualizada)
@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    db = None
    try:
        datos = request.json
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        # SQL ajustado a la nueva tabla 'gastos' (incluyendo columna 'fecha')
        sql = """INSERT INTO gastos (tipo, nombre, valor, prioridad, fecha) 
                 VALUES (%s, %s, %s, %s, %s)"""
        valores = (
            datos.get('tipo', 'Gasto General'),
            datos.get('nombre'),
            datos.get('valor'),
            datos.get('prioridad', 'Normal'),
            datos.get('fecha') # Dato que viene del input type="date"
        )
        
        cursor.execute(sql, valores)
        db.commit()
        cursor.close()
        return jsonify({"status": "success", "mensaje": "Gasto guardado"}), 200
    except Exception as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 2. NUEVA RUTA PARA GUARDAR INGRESOS
@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    db = None
    try:
        datos = request.json
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        # SQL para la tabla 'ingresos'
        sql = """INSERT INTO ingresos (tipo, monto, clases, descripcion) 
                 VALUES (%s, %s, %s, %s)"""
        valores = (
            datos.get('tipo', 'Ingreso Quincenal'),
            datos.get('monto'),
            datos.get('clases'),
            datos.get('descripcion')
        )
        
        cursor.execute(sql, valores)
        db.commit()
        cursor.close()
        return jsonify({"status": "success", "mensaje": "Ingreso guardado"}), 200
    except Exception as e:
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
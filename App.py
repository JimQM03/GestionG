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

# 1. RUTA PARA GUARDAR GASTOS
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
            datos.get('prioridad', 'Alta'),
            datos.get('fecha') # Dato vital enviado desde el JS
        )
        
        cursor.execute(sql, valores)
        db.commit()
        cursor.close()
        return jsonify({"status": "success", "mensaje": "Gasto guardado en MySQL"}), 200
    
    except Exception as e:
        print(f"Error en gastos: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 2. RUTA PARA GUARDAR INGRESOS
@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    db = None
    try:
        datos = request.json
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        # SQL ajustado a tus columnas: tipo, monto, clases, descripcion
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
        return jsonify({"status": "success", "mensaje": "Ingreso guardado en MySQL"}), 200
    
    except Exception as e:
        print(f"Error en ingresos: {str(e)}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

if __name__ == '__main__':
    # Railway requiere host='0.0.0.0' para ser visible externamente
    app.run(host='0.0.0.0', port=5000, debug=True)
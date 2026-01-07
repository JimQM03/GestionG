import os
import mysql.connector
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# 1. CARGAR VARIABLES
load_dotenv()

app = Flask(__name__)
# CORS permite que tu Main.html se comunique con este código
CORS(app)

# CONFIGURACIÓN DIRECTA (DATOS NUEVOS DE NOZOMI PROXY)
DB_CONFIG = {
    "host": "nozomi.proxy.rlwy.net",
    "user": "root",
    "password": "egddxkxJxQTroZyaHVvEGdZJSAsFFiTS",
    "database": "railway",
    "port": 32514,
    "auth_plugin": "mysql_native_password",
    "connect_timeout": 15
}

# 2. RUTA DE PRUEBA (Para ver si el servidor está vivo)
@app.route('/')
def home():
    return "<h1>Servidor GestionG Online</h1><p>El puerto 5000 está escuchando.</p>"

# 3. RUTA PARA GUARDAR GASTOS
@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    db = None
    try:
        datos = request.json
        print(f"📩 Recibiendo datos de la web: {datos}")
        
        # Conectamos a la base de datos SOLO cuando recibimos un dato
        db = mysql.connector.connect(**DB_CONFIG)
        cursor = db.cursor()
        
        # Insertar datos en la tabla
        sql = """INSERT INTO gastos (tipo, nombre, valor, descripcion, prioridad) 
                 VALUES (%s, %s, %s, %s, %s)"""
        valores = (
            datos.get('tipo', 'Gasto'),
            datos.get('nombre'),
            datos.get('valor'),
            datos.get('descripcion', ''),
            datos.get('prioridad', 'Normal')
        )
        
        cursor.execute(sql, valores)
        db.commit()
        cursor.close()
        
        print("✅ Gasto guardado con éxito en Railway.")
        return jsonify({"status": "success", "mensaje": "Guardado correctamente"}), 200

    except Exception as e:
        print(f"❌ Error al conectar o guardar: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        if db and db.is_connected():
            db.close()

# 4. ARRANQUE DEL SERVIDOR
if __name__ == '__main__':
    print("-----------------------------------------")
    print("🚀 ARRANCANDO SERVIDOR ANTI-CIERRE...")
    print("Si el terminal no te bota al PS C:\\, el servidor está vivo.")
    print("-----------------------------------------")
    
    # debug=False es clave para que no intente reiniciarse y crashee
    app.run(host='0.0.0.0', port=5000, debug=False)
import os
import mysql.connector
import smtplib
from email.message import EmailMessage
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# 1. CARGAR VARIABLES DE ENTORNO (Tu caja fuerte)
load_dotenv()

app = Flask(__name__)
CORS(app) # Permite que el código del Desarrollador B se conecte aquí

# 2. FUNCIÓN PARA CONECTAR A MYSQL
def conectar():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

# 3. FUNCIÓN PARA ENVIAR CORREOS (Sección IMPORTANTES)
def enviar_alerta_correo(nombre, valor, descripcion):
    msg = EmailMessage()
    msg.set_content(f"⚠️ GASTO IMPORTANTE REGISTRADO\n\nNombre: {nombre}\nValor: ${valor}\nNota: {descripcion}")
    msg['Subject'] = '🚨 Alerta: Gasto de Prioridad Alta'
    msg['From'] = os.getenv("EMAIL_USER")
    msg['To'] = os.getenv("EMAIL_USER") # Te lo envías a ti mismo

    # Conexión segura con los servidores de Google
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(os.getenv("EMAIL_USER"), os.getenv("EMAIL_PASS"))
        smtp.send_message(msg)

# 4. RUTA PARA GUARDAR GASTOS
@app.route('/guardar-gasto', methods=['POST'])
def guardar():
    datos = request.json
    try:
        db = conectar()
        cursor = db.cursor()
        
        # SQL con los campos que agregaste en el Workbench
        sql = """INSERT INTO transacciones 
                 (tipo, nombre, valor, fecha, descripcion, prioridad) 
                 VALUES (%s, %s, %s, NOW(), %s, %s)"""
        
        # Valores que vienen del frontend (Desarrollador B)
        valores = (
            datos.get('tipo'), 
            datos.get('nombre'), 
            datos.get('valor'),
            datos.get('descripcion', ''), 
            datos.get('prioridad', 'Normal')
        )
        
        cursor.execute(sql, valores)
        db.commit() # Guarda los cambios en MySQL
        
        # Si la prioridad es Alta, enviamos el correo automáticamente
        if datos.get('prioridad') == 'Alta':
            enviar_alerta_correo(datos['nombre'], datos['valor'], datos.get('descripcion', ''))
        
        cursor.close()
        db.close()
        return jsonify({"status": "success", "mensaje": "Gasto guardado"}), 200
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500

# 5. RUTA DE PRUEBA (Para verificar el correo ahora mismo)
@app.route('/probar-correo')
def probar_correo():
    try:
        enviar_alerta_correo("Gasto de Prueba", "100.000", "Probando conexión de Desarrollador A")
        return "<h1>📧 ¡Correo enviado con éxito! Revisa jimq293@gmail.com</h1>"
    except Exception as e:
        return f"<h1>❌ Error al enviar: {e}</h1>"
    
@app.route('/')
def inicio():
    return "<h1>✅ Servidor de GestiónG Activo</h1><p>El backend está funcionando correctamente.</p>"

# 6. ARRANCAR EL SERVIDOR (Siempre al final)
if __name__ == '__main__':
    # debug=True sirve para que el servidor se reinicie solo al guardar cambios
    app.run(debug=True, port=5001)


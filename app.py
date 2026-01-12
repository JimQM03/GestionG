import os
import mysql.connector
import jwt
from datetime import datetime; timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps

app = Flask(__name__)
# Configuración de CORS corregida HOLA EZQUISO
app.secret_key = 'JQ_2026_RM'

# En app.py
CORS(app,
     supports_credentials=True,
     origins=["https://jimqm03.github.io",])

# --- CONEXIÓN A DB ---
def conectar_db():
    try:
        return mysql.connector.connect(
            host="nozomi.proxy.rlwy.net",
            user="root",
            password="egddxkxJxQTroZyaHVvEGdZJSAsFFiTS",
            database="railway",
            port=32514,
            connect_timeout=10
        )
    except Exception as e:
        print(f"❌ Error de conexión DB: {e}")
        return None

# --- DECORADOR PARA PROTEGER RUTAS ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            print("❌ No se envió token")
            return jsonify({"error": "Token faltante"}), 401
        
        try:
            # Quitar "Bearer " si existe
            if token.startswith('Bearer '):
                token = token[7:]

                data = jwt.decode(token, app.secret_key, algorithms=["HS256"])
                current_user = data['usuario']
                print(f"✅ Token válido para: {current_user}")
        except jwt.ExpiredSignatureError:
            print("❌ Token expirado")
            return jsonify({"error": "Token expirado"}), 401
        except jwt.InvalidTokenError:
            print("❌ Token inválido")
            return jsonify({"error": "Token invalido"}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# --- LOGIN (genera token) ----
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    u = data.get('usuario')
    p = data.get('password') # Contraseña que escribes en la web

    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "Error de conexion a DB"}), 500
    
    cursor = db.cursor(dictionary=True)
    
    try:
        # Buscamos al usuario
        cursor.execute("SELECT * FROM usuarios WHERE nombre_usuario = %s", (u,))
        user = cursor.fetchone()
        
        # COMPARACIÓN DIRECTA (Sin encriptar)
        if user and user.get('contrasena') == p:
            # Generar token JWT
            token = jwt.encode({
                'usuario': user['nombre_usuario'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.secret_key, algorithm="HS256")

            print(f"✅ Login exitoso para: {user['nombre_usuario']}")
            return jsonify({
                "status": "success", 
                "usuario": user['nombre_usuario'],
                "token": token
            }), 200
        
        print(f"❌ Login fallido para usuario: {u}")
        return jsonify({"status": "error", "mensaje": "Usuario o contraseña incorrectos"}), 401
        
    except Exception as e:
        print(f"❌ Error en login: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()
# --- LOGOUT ---
@app.route('/logout', methods=['POST'])
def logout():
    return jsonify({"status": "success"})

# --- GUARDAR GASTO ---
@app.route('/guardar-gasto', methods=['POST'])
@token_required
def guardar_gasto(current_user):    
    data = request.json
    db = conectar_db()
    if not db:
        return jsonify({"status": "error", "mensaje": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        print(f"💾 Guardando gasto para usuario: {usuario}")
        cursor.execute(
            "INSERT INTO gastos (usuario, nombre, valor, prioridad, fecha) VALUES (%s, %s, %s, %s, %s)",
            (current_user, data['nombre'], data['valor'], data.get('prioridad', 'Media'), data['fecha'])
        )
        db.commit()
        print(f"✅ Gasto guardado: {data['nombre']} - ${data['valor']}")
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"❌ Error al guardar gasto: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# --- OBTENER GASTOS ---
@app.route('/obtener-gastos', methods=['GET'])
@token_required
def obtener_gastos(current_user):
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500
    
    cursor = db.cursor(dictionary=True)
    try:
        print(f"📊 Obteniendo gastos para: {current_user}")
        cursor.execute("SELECT * FROM gastos WHERE usuario = %s ORDER BY fecha DESC", (current_user,))
        gastos = cursor.fetchall()
        print(f"✅ Se encontraron {len(gastos)} gastos")
        return jsonify(gastos)
    except Exception as e:
        print(f"❌ Error al obtener gastos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# --- GUARDAR INGRESO ---
@app.route('/guardar-ingreso', methods=['POST'])
@token_required
def guardar_ingreso(current_user):
    data = request.json
    db = conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor()
    try:
        print(f"💰 Guardando ingreso para: {current_user}")
        cursor.execute(
            "INSERT INTO ingresos (usuario, monto, clases, descripcion, fecha) VALUES (%s, %s, %s, %s, %s)",
            (current_user, data['monto'], data.get('clases', 0), data.get('descripcion', ''), datetime.now().date())
        )
        db.commit()
        print(f"✅ Ingreso guardado: ${data['monto']}")
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"❌ Error al guardar ingreso: {e}")
        return jsonify({"status": "error"}), 500
    finally:
        cursor.close()
        db.close()

# --- CÁLCULO DE SALDO ---
@app.route('/calcular-saldo', methods=['GET'])
@token_required
def calcular_saldo(current_user):
    db = conectar_db()
    if not db:
        return jsonify({"error": "Error de conexión"}), 500

    cursor = db.cursor(dictionary=True)
    try:
        print(f"🧮 Calculando saldo para: {usuario}")

        # Suma de ingresos
        cursor.execute("SELECT SUM(monto) as total FROM ingresos WHERE usuario = %s", (current_user,))
        res_i = cursor.fetchone() 
        total_ingresos = float(res_i['total']) if res_i and res_i['total'] else 0.0
        print(f"  📈 Total ingresos: ${total_ingresos}")

        # Suma de gastos
        cursor.execute("SELECT SUM(valor) as total FROM gastos WHERE usuario = %s", (current_user,))
        res_g = cursor.fetchone()
        total_gastos = float(res_g['total']) if res_g and res_g['total'] else 0.0
        print(f"  📉 Total gastos: ${total_gastos}")

        saldo = total_ingresos - total_gastos
        print(f"  💵 Saldo final: ${saldo}")

        return jsonify({
            "status": "success",
            "saldo": float(saldo),
            "total_ingresos": float(total_ingresos),
            "total_gastos": float(total_gastos)
        })
    except Exception as e:
        print(f"❌ Error en calcular saldo: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# --- ELIMINAR GASTO ---
@app.route('/eliminar-gasto/<int:id>', methods=['DELETE'])
@token_required
def eliminar_gasto(current_user, id):    
    db = conectar_db()
    if not db:
        return jsonify({"status": "error"}), 500
    
    cursor = db.cursor()
    try:
        print(f"🗑️ Eliminando gasto ID:{id} para usuario: {current_user}")
        cursor.execute("DELETE FROM gastos WHERE id = %s AND usuario = %s", (id, current_user))
        db.commit()
        print(f"✅ Gasto eliminado")
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"❌ Error al eliminar: {e}")
        return jsonify({"status": "error"}), 500
    finally:
        cursor.close()
        db.close()
    
# --- ELIMINAR EL HISTORIAL ---
@app.route('/eliminar-historial', methods=['DELETE'])
@token_required
def eliminar_historial(current_user): 
    db = conectar_db()
    if not db: 
        return jsonify({"status": "error", "mensaje": "Error de conexión"}), 500
    
    cursor = db.cursor()
    try:
        print(f"🗑️ Eliminando TODO el historial de: {current_user}")
        # Eliminamos solo los gastos que pertenecen al usuario logueado
        cursor.execute("DELETE FROM gastos WHERE usuario = %s", (current_user,))
        db.commit()
        print(f"✅ Historial borrado completamente")
        return jsonify({"status": "success", "mensaje": "Historial borrado en DB"})
    except Exception as e:
        print(f"❌ Error al borrar historial: {e}")
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# --- RUTA RAÍZ (PARA VERIFICAR QUE EL SERVIDOR ESTÁ VIVO) ---
@app.route('/')
def index():
    return "<h1>✅ Servidor GestionG funcionando</h1><p>Backend con JWT activo</p>"

# SIEMPRE DEBE IR AL FINAL
if __name__ == "__main__":
    print("🚀 Iniciando servidor GestionG con autenticación JWT....")
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
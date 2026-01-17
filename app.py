import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import threading
import time

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "cri-2026-jim")
CORS(app, supports_credentials=True)

# Configuración de email  
EMAIL_USER = os.environ.get("EMAIL_USER", "gestiong2026@gmail.com")
EMAIL_PASS = os.environ.get("EMAIL_PASS", "fkafcgrkokwbyden")  
DESTINATARIO_FIJO = "jimq293@gmail.com"

print("=" * 60)
print("🚀 GestionG API con notificaciones por email")
print(f"📧 Remitente configurado: {EMAIL_USER}")
print(f"📧 Destinatario fijo: {DESTINATARIO_FIJO}")
print("=" * 60)

# --- CONEXIÓN A NEON ---
def conectar_neon():

    """Conexión optimizada para Neon"""
    try:
        db_host = os.environ.get("DB_HOST")
        db_name = os.environ.get("DB_NAME", "neondb")
        db_user = os.environ.get("DB_USER", "neondb_owner")
        db_pass = os.environ.get("DB_PASSWORD")
        db_port = int(os.environ.get("DB_PORT", 5432))
        
        if not all([db_host, db_user, db_pass]):
            print("❌ Faltan variables de conexión a Neon")
            return None
        
        conn = psycopg.connect(
            host=db_host,
            dbname=db_name,
            user=db_user,
            password=db_pass,
            port=db_port,
            sslmode="require",
            connect_timeout=10,
            autocommit = True
        )
        
        print("✅ Conexión a Neon establecida")
        return conn
        
    except Exception as e:
        print(f"❌ Error conectando a Neon: {e}")
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
            
            return True
            
    except Exception as e:
        print(f"❌ Error inicializando DB: {e}")
        return False
    finally:
        conn.close()

# Inicializar al inicio
inicializar_db()

# --- FUNCIONES DE EMAIL ---
def enviar_email(asunto, mensaje, destinatario=None):
    """Envía un email usando Gmail"""
    if not EMAIL_USER or not EMAIL_PASS:
        print("⚠️ Email no configurado, saltando envío")
        return False
    
    # Usar destinatario fijo si no se especifica
    if not destinatario:
        destinatario = DESTINATARIO_FIJO
    
    try:
        # Configurar el mensaje
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = destinatario
        msg['Subject'] = asunto
        
        # Cuerpo del mensaje
        msg.attach(MIMEText(mensaje, 'plain', 'utf-8'))
        
        # Conectar a Gmail
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.send_message(msg)
        
        print(f"✅ Email enviado de {EMAIL_USER} a {destinatario}: {asunto}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ Error de autenticación SMTP: Credenciales incorrectas")
        return False
    except smtplib.SMTPException as e:
        print(f"❌ Error SMTP: {e}")
        return False
    except Exception as e:
        print(f"❌ Error enviando email: {e}")
        return False

def verificar_gastos_proximos_a_vencer():
    """Verifica gastos que vencen en las próximas 24 horas"""
    if not EMAIL_USER or not EMAIL_PASS:
        print("⚠️ Email no configurado, saltando verificación")
        return
    
    conn = conectar_neon()
    if not conn:
        print("⚠️ No se pudo conectar a Neon para verificar gastos")
        return
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Gastos que vencen en las próximas 24 horas
            fecha_manana = (datetime.now() + timedelta(days=1)).date()
            
            cur.execute("""
                SELECT nombre, valor, fecha, prioridad
                FROM gastos 
                WHERE usuario = 'german'
                AND fecha <= %s
                AND fecha >= CURRENT_DATE
                ORDER BY fecha ASC
            """, (fecha_manana,))
            
            gastos_proximos = cur.fetchall()
            
            if gastos_proximos:
                # Preparar mensaje
                mensaje = "⏰ RECORDATORIO: Gastos próximos a vencer\n\n"
                mensaje += "=" * 50 + "\n"
                
                for gasto in gastos_proximos:
                    dias_restantes = (gasto['fecha'] - datetime.now().date()).days
                    mensaje += f"📅 {gasto['nombre']}\n"
                    mensaje += f"   💰 Valor: ${float(gasto['valor']):,.0f}\n"
                    mensaje += f"   📅 Vence: {gasto['fecha']} ({dias_restantes} días)\n"
                    mensaje += f"   ⚠️ Prioridad: {gasto['prioridad']}\n"
                    mensaje += "-" * 50 + "\n"
                
                mensaje += "\n💰 **No olvides prepararte para estos pagos!**\n"
                mensaje += "GestionG - Tu asistente financiero"
                
                # Enviar email
                if enviar_email(
                    asunto="🔔 Recordatorio: Gastos próximos a vencer",
                    mensaje=mensaje,
                    destinatario=DESTINATARIO_FIJO
                ):
                    print(f"✅ Recordatorio enviado para {len(gastos_proximos)} gastos")
                else:
                    print("⚠️ No se pudo enviar el recordatorio por email")
            else:
                print("ℹ️ No hay gastos próximos a vencer (próximas 24 horas)")
                
    except Exception as e:
        print(f"❌ Error verificando gastos próximos: {e}")
    finally:
        conn.close()

# --- TAREA PROGRAMADA ---
def tarea_programada():
    """Ejecuta verificaciones periódicas"""
    print("⏰ Iniciando tarea programada de notificaciones...")
    
    # Esperar 10 segundos para que la aplicación se inicie completamente
    time.sleep(10)
    
    while True:
        try:
            print(f"⏰ Ejecutando verificación de gastos - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            verificar_gastos_proximos_a_vencer()
        except Exception as e:
            print(f"❌ Error en tarea programada: {e}")
        
        # Esperar 1 hora para pruebas, luego cambiar a 24 horas
        print("⏰ Esperando 1 hora para siguiente verificación...")
        time.sleep(60 * 60)  # 1 hora

# Iniciar tarea programada en un hilo separado
if EMAIL_USER and EMAIL_PASS:
    email_thread = threading.Thread(target=tarea_programada, daemon=True)
    email_thread.start()
    print("📧 Sistema de notificaciones ACTIVADO")
    print(f"📧 Email configurado: {EMAIL_USER}")
else:
    print("⚠️ Sistema de notificaciones DESACTIVADO (faltan credenciales)")

# ================================================
# ENDPOINTS
# ================================================

@app.route('/keep-alive', methods=['GET'])
def keep_alive():
    return jsonify({
        "status": "alive",
        "service": "GestionG",
        "timestamp": datetime.now().isoformat(),
        "email_configured": bool(EMAIL_USER and EMAIL_PASS)
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "GestionG API",
        "database": "Neon PostgreSQL",
        "email_configured": bool(EMAIL_USER and EMAIL_PASS),
        "email_from": EMAIL_USER if EMAIL_USER else "No configurado",
        "email_to": DESTINATARIO_FIJO,
        "timestamp": datetime.now().isoformat()
    }), 200

@app.route('/test-neon', methods=['GET'])
def test_neon():
    """Prueba completa de conexión a Neon"""
    conn = conectar_neon()
    if not conn:
        return jsonify({
            "status": "error",
            "mensaje": "No se pudo conectar a Neon"
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
        return jsonify({"status": "error", "mensaje": str(e)}), 500
    finally:
        conn.close()

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "GestionG API con Neon",
        "version": "3.0",
        "usuario": "german",
        "notificaciones": {
            "activo": bool(EMAIL_USER and EMAIL_PASS),
            "desde": EMAIL_USER,
            "hacia": DESTINATARIO_FIJO
        },
        "endpoints": [
            "/guardar-gasto (POST)",
            "/guardar-ingreso (POST)", 
            "/obtener-gastos (GET)",
            "/obtener-ingresos (GET)",
            "/calcular-totales (GET)",
            "/eliminar-gasto/<id> (DELETE)",
            "/eliminar-todos-gastos (DELETE)",
            "/test-neon (GET)",
            "/health (GET)",
            "/keep-alive (GET)",
            "/enviar-recordatorio (POST)",
            "/enviar-email-test (GET)"
        ]
    }), 200

# ================================================
# ENDPOINTS DE GESTIÓN
# ================================================

@app.route('/guardar-gasto', methods=['POST'])
def guardar_gasto():
    data = request.json
    
    if not data or 'nombre' not in data or 'valor' not in data:
        return jsonify({"error": "Datos incompletos"}), 400
    
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión a Neon"}), 500
    
    try:
        hoy = datetime.now().date()
        fecha_obj = hoy # Valor por defecto

        # Primero procesamos la fecha
        fecha_gasto = data.get('fecha')
        try:
            fecha_obj = datetime.strptime(fecha_gasto, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            fecha_obj = hoy

        with conn:
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
                    fecha_obj
                ))
            
                id_gasto = cur.fetchone()[0]
            
        # Si es un gasto futuro y email configurado, enviar confirmación
        if fecha_obj > hoy and EMAIL_USER and EMAIL_PASS:
            enviar_email(
                asunto="📅 Gasto programado registrado",
                mensaje=f"✅ Has registrado un gasto programado:\n\n"
                      f"📋 Nombre: {data['nombre']}\n"
                      f"💰 Valor: ${float(data['valor']):,.0f}\n"
                      f"📅 Fecha de vencimiento: {fecha_obj}\n"
                      f"⚠️ Prioridad: {data.get('prioridad', 'Media')}\n\n"
                      f"📌 Recibirás un recordatorio 24 horas antes.\n\n"
                      f"GestionG - Tu asistente financiero",
                destinatario=DESTINATARIO_FIJO
            )
            print(f"✅ Confirmación de gasto futuro enviada (ID: {id_gasto})")
            
        return jsonify({
            "status": "success",
            "mensaje": "Gasto guardado",
            "id": id_gasto,
            "fecha": str(fecha_obj)
        })
            
    except Exception as e:
        print(f"❌ Error guardando gasto: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/guardar-ingreso', methods=['POST'])
def guardar_ingreso():
    data = request.json
    
    if not data or 'monto' not in data:
        return jsonify({"error": "Datos incompletos"}), 400
    
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión a Neon"}), 500
    
    try:
        with conn:
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
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión", "gastos": []})
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, nombre, valor, prioridad, fecha, creado_en
                FROM gastos 
                WHERE usuario = 'german'
                ORDER BY fecha DESC, id DESC
            """)
            
            gastos = cur.fetchall()
            
            resultado = [
                {
                    "id": g['id'],
                    "nombre": g['nombre'],
                    "valor": float(g['valor']),
                    "prioridad": g['prioridad'],
                    "fecha": str(g['fecha']),
                    "creado_en": g['creado_en'].isoformat() if g['creado_en'] else None
                }
                for g in gastos
            ]
            
            return jsonify({
                "status": "success",
                "count": len(resultado),
                "gastos": resultado
            })
            
    except Exception as e:
        print(f"❌ Error obteniendo gastos: {e}")
        return jsonify({"error": str(e), "gastos": []})
    finally:
        conn.close()

@app.route('/obtener-ingresos', methods=['GET'])
def obtener_ingresos():
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión", "ingresos": []})
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT id, monto, clases, descripcion, fecha, creado_en
                FROM ingresos 
                WHERE usuario = 'german'
                ORDER BY fecha DESC, id DESC
            """)
            
            ingresos = cur.fetchall()
            
            resultado = [
                {
                    "id": i['id'],
                    "monto": float(i['monto']),
                    "clases": i['clases'],
                    "descripcion": i['descripcion'],
                    "fecha": str(i['fecha']),
                    "creado_en": i['creado_en'].isoformat() if i['creado_en'] else None
                }
                for i in ingresos
            ]
            
            return jsonify({
                "status": "success",
                "count": len(resultado),
                "ingresos": resultado
            })
            
    except Exception as e:
        print(f"❌ Error obteniendo ingresos: {e}")
        return jsonify({"error": str(e), "ingresos": []})
    finally:
        conn.close()

@app.route('/calcular-totales', methods=['GET'])
def calcular_totales():
    conn = conectar_neon()
    if not conn:
        return jsonify({
            "status": "error",
            "total_ingresos": 0,
            "total_gastos": 0,
            "saldo": 0
        })
    
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            # Total ingresos
            cur.execute("SELECT COALESCE(SUM(monto), 0) as total FROM ingresos WHERE usuario = 'german'")
            total_ingresos = float(cur.fetchone()['total'])
            
            # Total gastos
            cur.execute("SELECT COALESCE(SUM(valor), 0) as total FROM gastos WHERE usuario = 'german'")
            total_gastos = float(cur.fetchone()['total'])
            
            saldo = total_ingresos - total_gastos
            
            return jsonify({
                "status": "success",
                "total_ingresos": total_ingresos,
                "total_gastos": total_gastos,
                "saldo": saldo,
                "resumen": {
                    "ingresos": f"${total_ingresos:,.0f}",
                    "gastos": f"${total_gastos:,.0f}",
                    "saldo": f"${saldo:,.0f}"
                }
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
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    
    try:
        with conn.cursor() as cur:
            # Primero obtener información del gasto para notificar
            cur.execute("SELECT nombre, valor FROM gastos WHERE id = %s AND usuario = 'german'", (id,))
            gasto = cur.fetchone()
            
            if not gasto:
                return jsonify({"error": "Gasto no encontrado"}), 404
            
            # Eliminar el gasto
            cur.execute("DELETE FROM gastos WHERE id = %s AND usuario = 'german'", (id,))
            conn.commit()
            
            return jsonify({
                "status": "success", 
                "mensaje": f"Gasto '{gasto[0]}' (${float(gasto[1]):,.0f}) eliminado"
            })
                
    except Exception as e:
        print(f"❌ Error eliminando gasto: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/eliminar-todos-gastos', methods=['DELETE'])
def eliminar_todos_gastos():
    conn = conectar_neon()
    if not conn:
        return jsonify({"error": "Error de conexión"}), 500
    
    try:
        with conn.cursor() as cur:
            # Contar antes de eliminar
            cur.execute("SELECT COUNT(*) as count FROM gastos WHERE usuario = 'german'")
            count_before = cur.fetchone()[0]
            
            # Eliminar todos
            cur.execute("DELETE FROM gastos WHERE usuario = 'german'")
            conn.commit()
            
            return jsonify({
                "status": "success",
                "mensaje": f"Se eliminaron {count_before} gastos",
                "eliminados": count_before
            })
                
    except Exception as e:
        print(f"❌ Error eliminando gastos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# ================================================
# ENDPOINTS DE NOTIFICACIONES
# ================================================

@app.route('/enviar-recordatorio', methods=['POST'])
def enviar_recordatorio():
    """Endpoint para enviar recordatorio manualmente"""
    try:
        print("🔄 Ejecutando verificación manual de gastos próximos...")
        verificar_gastos_proximos_a_vencer()
        return jsonify({
            "status": "success",
            "mensaje": "Verificación de recordatorios ejecutada",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "mensaje": str(e)
        }), 500

@app.route('/enviar-email-test', methods=['GET'])
def enviar_email_test():
    """Endpoint para probar el envío de emails"""
    if not EMAIL_USER or not EMAIL_PASS:
        return jsonify({
            "status": "error", 
            "mensaje": "Email no configurado. Agrega EMAIL_USER y EMAIL_PASS en Render."
        }), 400
    
    try:
        test_message = """¡Hola! Este es un email de prueba de tu sistema GestionG.

📋 Detalles de la configuración:
• Remitente: {from_email}
• Destinatario: {to_email}
• Servidor SMTP: smtp.gmail.com:465
• Hora del envío: {timestamp}

✅ Si recibes esto, las notificaciones están configuradas correctamente.

Saludos,
Tu asistente GestionG""".format(
            from_email=EMAIL_USER,
            to_email=DESTINATARIO_FIJO,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        
        resultado = enviar_email(
            asunto="✅ Test de GestionG Notificaciones",
            mensaje=test_message,
            destinatario=DESTINATARIO_FIJO
        )
        
        if resultado:
            return jsonify({
                "status": "success",
                "mensaje": "Email de prueba enviado correctamente",
                "detalles": {
                    "from": EMAIL_USER,
                    "to": DESTINATARIO_FIJO,
                    "timestamp": datetime.now().isoformat()
                }
            })
        else:
            return jsonify({
                "status": "error", 
                "mensaje": "Error enviando email. Revisa las credenciales y logs."
            }), 500
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "mensaje": f"Excepción al enviar email: {str(e)}"
        }), 500

# ================================================
# PUNTO DE ENTRADA
# ================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print("=" * 60)
    print(f"🚀 Servicio GestionG iniciado en puerto {port}")
    print(f"📧 Notificaciones: {'ACTIVADO' if EMAIL_USER and EMAIL_PASS else 'DESACTIVADO'}")
    print(f"📧 Remitente: {EMAIL_USER or 'No configurado'}")
    print(f"📧 Destino: {DESTINATARIO_FIJO}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=False)

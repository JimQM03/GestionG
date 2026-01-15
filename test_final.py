import requests
import time

BASE_URL = "https://gestiong-backend.onrender.com"

print("🎯 PRUEBA DEL BACKEND - GestionG")
print("="*50)

# Lista de pruebas
tests = [
    ("GET", "/", None, "Home"),
    ("GET", "/health", None, "Health Check"),
    ("GET", "/test-db", None, "Database Connection"),
    ("POST", "/login", {"usuario": "test", "password": "123456"}, "Login test"),
]

print("\n🔄 Iniciando pruebas...")
time.sleep(2)  # Pequeña pausa

for method, endpoint, data, desc in tests:
    print(f"\n{'='*40}")
    print(f"🔍 {desc}")
    print(f"📡 {method} {endpoint}")
    
    url = BASE_URL + endpoint
    
    try:
        start = time.time()
        
        if method == "POST":
            response = requests.post(url, json=data, timeout=30)
        else:
            response = requests.get(url, timeout=30)
            
        elapsed = time.time() - start
        
        if response.status_code == 200:
            print(f"✅ Status: {response.status_code}")
            print(f"⏱️  Tiempo: {elapsed:.2f} segundos")
            
            # Mostrar respuesta formateada
            try:
                json_response = response.json()
                print(f"📄 Respuesta: {json_response}")
            except:
                print(f"📄 Respuesta (texto): {response.text[:100]}...")
                
        else:
            print(f"⚠️  Status: {response.status_code}")
            print(f"📄 Error: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT (30 segundos) - Servidor lento o suspendido")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)[:100]}")

print("\n" + "="*50)
print("🎯 Pruebas completadas")
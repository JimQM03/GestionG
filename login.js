// ================================================
// LOGIN.JS - Manejo de autenticación (VERSIÓN CORREGIDA)
// ================================================

const API_URL = "https://gestiong-backend.onrender.com";

console.log('🔄 Script login.js cargado - Versión corregida');

// Función principal de login
function inicializarLogin() {
    console.log('🔄 Inicializando login...');
    
    const loginForm = document.getElementById('formLogin');
    const inputUsuario = document.getElementById('usuario');
    const inputPassword = document.getElementById('password');

    console.log('Form:', loginForm);
    console.log('Usuario input:', inputUsuario);
    console.log('Password input:', inputPassword);

    // Verificamos que los elementos existan
    if (!loginForm) {
        console.error('❌ No se encontró el formulario con id="formLogin"');
        return;
    }
    
    if (!inputUsuario) {
        console.error('❌ No se encontró el input con id="usuario"');
        return;
    }
    
    if (!inputPassword) {
        console.error('❌ No se encontró el input con id="password"');
        return;
    }

    console.log('✅ Todos los elementos encontrados correctamente');

    // Manejador del formulario
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = inputUsuario.value.trim();
        const password = inputPassword.value.trim();

        if (!usuario || !password) {
            alert('⚠️ Por favor completa todos los campos');
            return;
        }

        console.log('🔄 Intentando login con usuario:', usuario);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ usuario, password }),
                credentials: 'include'
            });

            // Verificar si la respuesta es exitosa
            if (!response.ok) {
                if (response.status === 500) {
                    // Error del servidor - probablemente problema de DB
                    alert('❌ Error del servidor. Verifica la conexión a la base de datos.');
                    console.error('Error 500 del servidor');
                    return;
                }
                
                const errorText = await response.text();
                console.error(`Error ${response.status}:`, errorText);
                throw new Error(`Error ${response.status}`);
            }

            // Intentar parsear la respuesta como JSON
            const data = await response.json();
            console.log('Respuesta del servidor:', data);

            if (data.status === 'success') {
                console.log('✅ Login exitoso');
                localStorage.setItem('usuario_logueado', usuario);
                // Añadir un pequeño delay para asegurar que la sesión se establece
                setTimeout(() => {
                    window.location.href = 'Main.html';
                }, 100);
            } else {
                alert("❌ Error: " + (data.mensaje || "Usuario o contraseña incorrectos"));
            }
        } catch (error) {
            console.error("❌ Error en el login:", error);
            
            // Mensajes de error más específicos
            if (error.message.includes('Failed to fetch')) {
                alert("❌ No se pudo conectar con el servidor. Verifica tu conexión a internet.");
            } else if (error.message.includes('500')) {
                alert("❌ Error interno del servidor. Revisa los logs de Render.");
            } else {
                alert("❌ Error: " + error.message);
            }
        }
    });
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarLogin);
} else {
    inicializarLogin();
}

// Función para probar la conexión (opcional)
async function testConexion() {
    try {
        console.log('🔍 Probando conexión con el servidor...');
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Servidor disponible:', data);
            return true;
        } else {
            console.warn('⚠️ Servidor respondió con error:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ No se pudo conectar al servidor:', error);
        return false;
    }
}

// Ejecutar test de conexión al cargar la página
setTimeout(() => {
    testConexion();
}, 1000);
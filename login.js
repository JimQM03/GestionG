// ================================================
// LOGIN.JS - Manejo de autenticación
// ================================================


const API_URL = "https://web-production-99037.up.railway.app";

console.log('🔄 Script login.js cargado');

// Función principal de login
function inicializarLogin() {
    console.log('🔄 Inicializando login...');
    
    const loginForm = document.getElementById('formLogin');
    const inputUsuario = document.getElementById('usuario');
    const inputPassword = document.getElementById('password');

    // Verificamos que los elementos existan
    if (!loginForm || !inputUsuario || !inputPassword) {
        console.error('❌ Error: No se encontraron los elementos del formulario');
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                console.log('✅ Login exitoso');
                // Guardar token y usuario
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario_logueado', usuario);
                window.location.href = 'Main.html';
            } else {
                alert("❌ Error: " + (data.mensaje || "Usuario o clave incorrectos"));
            }
        } catch (error) {
            console.error("❌ Error en el login:", error);
            alert("❌ No se pudo conectar con el servidor.");
        }
    });
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarLogin);
} else {
    // El DOM ya está listo
    inicializarLogin();
}

// ================================================
// LOGIN.JS - LOGIN LOCAL 100% INDEPENDIENTE
// ================================================

// Credenciales fijas en el código
const USUARIO_VALIDO = "german";
const CONTRASENA_VALIDA = "Germancho1984";

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        background-color: ${tipo === 'success' ? '#28a745' : '#dc3545'};
        animation: slideIn 0.3s ease;
    `;
    
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Login local inicializado');
    
    const formLogin = document.getElementById('formLogin');
    const inputUsuario = document.getElementById('usuario');
    const inputPassword = document.getElementById('password');
    const botonEntrar = document.getElementById('botonEntrar');
    
    if (!formLogin) {
        console.error('❌ No se encontró el formulario de login');
        return;
    }
    
    // Verificar si ya hay sesión activa
    const usuarioLogueado = localStorage.getItem('usuario_logueado');
    if (usuarioLogueado === USUARIO_VALIDO) {
        console.log('✅ Sesión ya activa, redirigiendo...');
        setTimeout(() => window.location.href = 'Main.html', 100);
    }
    
    // Configurar placeholder para usuario
    if (inputUsuario) {
        inputUsuario.placeholder = USUARIO_VALIDO;
        inputUsuario.value = USUARIO_VALIDO; // Prellenar por comodidad
    }
    
    // Manejar envío del formulario
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const usuario = inputUsuario ? inputUsuario.value.trim() : '';
        const password = inputPassword ? inputPassword.value.trim() : '';
        
        console.log(`🔐 Intento de login: ${usuario}`);
        
        // Validación simple
        if (!usuario || !password) {
            mostrarNotificacion('⚠️ Por favor completa todos los campos', 'error');
            return;
        }
        
        // Verificar credenciales
        if (usuario === USUARIO_VALIDO && password === CONTRASENA_VALIDA) {
            console.log('✅ Credenciales correctas');
            
            // Guardar sesión
            localStorage.setItem('usuario_logueado', USUARIO_VALIDO);
            localStorage.setItem('sesion_activa', 'true');
            
            // Feedback visual
            if (botonEntrar) {
                botonEntrar.textContent = '✅ Acceso concedido...';
                botonEntrar.style.backgroundColor = '#28a745';
                botonEntrar.disabled = true;
            }
            
            mostrarNotificacion('✅ ¡Acceso concedido! Redirigiendo...', 'success');
            
            // Redirigir después de 1 segundo
            setTimeout(() => {
                window.location.href = 'Main.html';
            }, 1000);
            
        } else {
            console.log('❌ Credenciales incorrectas');
            mostrarNotificacion('❌ Usuario o contraseña incorrectos', 'error');
            
            // Feedback visual de error
            if (botonEntrar) {
                botonEntrar.textContent = '❌ Credenciales incorrectas';
                botonEntrar.style.backgroundColor = '#dc3545';
                
                setTimeout(() => {
                    botonEntrar.textContent = 'Ingresar';
                    botonEntrar.style.backgroundColor = '';
                }, 2000);
            }
            
            // Limpiar contraseña
            if (inputPassword) {
                inputPassword.value = '';
                inputPassword.focus();
            }
        }
    });
    
    // Auto-focus en la contraseña
    setTimeout(() => {
        if (inputPassword && inputPassword.value === '') {
            inputPassword.focus();
        }
    }, 500);
    
    // Agregar estilos CSS para animaciones
    const estilos = document.createElement('style');
    estilos.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .shake {
            animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(estilos);
});



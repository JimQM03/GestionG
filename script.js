// ================================================
// SCRIPT.JS - FRONTEND SIMPLIFICADO
// ================================================

const API_URL = "https://gestiong-backend.onrender.com";
const USUARIO = "german";

// Verificar sesión al cargar
(function() {
    const usuario = localStorage.getItem('usuario_logueado');
    if (usuario !== "german") {
        console.log("❌ No hay sesión activa, redirigiendo...");
        window.location.href = 'index.html';
    } else {
        console.log("✅ Sesión activa para:", usuario);
        // Mostrar usuario en pantalla
        const display = document.getElementById('nombre-usuario-display');
        if (display) display.textContent = usuario;
    }
})();

// ================================================
// FUNCIONES PARA MANEJAR DATOS
// ================================================

async function guardarIngreso(monto, clases, descripcion = "") {
    try {
        const response = await fetch(`${API_URL}/guardar-ingreso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto: parseFloat(monto),
                clases: parseInt(clases),
                descripcion: descripcion
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            mostrarNotificacion('✅ Ingreso guardado');
            await actualizarTotales();
            return true;
        } else {
            mostrarNotificacion('❌ Error: ' + (data.error || 'Error desconocido'), 'error');
            return false;
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión', 'error');
        console.error(error);
        return false;
    }
}

async function guardarGasto(nombre, valor, fecha = null) {
    try {
        const response = await fetch(`${API_URL}/guardar-gasto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombre,
                valor: parseFloat(valor),
                prioridad: "Media",
                fecha: fecha || new Date().toISOString().split('T')[0]
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            mostrarNotificacion('✅ Gasto guardado');
            await actualizarTotales();
            await cargarHistorial();
            return true;
        } else {
            mostrarNotificacion('❌ Error: ' + (data.error || 'Error desconocido'), 'error');
            return false;
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión', 'error');
        console.error(error);
        return false;
    }
}

async function cargarHistorial() {
    try {
        const response = await fetch(`${API_URL}/obtener-gastos`);
        const gastos = await response.json();
        
        const tbody = document.getElementById('cuerpo-historial');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!Array.isArray(gastos) || gastos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px;">
                        No hay gastos registrados
                    </td>
                </tr>
            `;
            return;
        }
        
        let total = 0;
        gastos.forEach(gasto => {
            total += parseFloat(gasto.valor || 0);
            
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${gasto.fecha || 'Sin fecha'}</td>
                <td>${gasto.nombre || 'Sin nombre'}</td>
                <td style="color: #dc3545; font-weight: bold">
                    $${parseFloat(gasto.valor || 0).toLocaleString('es-CO')}
                </td>
                <td>
                    <span class="badge ${(gasto.prioridad || 'Media').toLowerCase()}">
                        ${gasto.prioridad || 'Media'}
                    </span>
                </td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarGasto(${gasto.id})">
                        🗑️
                    </button>
                </td>
            `;
            tbody.appendChild(fila);
        });
        
        // Actualizar total
        const totalElement = document.getElementById('total-gastado');
        if (totalElement) {
            totalElement.textContent = `$${total.toLocaleString('es-CO')}`;
        }
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        const tbody = document.getElementById('cuerpo-historial');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #dc3545;">
                        Error cargando historial
                    </td>
                </tr>
            `;
        }
    }
}

async function actualizarTotales() {
    try {
        const response = await fetch(`${API_URL}/calcular-totales`);
        const data = await response.json();
        
        // Actualizar displays
        const displaySueldo = document.getElementById('Mostrar-sueldo');
        const displayAhorro = document.getElementById('Ahorro-quincenal');
        const displayTotalGastos = document.getElementById('total-gastado');
        
        if (displaySueldo) {
            displaySueldo.textContent = data.saldo.toLocaleString('es-CO');
        }
        
        if (displayAhorro) {
            const ahorro = data.total_ingresos * 0.1;
            displayAhorro.textContent = ahorro.toLocaleString('es-CO');
        }
        
        if (displayTotalGastos) {
            displayTotalGastos.textContent = `$${data.total_gastos.toLocaleString('es-CO')}`;
        }
        
    } catch (error) {
        console.error('Error actualizando totales:', error);
    }
}

async function eliminarGasto(id) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    
    try {
        const response = await fetch(`${API_URL}/eliminar-gasto/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (response.ok) {
            mostrarNotificacion('✅ Gasto eliminado');
            await cargarHistorial();
            await actualizarTotales();
        } else {
            mostrarNotificacion('❌ Error: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión', 'error');
        console.error(error);
    }
}

async function eliminarTodosGastos() {
    if (!confirm('¿Estás seguro de eliminar TODOS los gastos? Esta acción no se puede deshacer.')) return;
    
    try {
        const response = await fetch(`${API_URL}/eliminar-todos-gastos`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (response.ok) {
            mostrarNotificacion('✅ Todos los gastos eliminados');
            await cargarHistorial();
            await actualizarTotales();
        } else {
            mostrarNotificacion('❌ Error: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error de conexión', 'error');
        console.error(error);
    }
}

// ================================================
// FUNCIONES AUXILIARES
// ================================================

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

function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        localStorage.removeItem('usuario_logueado');
        mostrarNotificacion('👋 Sesión cerrada', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// ================================================
// INICIALIZACIÓN
// ================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Aplicación cargada');
    
    // Cargar datos iniciales
    await Promise.all([
        cargarHistorial(),
        actualizarTotales()
    ]);
    
    // Configurar botones
    const botonGuardar = document.getElementById('botonGuardar');
    const botonCalcular = document.getElementById('botonCalcularGastos');
    const botonBorrarTodo = document.getElementById('botonBorrarHistorial');
    const botonExportar = document.getElementById('boton-exportar');
    const botonLogout = document.getElementById('boton-logout');
    
    // Botón guardar ingreso
    if (botonGuardar) {
        botonGuardar.addEventListener('click', async () => {
            const monto = document.getElementById('CopQuincenal')?.value;
            const clases = document.getElementById('num-clases')?.value;
            const descripcion = document.getElementById('desc-ingreso')?.value || '';
            
            if (!monto || !clases) {
                mostrarNotificacion('⚠️ Completa todos los campos', 'error');
                return;
            }
            
            await guardarIngreso(monto, clases, descripcion);
            
            // Limpiar campos
            document.getElementById('CopQuincenal').value = '';
            document.getElementById('num-clases').value = '';
            document.getElementById('desc-ingreso').value = '';
        });
    }
    
    // Botón guardar gastos
    if (botonCalcular) {
        botonCalcular.addEventListener('click', async () => {
            const descripcion = document.getElementById('desc-gasto')?.value || 'Gasto';
            const valor = document.getElementById('valor-gasto-real')?.value;
            const fecha = document.getElementById('fecha-gasto-real')?.value;
            
            if (!valor) {
                mostrarNotificacion('⚠️ Ingresa un valor', 'error');
                return;
            }
            
            await guardarGasto(descripcion, valor, fecha);
            
            // Limpiar campos
            document.getElementById('desc-gasto').value = '';
            document.getElementById('valor-gasto-real').value = '';
            document.getElementById('fecha-gasto-real').value = '';
            document.getElementById('gasto-compras').value = '';
            document.getElementById('gasto-antojos').value = '';
            document.getElementById('deuda-corto').value = '';
            document.getElementById('deuda-largo').value = '';
        });
    }
    
    // Botón borrar todo
    if (botonBorrarTodo) {
        botonBorrarTodo.addEventListener('click', eliminarTodosGastos);
    }
    
    // Botón exportar (placeholder)
    if (botonExportar) {
        botonExportar.addEventListener('click', () => {
            mostrarNotificacion('📊 Función de exportación en desarrollo', 'info');
        });
    }
    
    // Botón logout
    if (botonLogout) {
        botonLogout.addEventListener('click', cerrarSesion);
    }
    
    // Agregar botón de logout si no existe
    const header = document.querySelector('header');
    if (header && !botonLogout) {
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Cerrar Sesión';
        logoutBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 15px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        logoutBtn.onclick = cerrarSesion;
        header.style.position = 'relative';
        header.appendChild(logoutBtn);
    }
});

// Agregar estilos para animaciones
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
    
    .badge {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .badge.alta {
        background-color: #dc3545;
        color: white;
    }
    
    .badge.media {
        background-color: #ffc107;
        color: #333;
    }
    
    .badge.baja {
        background-color: #28a745;
        color: white;
    }
    
    .btn-eliminar {
        background: none;
        border: 1px solid #dc3545;
        color: #dc3545;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .btn-eliminar:hover {
        background: #dc3545;
        color: white;
    }
`;
document.head.appendChild(estilos);
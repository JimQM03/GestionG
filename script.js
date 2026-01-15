// ================================================
// SCRIPT.JS (CON LOGS DE CONSOLA Y LIMPIEZA)
// ================================================

const API_URL = "https://gestiong-backend.onrender.com";

// Función para verificar sesión (se usa en Main.html)
function verificarSesion() {
    const usuario = localStorage.getItem('usuario_logueado');
    const sesionActiva = localStorage.getItem('sesion_activa');
    
    if (usuario !== USUARIO_VALIDO || sesionActiva !== 'true') {
        console.log('❌ No hay sesión activa, redirigiendo...');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('usuario_logueado');
    localStorage.removeItem('sesion_activa');
    mostrarNotificacion('👋 Sesión cerrada', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}
// --- SEGURIDAD Y SESIÓN ---
(function() {
    console.log("🛠️ Verificando sesión del usuario...");
    const usuario = localStorage.getItem('usuario_logueado');
    if (usuario !== "german") {
        console.warn("⚠️ Usuario no autorizado. Redirigiendo...");
        window.location.href = 'index.html';
    } else {
        console.log("✅ Sesión validada para: german");
        const display = document.getElementById('nombre-usuario-display');
        if (display) display.textContent = usuario;
    }
})();

// --- NOTIFICACIONES ---
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `position:fixed; top:20px; right:20px; padding:15px 25px; border-radius:8px; color:white; font-weight:bold; z-index:10000; background-color:${tipo === 'success' ? '#28a745' : '#dc3545'}; box-shadow: 0 4px 6px rgba(0,0,0,0.1);`;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// --- FUNCIONES DE CARGA ---

async function actualizarTotales() {
    console.log("🔄 Actualizando totales desde el servidor...");
    try {
        const res = await fetch(`${API_URL}/calcular-totales`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        
        const data = await res.json();
        console.log("📊 Datos recibidos:", data);

        const displaySueldo = document.getElementById('Mostrar-sueldo');
        const displayAhorro = document.getElementById('Ahorro-quincenal');
        
        if (displaySueldo) displaySueldo.textContent = data.saldo.toLocaleString('es-CO');
        if (displayAhorro) displayAhorro.textContent = (data.total_ingresos * 0.1).toLocaleString('es-CO');
    } catch (e) { 
        console.error("❌ Error al actualizar totales:", e.message); 
    }
}

async function cargarHistorial() {
    console.log("📥 Cargando historial desde el servidor...");
    try {
        const res = await fetch(`${API_URL}/obtener-gastos`);
        const gastos = await res.json();
        const tbody = document.getElementById('cuerpo-historial');
        
        if (!tbody) return;
        
        // Limpiamos la tabla por completo
        tbody.innerHTML = '';

        if (gastos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay registros aún</td></tr>';
            return;
        }
        
        gastos.forEach(g => {
            const tipo = g.prioridad || 'Fijo';
            const claseCss = tipo.toLowerCase();

            const fila = `
                <tr>
                    <td>${g.fecha}</td>
                    <td>${g.nombre}</td>
                    <td style="color:#dc3545; font-weight:bold">$${g.valor.toLocaleString('es-CO')}</td>
                    <td><span class="badge ${claseCss}">${tipo}</span></td>
                    <td><button class="btn-eliminar" onclick="eliminarGasto(${g.id})">🗑️</button></td>
                </tr>`;
            tbody.innerHTML += fila;
        });
        console.log("✅ Tabla renderizada con éxito");
    } catch (e) { 
        console.error("❌ Error al cargar tabla:", e); 
    }
}
// --- ACCIONES ---

async function eliminarGasto(id) {
    console.log(`🗑️ Intentando eliminar gasto con ID: ${id}`);
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
        const res = await fetch(`${API_URL}/eliminar-gasto/${id}`, { method: 'DELETE' });
        if (res.ok) {
            console.log("✅ Gasto eliminado correctamente.");
            mostrarNotificacion('✅ Gasto eliminado');
            await cargarHistorial();
            await actualizarTotales();
        } else {
            console.error("❌ El servidor no permitió eliminar el gasto.");
        }
    } catch (e) { 
        console.error("❌ Error de conexión al eliminar:", e.message); 
    }
}

// --- ESTA FUNCIÓN CONECTA TUS INPUTS CON LA TABLA DE GASTOS ---
async function registrarGastoEspecial(nombre, valor, tipo, fecha) {
    // Si la fecha viene vacía, usamos la fecha de hoy en formato YYYY-MM-DD
    const fechaFinal = fecha && fecha !== "" ? fecha : new Date().toISOString().split('T')[0];
    
    console.log(`🚀 Enviando: ${nombre} con fecha ${fechaFinal}`);

    try {
        const res = await fetch(`${API_URL}/guardar-gasto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nombre: nombre, 
                valor: parseFloat(valor), 
                fecha: fechaFinal, // Ahora garantizamos que nunca sea null/vacio
                prioridad: tipo 
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.mensaje || "Error en el servidor");
        }
    } catch (e) {
        console.error("❌ Error en la petición POST:", e.message);
        throw e; // Lanzamos el error para que el botón sepa que falló
    }
}

// --- INICIALIZACIÓN DE EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Aplicación iniciada. Vinculando eventos...");
    cargarHistorial();
    actualizarTotales();

    // 1. GUARDAR INGRESO
    document.getElementById('botonGuardar')?.addEventListener('click', async () => {
        const monto = document.getElementById('CopQuincenal')?.value;
        const clases = document.getElementById('num-clases')?.value;
        console.log("🖱️ Clic en Guardar Ingreso. Datos:", { monto, clases });

        if (!monto || !clases) {
            console.warn("⚠️ Intento de guardado con campos vacíos.");
            return mostrarNotificacion('Monto y clases son obligatorios', 'error');
        }

        try {
            const res = await fetch(`${API_URL}/guardar-ingreso`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ monto: parseFloat(monto), clases: parseInt(clases) })
            });
            if (res.ok) {
                console.log("✅ Ingreso guardado con éxito.");
                mostrarNotificacion('✅ Ingreso guardado');
                
                // --- LIMPIEZA DE INPUTS INGRESO ---
                document.getElementById('CopQuincenal').value = '';
                document.getElementById('num-clases').value = '';
                const descIngreso = document.getElementById('desc-ingreso');
                if (descIngreso) descIngreso.value = '';

                actualizarTotales();
            }
        } catch (e) { console.error("❌ Error al guardar ingreso:", e.message); }
    });

    document.getElementById('botonCalcularGastos')?.addEventListener('click', async () => {
        // --- 1. CAPTURAR DATOS ---
        const descGasto = document.getElementById('desc-gasto')?.value.trim();
        const valorGasto = document.getElementById('valor-gasto-real')?.value;
        const fechaEspecial = document.getElementById('fecha-gasto-real')?.value;

        const vCompras = document.getElementById('gasto-compras')?.value;
        const vAntojos = document.getElementById('gasto-antojos')?.value;
        const fechaVar = document.getElementById('fecha-grupo-variables')?.value;

        const dCorto = document.getElementById('deuda-corto')?.value;
        const dLargo = document.getElementById('deuda-largo')?.value;
        const fechaDeu = document.getElementById('fecha-grupo-deudas')?.value;

        // --- 2. VALIDACIÓN DE VACÍO TOTAL ---
        const estaTodoVacio = !descGasto && !valorGasto && 
                            (!vCompras || vCompras <= 0) && 
                            (!vAntojos || vAntojos <= 0) && 
                            (!dCorto || dCorto <= 0) && 
                            (!dLargo || dLargo <= 0);

        if (estaTodoVacio) {
            return mostrarNotificacion('❌ Error: No has ingresado ningún dato válido', 'error');
        }

        // --- 3. PROCESO DE GUARDADO CON CONTROL DE ERRORES ---
        try {
            mostrarNotificacion('⏳ Procesando registros...', 'success');

            // Creamos un array para ejecutar todas las promesas
            // Esto ayuda a que si una falla, sepamos que hubo un problema
            if (descGasto && valorGasto) {
                await registrarGastoEspecial(descGasto, valorGasto, 'Media', fechaEspecial);
            }

            if (vCompras > 0) {
                await registrarGastoEspecial('Mercado', vCompras, 'Variable', fechaVar);
            }
            
            if (vAntojos > 0) {
                await registrarGastoEspecial('Antojos', vAntojos, 'Variable', fechaVar);
            }

            if (dCorto > 0) {
                await registrarGastoEspecial('Deuda Celular', dCorto, 'Deuda', fechaDeu);
            }

            if (dLargo > 0) {
                await registrarGastoEspecial('Deuda Largo Plazo', dLargo, 'Deuda', fechaDeu);
            }

            // --- 4. LIMPIEZA TOTAL (Solo ocurre si NO hubo error) ---
            const idsALimpiar = [
                'desc-gasto', 'valor-gasto-real', 'fecha-gasto-real',
                'gasto-compras', 'gasto-antojos', 'fecha-grupo-variables',
                'deuda-corto', 'deuda-largo', 'fecha-grupo-deudas'
            ];
            
            idsALimpiar.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // RECARGA DE INTERFAZ
            await cargarHistorial();
            await actualizarTotales();
            mostrarNotificacion('✅ Historial actualizado correctamente');

        } catch (error) {
            console.error("Error en el proceso de guardado:", error);
            mostrarNotificacion('❌ Error 500: Falló la comunicación con el servidor', 'error');
        }
    });

    // 3. BORRAR TODO EL HISTORIAL (CON MANEJO DE ERROR 500)
    document.getElementById('botonBorrarHistorial')?.addEventListener('click', async () => {
        console.log("🖱️ Intento de borrado total iniciado.");
        
        if (!confirm('⚠️ ¿ESTÁS SEGURO? Esta acción borrará TODOS los registros permanentemente.')) return;

        try {
            mostrarNotificacion('⏳ Borrando historial...', 'success');

            const res = await fetch(`${API_URL}/eliminar-todos-gastos`, { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                console.log("✅ Servidor: Historial vaciado.");
                mostrarNotificacion('🗑️ Historial vaciado con éxito');
                
                // Refrescamos la interfaz para mostrar que está vacío
                await cargarHistorial();
                await actualizarTotales();
            } else {
                // Si el servidor responde con 500, capturamos el mensaje de error
                const errorData = await res.json().catch(() => ({})); 
                console.error("❌ Error del servidor (500):", errorData);
                throw new Error(errorData.mensaje || 'Error interno del servidor al borrar');
            }

        } catch (e) {
            console.error("❌ Fallo total en la operación:", e.message);
            mostrarNotificacion('❌ Error: No se pudo borrar el historial. Intenta más tarde.', 'error');
        }
    });

    // 4. EXPORTAR A CSV
    document.getElementById('boton-exportar')?.addEventListener('click', () => {
        console.log("🖱️ Clic en Exportar CSV.");
        const filas = document.querySelectorAll('#cuerpo-historial tr');
        if (filas.length === 0 || filas[0].innerText.includes("No hay gastos")) {
            console.warn("⚠️ No hay datos en la tabla para exportar.");
            return mostrarNotificacion('No hay datos para exportar', 'error');
        }
        let csv = "Fecha,Descripcion,Valor\n";
        filas.forEach(f => {
            const c = f.querySelectorAll('td');
            if (c.length > 2) {
                csv += `${c[0].innerText},${c[1].innerText},${c[2].innerText.replace(/[^0-9]/g,'')}\n`;
            }
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_${new Date().getTime()}.csv`;
        a.click();
        console.log("✅ Archivo CSV generado.");
    });
});
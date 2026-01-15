// ================================================
// SCRIPT.JS - FRONTEND (CON LOGS DE CONSOLA Y LIMPIEZA)
// ================================================

const API_URL = "https://gestiong-backend.onrender.com";

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
async function registrarGastoEspecial(nombre, valor, tipo) {
    console.log(`🚀 Registrando ${tipo}: ${nombre}`);
    try {
        const res = await fetch(`${API_URL}/guardar-gasto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nombre: nombre, 
                valor: parseFloat(valor), 
                fecha: new Date().toISOString().split('T')[0],
                prioridad: tipo // Aquí es donde el backend sabe que es Variable o Deuda
            })
        });

        if (res.ok) {
            mostrarNotificacion(`✅ ${tipo} registrada`);
            await cargarHistorial(); // Refresca la tabla
            await actualizarTotales(); // Refresca los números de arriba
        }
    } catch (e) {
        console.error("❌ Error:", e);
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

    // 2. CALCULAR GASTOS 
    document.getElementById('botonCalcularGastos')?.addEventListener('click', async () => {
        // --- SEÑAL: AQUÍ DEFINIMOS LAS VARIABLES ---
        const inputNombre = document.getElementById('desc-gasto');
        const inputValor = document.getElementById('valor-gasto-real');
        const inputFecha = document.getElementById('fecha-gasto-real');
        
        // Extraemos los valores antes de limpiar
        const nombre = inputNombre?.value;
        const valor = inputValor?.value;
        const fecha = inputFecha?.value;

        if (!nombre || !valor) {
            console.warn("⚠️ Intento de guardar gasto sin nombre o valor.");
            return mostrarNotificacion('Nombre y Valor son obligatorios', 'error');
        }

        // --- SEÑAL: LIMPIEZA INSTANTÁNEA (AQUÍ SE USA inputNombre) ---
        console.log("⚡ Limpiando interfaz de inmediato...");
        if (inputNombre) inputNombre.value = '';
        if (inputValor) inputValor.value = '';
        if (inputFecha) inputFecha.value = '';
        
        mostrarNotificacion('⏳ Procesando gasto...');

        try {
            const res = await fetch(`${API_URL}/guardar-gasto`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    nombre, 
                    valor: parseFloat(valor), 
                    fecha: fecha || new Date().toISOString().split('T')[0],
                    prioridad: "Media"
                })
            });

            if (res.ok) {
                console.log("✅ Servidor actualizado.");
                await cargarHistorial();
                await actualizarTotales();
            } else {
                throw new Error("Error en la respuesta del servidor");
            }
        } catch (e) { 
            console.error("❌ Error en la petición:", e.message);
            mostrarNotificacion('❌ Error al guardar', 'error');
            
            // Si falla, devolvemos los valores para no perder la información
            if (inputNombre) inputNombre.value = nombre;
            if (inputValor) inputValor.value = valor;
        }
    });

    // 3. BORRAR TODO EL HISTORIAL
    document.getElementById('botonBorrarHistorial')?.addEventListener('click', async () => {
        console.log("🖱️ Clic en Borrar Historial.");
        if (!confirm('⚠️ ¿BORRAR TODO EL HISTORIAL?')) return;
        try {
            const res = await fetch(`${API_URL}/eliminar-todos-gastos`, { method: 'DELETE' });
            if (res.ok) {
                console.log("✅ Historial vaciado por completo.");
                mostrarNotificacion('🗑️ Historial vaciado');
                await cargarHistorial(); // Esto limpiará la tabla visualmente
                await actualizarTotales();
            }
        } catch (e) { console.error("❌ Error al borrar historial:", e.message); }
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

    //  CALCULAR GASTOS (Esta función ahora procesa TODO: Especiales, Variables y Deudas)
    document.getElementById('botonCalcularGastos')?.addEventListener('click', async () => {

        // --- OBTENER VALORES DE LOS CAMPOS ---
        const descGasto = document.getElementById('desc-gasto')?.value;
        const valorGasto = document.getElementById('valor-gasto-real')?.value;
        const fechaGasto = document.getElementById('fecha-gasto-real')?.value;

        const vCompras = document.getElementById('gasto-compras')?.value;
        const vAntojos = document.getElementById('gasto-antojos')?.value;
        const dCorto = document.getElementById('deuda-corto')?.value;
        const dLargo = document.getElementById('deuda-largo')?.value;

        mostrarNotificacion('⏳ Procesando registros...');

        // --- FUNCIÓN INTERNA PARA EVITAR REPETIR CÓDIGO ---
        const enviar = async (nombre, valor, tipo) => {
            if (valor && parseFloat(valor) > 0) {
                await registrarGastoEspecial(nombre, valor, tipo);
            }
        };

        // --- PROCESAR CADA ENTRADA ---
        // 1. Gasto Específico (el principal)
        if (descGasto && valorGasto) {
            await enviar(descGasto, valorGasto, 'Media');
        }

        // 2. Gastos Variables
        await enviar('Mercado/Día a día', vCompras, 'Variable');
        await enviar('Antojos y Salidas', vAntojos, 'Variable');

        // 3. Deudas
        await enviar('Deuda Corto Plazo', dCorto, 'Deuda');
        await enviar('Deuda Largo Plazo', dLargo, 'Deuda');

        // --- LIMPIEZA DE TODOS LOS CAMPOS ---
        const idsALimpiar = ['desc-gasto', 'valor-gasto-real', 'fecha-gasto-real', 'gasto-compras', 'gasto-antojos', 'deuda-corto', 'deuda-largo'];
        idsALimpiar.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // RECARGA FINAL
        await cargarHistorial();
        await actualizarTotales();
    });
});
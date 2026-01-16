// ================================================
// SCRIPT.JS (CON LOGS DE CONSOLA Y LIMPIEZA)
// ================================================

const API_URL = "https://gestiong-backend.onrender.com";

let backendDisponible = true;
let intentosFallidos = 0;
const MAX_INTENTOS_FALLIDOS = 3;

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
        // AÑADIR TIMESTAMP PARA EVITAR CACHÉ:
        const res = await fetch(`${API_URL}/calcular-totales?t=${Date.now()}`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        
        const data = await res.json();
        console.log("📊 Datos recibidos:", data);

        const displaySueldo = document.getElementById('Mostrar-sueldo');
        if (displaySueldo) {
            displaySueldo.textContent = data.total_gastos.toLocaleString('es-CO');
        }

        // 2. Mostrar el Ahorro (10% de los ingresos totales)
        const displayAhorro = document.getElementById('Ahorro-quincenal');
        if (displayAhorro) {
            displayAhorro.textContent = (data.total_ingresos * 0.1).toLocaleString('es-CO');
        }

        // 3. Actualizar el "Total gastado" al final de la tabla
        const displayTotalHistorial = document.getElementById('total-gastado');
        if (displayTotalHistorial) {
            displayTotalHistorial.textContent = `$${data.total_gastos.toLocaleString('es-CO')}`;
        } 
    }catch (e) { 
        console.error("❌ Error al actualizar totales:", e.message);
    }
}

async function cargarHistorial(force = false) {
    console.log("📥 ===== INICIANDO CARGA DE HISTORIAL =====");
    
    // === AÑADE ESTA VERIFICACIÓN AL INICIO ===
    if (!backendDisponible && !force) {
        console.log("🚫 Backend temporalmente no disponible (omitido por circuit breaker)");
        return;
    }
    
    try {
        // URL con timestamp para evitar caché
        const url = force ? `${API_URL}/obtener-gastos?t=${Date.now()}` : `${API_URL}/obtener-gastos`;
        console.log(`🌐 URL: ${url}`);
        
        const res = await fetch(url, {
            // Añade timeout para evitar esperas eternas
            signal: AbortSignal.timeout(10000)
        });
        console.log(`📡 Status: ${res.status}`);
        
        // Verificar respuesta HTTP
        if (!res.ok) {
            throw new Error(`Error ${res.status} al cargar gastos`);
        }
        
        const respuestaServidor = await res.json();
        
        // Verificar estructura de respuesta
        if (!respuestaServidor || typeof respuestaServidor !== 'object') {
            throw new Error("Respuesta inválida del servidor");
        }
        
        const gastos = Array.isArray(respuestaServidor.gastos) ? respuestaServidor.gastos : [];
        console.log(`🔢 ${gastos.length} gastos recibidos del servidor`);
        
        // === AÑADE: Resetear circuit breaker en éxito ===
        backendDisponible = true;
        intentosFallidos = 0;
        console.log("✅ Conexión exitosa, circuit breaker reset");
        
        // === ¡AÑADE ESTA LÍNEA CRÍTICA! ===
        actualizarTablaConDatos(gastos);
        // ===================================
        
    } catch (e) { 
        console.error("❌ Error al cargar tabla:", e.message);
        
        // === AÑADE: Lógica del circuit breaker ===
        intentosFallidos++;
        console.log(`⚠️ Intento fallido #${intentosFallidos}`);
        
        if (intentosFallidos >= MAX_INTENTOS_FALLIDOS) {
            backendDisponible = false;
            console.log("🔴 Circuit breaker activado: Backend marcado como no disponible por 5 minutos");
            
            // Reactivar después de 5 minutos
            setTimeout(() => {
                backendDisponible = true;
                intentosFallidos = 0;
                console.log("🟢 Circuit breaker reset: Backend reactivado");
            }, 5 * 60 * 1000);
        }
        
        mostrarErrorEnTabla(e.message);
    }
}

// Añade esto después de cargarHistorial para ver qué está pasando
async function debugCargarHistorial() {
    console.group("🔍 DEBUG: cargarHistorial");
    
    // Verificar si backendDisponible está funcionando
    console.log("backendDisponible:", backendDisponible);
    console.log("intentosFallidos:", intentosFallidos);
    
    // Llamar a cargarHistorial con logging adicional
    await cargarHistorial(true);
    
    // Verificar si la tabla tiene contenido
    const tbody = document.getElementById('cuerpo-historial');
    if (tbody) {
        console.log("Filas en tabla:", tbody.children.length);
        console.log("Contenido HTML:", tbody.innerHTML.substring(0, 200));
    }
    
    console.groupEnd();
}
// Función auxiliar para actualizar la tabla
function actualizarTablaConDatos(gastos) {
    console.log("🔄 Actualizando tabla con datos...");
    
    const tbody = document.getElementById('cuerpo-historial');
    const displayTotal = document.getElementById('total-gastado');
    
    if (!tbody) {
        console.error("❌ No se encuentra la tabla");
        return;
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    let sumaTotal = 0;

    // Si no hay gastos
    if (gastos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="texto-centrado">
                    📭 No hay gastos registrados aún.
                </td>
            </tr>`;
        if (displayTotal) displayTotal.textContent = '$0';
        console.log("ℹ️ Tabla vacía mostrada");
        return;
    }

    // Fecha de referencia
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Procesar cada gasto
    gastos.forEach(g => {
        const valorNumerico = Number(g.valor) || 0;
        sumaTotal += valorNumerico;

        // Calcular prioridad dinámica
        let fechaGasto;
        try {
            fechaGasto = new Date(g.fecha + 'T00:00:00');
            if (isNaN(fechaGasto.getTime())) {
                fechaGasto = hoy;
            }
        } catch (e) {
            fechaGasto = hoy;
        }
        
        const diferenciaTiempo = fechaGasto - hoy;
        const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
        
        let textoPrioridad = "";
        let claseCss = "";

        if (diferenciaDias < 0) {
            textoPrioridad = "Vencido";
            claseCss = "vencido";
        } else if (diferenciaDias <= 7) {
            textoPrioridad = "Alta";
            claseCss = "alta";
        } else if (diferenciaDias <= 21) {
            textoPrioridad = "Media";
            claseCss = "media";
        } else {
            textoPrioridad = "Baja";
            claseCss = "baja";
        }
        
        // Crear fila
        const fila = `
            <tr>
                <td>${g.fecha || ''}</td>
                <td>${g.nombre || ''}</td>
                <td style="color:#dc3545; font-weight:bold">$${valorNumerico.toLocaleString('es-CO')}</td>
                <td><span class="badge ${claseCss}">${textoPrioridad}</span></td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarGasto(${g.id})" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>`;
        tbody.innerHTML += fila;
    });

    // Actualizar total
    if (displayTotal) {
        displayTotal.textContent = `$${sumaTotal.toLocaleString('es-CO')}`;
        console.log(`💰 Total actualizado: $${sumaTotal.toLocaleString('es-CO')}`);
    }
    
    console.log(`✅ Tabla actualizada con ${gastos.length} gastos`);
}

// Función para mostrar error
function mostrarErrorEnTabla(mensaje) {
    const tbody = document.getElementById('cuerpo-historial');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="texto-centrado" style="color:#dc3545;">
                    ❌ Error: ${mensaje}
                </td>
            </tr>`;
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
            // AÑADIR PEQUEÑO DELAY Y FORZAR CARGA:
            await new Promise(r => setTimeout(r, 500));
            await cargarHistorial(true);  // <-- CAMBIAR A true
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
    
    console.log(`🚀 Enviando gasto: "${nombre}" - $${valor} - ${fechaFinal}`);

    try {
        const res = await fetch(`${API_URL}/guardar-gasto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nombre: nombre, 
                valor: parseFloat(valor), 
                fecha: fechaFinal, 
                prioridad: tipo 
            })
        });

        console.log(`📡 Status respuesta: ${res.status}`);
        
        // LEER LA RESPUESTA COMPLETA
        const responseText = await res.text();
        console.log(`📄 Respuesta cruda: ${responseText.substring(0, 200)}...`);
        
        if (!res.ok) {
            // Intentar parsear como JSON si es un error
            let errorMsg = `Error HTTP ${res.status}`;
            try {
                const errorData = JSON.parse(responseText);
                errorMsg = errorData.error || errorData.mensaje || errorMsg;
            } catch (e) {
                // Si no es JSON, usar el texto
                errorMsg = responseText || errorMsg;
            }
            throw new Error(errorMsg);
        }
        
        // Parsear respuesta exitosa
        let resultado;
        try {
            resultado = JSON.parse(responseText);
            console.log(`✅ Gasto registrado: ID ${resultado.id || 'N/A'}`);
        } catch (e) {
            console.error("❌ No se pudo parsear respuesta JSON:", responseText);
            throw new Error("Respuesta inválida del servidor");
        }
        
        return resultado; // Devolver el objeto completo
        
    } catch (e) {
        console.error(`❌ Falló registro de "${nombre}":`, e.message);
        throw e; // IMPORTANTE: Re-lanzar el error
    }
}

// --- INICIALIZACIÓN DE EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Aplicación iniciada. Vinculando eventos...");
    cargarHistorial(true);
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
        const btn = document.getElementById('botonCalcularGastos');
        const fechaUnica = document.getElementById('fecha-global-registro')?.value;

        if (!fechaUnica) return mostrarNotificacion('⚠️ Selecciona una fecha', 'error');

        // Recoger gastos
        const gastosParaGuardar = [];
        
        // Gasto principal
        const descGasto = document.getElementById('desc-gasto')?.value.trim();
        const valorGasto = document.getElementById('valor-gasto-real')?.value;
        if (descGasto && valorGasto) {
            gastosParaGuardar.push({ 
                nombre: descGasto, 
                valor: valorGasto, 
                tipo: 'Media' 
            });
        }
        
        // Otros gastos
        const otrosGastos = [
            { id: 'gasto-compras', nombre: 'Mercado', tipo: 'Variable' },
            { id: 'gasto-antojos', nombre: 'Antojos', tipo: 'Variable' },
            { id: 'deuda-corto', nombre: 'Deuda Corto Plazo', tipo: 'Deuda' },
            { id: 'deuda-largo', nombre: 'Deuda Largo Plazo', tipo: 'Deuda' }
        ];
        
        otrosGastos.forEach(item => {
            const valor = document.getElementById(item.id)?.value;
            if (valor && parseFloat(valor) > 0) {
                gastosParaGuardar.push({ 
                    nombre: item.nombre, 
                    valor: valor, 
                    tipo: item.tipo 
                });
            }
        });

        if (gastosParaGuardar.length === 0) {
            mostrarNotificacion('❌ Ingresa al menos un gasto', 'error');
            return;
        }

        console.log(`📋 Guardando ${gastosParaGuardar.length} gastos...`);
        
        // Deshabilitar botón
        btn.disabled = true;
        btn.textContent = "⌛ Guardando...";
        
        try {
            let exitosos = 0;
            
            // Guardar gastos secuencialmente
            for (const gasto of gastosParaGuardar) {
                try {
                    await registrarGastoEspecial(gasto.nombre, gasto.valor, gasto.tipo, fechaUnica);
                    exitosos++;
                    console.log(`✅ ${gasto.nombre} guardado`);
                    
                    // Pequeña pausa
                    await new Promise(r => setTimeout(r, 100));
                } catch (error) {
                    console.error(`❌ ${gasto.nombre} falló:`, error);
                    // Continuar con el siguiente
                }
            }
            
            console.log(`📊 Resultado: ${exitosos} de ${gastosParaGuardar.length} exitosos`);
            
            if (exitosos > 0) {
                mostrarNotificacion(`✅ ${exitosos} gastos guardados`, 'success');
                
                // Limpiar formulario
                document.getElementById('desc-gasto').value = '';
                document.getElementById('valor-gasto-real').value = '';
                document.getElementById('gasto-compras').value = '';
                document.getElementById('gasto-antojos').value = '';
                document.getElementById('deuda-corto').value = '';
                document.getElementById('deuda-largo').value = '';
                
                // === NUEVO: Forzar actualización con múltiples intentos ===
                console.log("🔄 Programando actualización de tabla...");
                
                // Intento 1: Inmediato
                setTimeout(() => {
                    console.log("🔄 Intento 1: Actualizando tabla...");
                    cargarHistorial(true);
                    actualizarTotales();
                }, 500);
                
                // Intento 2: Después de 2 segundos (por si acaso)
                setTimeout(() => {
                    console.log("🔄 Intento 2: Re-forzando actualización...");
                    cargarHistorial(true);
                }, 2000);
                
                // Intento 3: Después de 5 segundos
                setTimeout(() => {
                    console.log("🔄 Intento 3: Último intento de actualización...");
                    cargarHistorial(true);
                }, 5000);
                
            } else {
                mostrarNotificacion('❌ No se guardó ningún gasto', 'error');
            }
            
        } catch (error) {
            console.error("❌ Error crítico:", error);
            mostrarNotificacion('❌ Error al procesar', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = "Calcular y Registrar Gastos";
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

// función de prueba
async function probarMultiplesGastos() {
    console.log("🧪 Probando múltiples gastos...");
    
    const fecha = "2026-01-16";
    const gastosPrueba = [
        { nombre: "Prueba 1", valor: 100, tipo: "Media" },
        { nombre: "Prueba 2", valor: 200, tipo: "Variable" },
        { nombre: "Prueba 3", valor: 300, tipo: "Deuda" }
    ];
    
    let exitosos = 0;
    
    for (const gasto of gastosPrueba) {
        try {
            const resultado = await registrarGastoEspecial(gasto.nombre, gasto.valor, gasto.tipo, fecha);
            console.log(`✅ ${gasto.nombre} guardado:`, resultado);
            exitosos++;
            await new Promise(r => setTimeout(r, 300)); // Pequeña pausa
        } catch (error) {
            console.error(`❌ ${gasto.nombre} falló:`, error.message);
        }
    }
    
    console.log(`📊 Total: ${exitosos} de ${gastosPrueba.length} exitosos`);
    
    if (exitosos > 0) {
        // Verificar que se guardaron en la base de datos
        setTimeout(async () => {
            console.log("🔍 Verificando en base de datos...");
            const res = await fetch(`${API_URL}/obtener-gastos?t=${Date.now()}`);
            const data = await res.json();
            console.log("📊 Gastos actuales:", data.gastos?.length);
        }, 2000);
    }
}

// Verificaciones por intervalos de tiempo
let intervaloVerificacion;

function iniciarVerificacionesPeriodicas() {
    // Limpiar intervalo existente
    if (intervaloVerificacion) {
        clearInterval(intervaloVerificacion);
    }
    
    intervaloVerificacion = setInterval(() => {
        // 1. Verificar si hay conexión a internet
        if (!navigator.onLine) {
            console.log("📡 Sin conexión a internet (omitido)");
            return;
        }
        
        // 2. Verificar circuit breaker
        if (!backendDisponible) {
            console.log("🔴 Backend no disponible (circuit breaker activo)");
            return;
        }
        
        // 3. Verificar si está en horario razonable (opcional)
        const hora = new Date().getHours();
        if (hora < 6 || hora > 23) { // No verificar entre 11PM y 6AM
            console.log("🌙 Horario nocturno (omitido)");
            return;
        }
        
        console.log("⏰ Verificación periódica iniciada...");
        
        // 4. Usar fetch con timeout corto para verificaciones
        fetch(`${API_URL}/obtener-gastos`, {
            method: 'HEAD', // Solo verificar si responde, no descargar datos
            mode: 'no-cors', // Para evitar errores CORS en verificación
            signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
        })
        .then(() => {
            // Si responde, cargar datos completos
            console.log("✅ Backend responde, cargando datos...");
            cargarHistorial(false);
        })
        .catch(() => {
            console.log("⚠️ Backend no responde (omitiendo carga completa)");
        });
        
    }, 30000);
}

// Iniciar verificaciones cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    iniciarVerificacionesPeriodicas();
});

// Pausar verificaciones cuando la pestaña no esté activa
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (intervaloVerificacion) {
            clearInterval(intervaloVerificacion);
            intervaloVerificacion = null;
            console.log("⏸️ Verificaciones pausadas (pestaña inactiva)");
        }
    } else {
        console.log("▶️ Verificaciones reanudadas");
        iniciarVerificacionesPeriodicas();
    }
});
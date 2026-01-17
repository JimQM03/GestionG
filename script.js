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

        if (!fechaUnica) {
            mostrarNotificacion('⚠️ Selecciona una fecha', 'error');
            return;
        }

        // Recoger gastos
        const gastosParaGuardar = [];
        
        // Gasto principal - ¡IMPORTANTE: Verificar que tenga valor!
        const descGasto = document.getElementById('desc-gasto')?.value.trim();
        const valorGasto = document.getElementById('valor-gasto-real')?.value;
        
        console.log("🔍 Gasto principal:", { descGasto, valorGasto });
        
        if (descGasto && valorGasto && parseFloat(valorGasto) > 0) {
            gastosParaGuardar.push({ 
                nombre: descGasto, 
                valor: valorGasto, 
                tipo: 'Media' 
            });
        }
        
        // Otros gastos con validación mejorada
        const otrosGastos = [
            { id: 'gasto-compras', nombre: 'Mercado', tipo: 'Variable' },
            { id: 'gasto-antojos', nombre: 'Antojos', tipo: 'Variable' },
            { id: 'deuda-corto', nombre: 'Deuda Corto Plazo', tipo: 'Deuda' },
            { id: 'deuda-largo', nombre: 'Deuda Largo Plazo', tipo: 'Deuda' }
        ];
        
        otrosGastos.forEach(item => {
            const input = document.getElementById(item.id);
            const valor = input?.value;
            
            console.log(`🔍 ${item.nombre}:`, { valor, parsed: parseFloat(valor) });
            
            if (valor && !isNaN(parseFloat(valor)) && parseFloat(valor) > 0) {
                gastosParaGuardar.push({ 
                    nombre: item.nombre, 
                    valor: parseFloat(valor), 
                    tipo: item.tipo 
                });
            }
        });

        console.log(`📋 Gastos a guardar:`, gastosParaGuardar);
        
        if (gastosParaGuardar.length === 0) {
            mostrarNotificacion('❌ Ingresa al menos un gasto con valor mayor a 0', 'error');
            return;
        }

        // Deshabilitar botón
        btn.disabled = true;
        const textoOriginal = btn.textContent;
        btn.textContent = "⌛ Guardando...";
        
        try {
            let exitosos = 0;
            let errores = [];
            
            console.log(`🔄 Guardando ${gastosParaGuardar.length} gastos...`);
            
            // Guardar gastos con delay entre cada uno
            for (let i = 0; i < gastosParaGuardar.length; i++) {
                const gasto = gastosParaGuardar[i];
                
                try {
                    console.log(`📤 Enviando gasto ${i+1}/${gastosParaGuardar.length}:`, gasto);
                    
                    // Actualizar texto del botón
                    btn.textContent = `⌛ Guardando... (${i+1}/${gastosParaGuardar.length})`;
                    
                    // Enviar con timeout específico
                    const resultado = await registrarGastoEspecial(
                        gasto.nombre, 
                        gasto.valor, 
                        gasto.tipo, 
                        fechaUnica
                    );
                    
                    console.log(`✅ ${gasto.nombre} guardado:`, resultado);
                    exitosos++;
                    
                    // Pequeña pausa entre gastos (500ms)
                    if (i < gastosParaGuardar.length - 1) {
                        await new Promise(r => setTimeout(r, 500));
                    }
                    
                } catch (error) {
                    console.error(`❌ ${gasto.nombre} falló:`, error);
                    errores.push(`${gasto.nombre}: ${error.message}`);
                    
                    // Continuar con el siguiente (no detenerse)
                    await new Promise(r => setTimeout(r, 300));
                }
            }
            
            console.log(`📊 Resultado final: ${exitosos} exitosos, ${errores.length} errores`);
            
            if (errores.length > 0) {
                console.log("❌ Errores detallados:", errores);
            }
            
            if (exitosos > 0) {
                // Limpiar formulario SOLO si se guardaron algunos
                if (exitosos === gastosParaGuardar.length) {
                    document.getElementById('desc-gasto').value = '';
                    document.getElementById('valor-gasto-real').value = '';
                    document.getElementById('gasto-compras').value = '';
                    document.getElementById('gasto-antojos').value = '';
                    document.getElementById('deuda-corto').value = '';
                    document.getElementById('deuda-largo').value = '';
                }
                
                mostrarNotificacion(`✅ ${exitosos} de ${gastosParaGuardar.length} gastos guardados`, 'success');
                
                // Actualizar tabla con retry inteligente
                console.log("🔄 Actualizando tabla...");
                
                // Intento 1: Inmediato
                await cargarHistorial(true);
                await actualizarTotales();
                
                // Intento 2: Después de 2 segundos (por si acaso)
                setTimeout(async () => {
                    console.log("🔄 Re-verificando tabla...");
                    await cargarHistorial(true);
                }, 2000);
                
            } else {
                mostrarNotificacion('❌ No se guardó ningún gasto. Revisa los valores.', 'error');
            }
            
        } catch (error) {
            console.error("❌ Error crítico en el proceso:", error);
            mostrarNotificacion('❌ Error al procesar los gastos', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = textoOriginal;
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
        const ahora = new Date();
        const hora = ahora.getHours();
        const minutos = ahora.getMinutes();
        
        // 1. Verificar si hay conexión a internet
        if (!navigator.onLine) {
            console.log(`📡 [${hora}:${minutos}] Sin conexión a internet (omitido)`);
            return;
        }
        
        // 2. Verificar circuit breaker
        if (!backendDisponible) {
            console.log(`🔴 [${hora}:${minutos}] Backend no disponible (circuit breaker activo)`);
            return;
        }
        
        // Log de hora pero SIN omitir
        console.log(`⏰ [${hora}:${minutos}] Verificación periódica iniciada...`);
        
        // 3. Usar fetch con timeout corto para verificaciones
        fetch(`${API_URL}/obtener-gastos`, {
            method: 'HEAD', // Solo verificar si responde
            mode: 'no-cors', // Para evitar errores CORS
            signal: AbortSignal.timeout(3000) // Timeout de 3 segundos
        })
        .then(() => {
            // Si responde, cargar datos completos
            console.log(`✅ [${hora}:${minutos}] Backend responde, cargando datos...`);
            cargarHistorial(false);
        })
        .catch((error) => {
            console.log(`⚠️ [${hora}:${minutos}] Backend no responde: ${error.message}`);
        });
        
    }, 30000); // Cada 30 segundos
}

// Iniciar verificaciones cuando la página esté lista
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Iniciando verificaciones periódicas 24/7");
    iniciarVerificacionesPeriodicas();
});

// Pausar verificaciones cuando la pestaña no esté activa
document.addEventListener('visibilitychange', () => {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    
    if (document.hidden) {
        if (intervaloVerificacion) {
            clearInterval(intervaloVerificacion);
            intervaloVerificacion = null;
            console.log(`⏸️ [${hora}:${minutos}] Verificaciones pausadas (pestaña inactiva)`);
        }
    } else {
        console.log(`▶️ [${hora}:${minutos}] Verificaciones reanudadas`);
        iniciarVerificacionesPeriodicas();
    }
});
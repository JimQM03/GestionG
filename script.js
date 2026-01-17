// recuperación automática en el frontend
let reconexionIntentos = 0;
const MAX_RECONEXIONES = 5;

async function verificarBackend() {
    try {
        const res = await fetch(`${API_URL}/health`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (res.ok) {
            console.log("✅ Backend activo");
            reconexionIntentos = 0;
            return true;
        }
        return false;
    } catch (error) {
        console.log("❌ Backend no responde:", error.message);
        return false;
    }
}

async function recuperarConexion() {
    if (reconexionIntentos >= MAX_RECONEXIONES) {
        console.error("🔴 Máximo de reconexiones alcanzado");
        mostrarNotificacion('⚠️ Servicio temporalmente no disponible. Recarga la página.', 'error');
        return false;
    }
    
    reconexionIntentos++;
    console.log(`🔄 Intento de reconexión #${reconexionIntentos}`);
    
    // Esperar tiempo exponencial
    const delay = Math.min(1000 * Math.pow(2, reconexionIntentos), 30000);
    await new Promise(r => setTimeout(r, delay));
    
    const activo = await verificarBackend();
    
    if (activo) {
        mostrarNotificacion('✅ Conexión recuperada', 'success');
        return true;
    }
    
    return false;
}

// Interceptor para errores de red/CORS
const fetchOriginal = window.fetch;
window.fetch = async function(...args) {
    let intentos = 0;
    const maxIntentos = 2;
    
    while (intentos < maxIntentos) {
        try {
            // Usar fetchOriginal (no this.fetch)
            return await fetchOriginal.apply(window, args);
        } catch (error) {
            intentos++;
            
            // Si es error de CORS o red y aún tenemos intentos
            if ((error.message.includes('Failed to fetch') || 
                 error.message.includes('CORS') ||
                 error.name === 'TypeError') && 
                intentos < maxIntentos) {
                
                console.log(`🔍 Intento ${intentos}/${maxIntentos} falló, reintentando...`);
                await new Promise(r => setTimeout(r, 1000 * intentos)); // Backoff exponencial
                continue;
            }
            
            // Si no hay más intentos o no es error de red
            throw error;
        }
    }
};

// Verificar conexión al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🔍 Verificando conexión inicial...");
    const activo = await verificarBackend();
    
    if (!activo) {
        console.log("⚠️ Backend no disponible al inicio");
        mostrarNotificacion('⏳ Conectando con el servidor...', 'info');
        
        // Intentar reconexión automática
        setTimeout(async () => {
            await recuperarConexion();
        }, 2000);
    }
});

// ================================================
// SCRIPT.JS - VERSIÓN CORREGIDA
// ================================================

// --- CONFIGURACIÓN DE API ---
function crearAPIURL() {
    // Si estamos en GitHub Pages, usar el backend de Render
    if (window.location.hostname.includes('github.io')) {
        return "https://gestiong-backend.onrender.com";
    }
    // Si estamos en localhost
    else if (window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1') {
        return "http://localhost:5000";
    }
    // Por defecto
    return "https://gestiong-backend.onrender.com";
}

const API_URL = crearAPIURL();
console.log(`🌐 Usando API: ${API_URL}`);

// --- VARIABLES GLOBALES ---
let backendDisponible = true;
let intentosFallidos = 0;
const MAX_INTENTOS_FALLIDOS = 3;

// --- SEGURIDAD Y SESIÓN ---
(function() {
    console.log("🛠️ Verificando sesión del usuario...");
    const usuario = localStorage.getItem('usuario_logueado');
    const USUARIO_VALIDO = "german"; // Añadir esta constante
    
    if (usuario !== USUARIO_VALIDO) {
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
        const res = await fetch(`${API_URL}/calcular-totales?t=${Date.now()}`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        
        const data = await res.json();
        console.log("📊 Datos recibidos:", data);

        // --- 1. OBTENER DATOS DE INGRESOS ADICIONALES ---
        let totalIngresos = data.total_ingresos || 0;
        let totalClases = 0;
        
        try {
            const resIngresos = await fetch(`${API_URL}/obtener-ingresos?t=${Date.now()}`);
            if (resIngresos.ok) {
                const ingresosData = await resIngresos.json();
                if (ingresosData.ingresos && ingresosData.ingresos.length > 0) {
                    // Sumar todas las clases registradas
                    totalClases = ingresosData.ingresos.reduce((sum, ingreso) => {
                        return sum + (ingreso.clases || 0);
                    }, 0);
                }
            }
        } catch (e) {
            console.log("ℹ️ No se pudieron obtener detalles de ingresos:", e.message);
        }

        // --- 2. ACTUALIZAR DISPLAYS ---
        const displaySueldo = document.getElementById('Mostrar-sueldo');
        const displayAhorro = document.getElementById('Ahorro-quincenal');
        const displayValorClase = document.getElementById('valor-clase');
        const displayTotalHistorial = document.getElementById('total-gastado');
        
        // SUELDO: Mostrar ingresos totales (NO gastos)
        if (displaySueldo) {
            displaySueldo.textContent = totalIngresos.toLocaleString('es-CO') || '0';
        }
        
        // AHORRO QUINCENAL: 10% de los ingresos (mostrar el 10% del ingreso quincenal)
        if (displayAhorro) {
            // Si el sueldo es mensual, dividir entre 2 para obtener quincenal
            const sueldoQuincenal = totalIngresos / 2;
            const ahorroQuincenal = sueldoQuincenal * 0.1; // 10% del quincenal
            displayAhorro.textContent = ahorroQuincenal.toLocaleString('es-CO', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            });
        }
        
        // VALOR POR CLASE: Calcular solo si hay clases registradas
        if (displayValorClase) {
            if (totalClases > 0 && totalIngresos > 0) {
                // Calcular valor promedio por clase (ingresos totales / total de clases)
                const valorPorClase = totalIngresos / totalClases;
                displayValorClase.textContent = valorPorClase.toLocaleString('es-CO', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
            } else {
                displayValorClase.textContent = '0';
            }
        }
        
        // TOTAL GASTADO (historial): Mostrar total de gastos (esto está correcto)
        if (displayTotalHistorial) {
            displayTotalHistorial.textContent = `$${(data.total_gastos || 0).toLocaleString('es-CO')}`;
        }
        
        console.log(`💰 Resumen actualizado: Sueldo=$${totalIngresos}, Clases=${totalClases}`);
        
    } catch (e) { 
        console.error("❌ Error al actualizar totales:", e.message);
    }
}

// --- FUNCIÓN PARA ACTUALIZAR EL GRÁFICO ---
async function actualizarGrafico() {
    console.log("📊 Actualizando gráfico de gastos...");
    
    try {
        const res = await fetch(`${API_URL}/estadisticas-gastos`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        
        const data = await res.json();
        console.log("📈 Datos para gráfico:", data);
        
        // Si hay datos, crear/actualizar gráfico
        if (data.categorias && data.total > 0) {
            crearGraficoDona(data);
        } else {
            mostrarGraficoVacio();
        }
        
    } catch (e) {
        console.error("❌ Error al cargar estadísticas:", e.message);
        mostrarGraficoVacio();
    }
}

// --- FUNCIÓN PARA CREAR EL GRÁFICO DE DONA ---
function crearGraficoDona(data) {
    const ctx = document.getElementById('graficoGastos');
    if (!ctx) {
        console.error("❌ No se encuentra el canvas para el gráfico");
        return;
    }
    
    // Destruir gráfico anterior si existe
    if (window.graficoGastos instanceof Chart) {
        window.graficoGastos.destroy();
    }
    
    // Preparar datos
    const categorias = Object.keys(data.categorias);
    const valores = Object.values(data.categorias);
    const porcentajes = Object.values(data.porcentajes);
    
    // Colores para cada categoría
    const colores = {
        'Especificos': '#FF6384',  // Rojo
        'Variables': '#36A2EB',    // Azul
        'Deudas': '#FFCE56'        // Amarillo
    };
    
    // Crear el gráfico
    window.graficoGastos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categorias.map((cat, i) => `${cat}: ${porcentajes[i]}%`),
            datasets: [{
                data: valores,
                backgroundColor: categorias.map(cat => colores[cat]),
                borderColor: categorias.map(cat => colores[cat] + 'CC'),
                borderWidth: 2,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = context.parsed || 0;
                            return `${label.split(':')[0]}: $${value.toLocaleString('es-CO')} (${percentage.toFixed(1)}%)`;
                        }
                    },
                    backgroundColor: 'rgba(0, 31, 63, 0.9)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12
                },
                title: {
                    display: true,
                    text: `Total Gastos: $${data.total.toLocaleString('es-CO')}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    color: '#001f3f',
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                }
            },
            cutout: '60%',
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    console.log("✅ Gráfico creado exitosamente");
}

// --- FUNCIÓN PARA MOSTRAR GRÁFICO VACÍO ---
function mostrarGraficoVacio() {
    const ctx = document.getElementById('graficoGastos');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (window.graficoGastos instanceof Chart) {
        window.graficoGastos.destroy();
    }
    
    // Crear gráfico vacío
    window.graficoGastos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Sin datos'],
            datasets: [{
                data: [1],
                backgroundColor: ['#e0e0e0'],
                borderColor: ['#cccccc'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            cutout: '60%'
        }
    });
    
    // Mostrar mensaje en el centro
    const centerText = ctx.getContext('2d');
    centerText.font = '14px "Segoe UI"';
    centerText.fillStyle = '#666';
    centerText.textAlign = 'center';
    centerText.textBaseline = 'middle';
    centerText.fillText('No hay datos', ctx.width / 2, ctx.height / 2);
}

// --- FUNCIÓN PARA ACTUALIZAR DESPUÉS DE GUARDAR GASTOS ---
async function actualizarTodo() {
    await cargarHistorial();
    await actualizarTotales();
    await actualizarGrafico();  // <-- ¡NUEVO!
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
            await actualizarTodo();

        } else {
            console.error("❌ El servidor no permitió eliminar el gasto.");
        }
    } catch (e) { 
        console.error("❌ Error de conexión al eliminar:", e.message); 
    }
}

// --- ESTA FUNCIÓN CONECTA TUS INPUTS CON LA TABLA DE GASTOS ---
async function registrarGastoEspecial(nombre, valor, tipo, fecha) {
    const fechaFinal = fecha && fecha !== "" ? fecha : new Date().toISOString().split('T')[0];
    
    console.log(`🚀 Enviando gasto: "${nombre}" - $${valor} - ${tipo} - ${fechaFinal}`);

    try {
        // Timeout más generoso para Render gratuito (a veces tarda en "despertar")
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log(`⏰ Timeout disparado para "${nombre}"`);
            controller.abort();
        }, 15000); // Aumentado a 15 segundos

        const res = await fetch(`${API_URL}/guardar-gasto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nombre: nombre, 
                valor: parseFloat(valor), 
                fecha: fechaFinal, 
                prioridad: tipo 
            }),
            signal: controller.signal,
            // Agregar keepalive para conexiones persistentes
            keepalive: true
        });

        // Limpiar timeout SIEMPRE
        clearTimeout(timeoutId);
        
        console.log(`📡 Status: ${res.status} - "${nombre}"`);
        
        // Verificar si fue abortado
        if (res.type === 'aborted') {
            throw new Error('Request fue abortado por el navegador');
        }
        
        const responseText = await res.text();
        console.log(`📄 Respuesta para "${nombre}": ${responseText.substring(0, 150)}...`);
        
        if (!res.ok) {
            let errorMsg = `Error HTTP ${res.status}`;
            try {
                const errorData = JSON.parse(responseText);
                errorMsg = errorData.error || errorData.mensaje || errorMsg;
            } catch (e) {
                errorMsg = responseText || errorMsg;
            }
            throw new Error(errorMsg);
        }
        
        let resultado;
        try {
            resultado = JSON.parse(responseText);
            console.log(`✅ Gasto "${nombre}" registrado: ID ${resultado.id || 'N/A'}`);
        } catch (e) {
            console.error("❌ No se pudo parsear respuesta JSON:", responseText);
            throw new Error("Respuesta inválida del servidor");
        }
        
        return resultado;
        
    } catch (e) {
        console.error(`❌ Falló registro de "${nombre}":`, e.message);
        
        // Manejar diferentes tipos de errores
        if (e.name === 'AbortError') {
            console.log(`⏰ "${nombre}" - Timeout, puede que Render esté en modo suspensión`);
            
            // Reintentar una vez con timeout más corto
            console.log(`🔄 Reintentando "${nombre}"...`);
            await new Promise(r => setTimeout(r, 2000));
            
            try {
                // Segundo intento sin abort controller
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
                
                if (res.ok) {
                    const resultado = await res.json();
                    console.log(`✅ Reintento exitoso para "${nombre}": ID ${resultado.id}`);
                    return resultado;
                }
            } catch (retryError) {
                console.error(`❌ Reintento falló para "${nombre}":`, retryError.message);
            }
        }
        
        // Si es otro tipo de error, verificar si el backend está activo
        if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
            console.log(`🌐 Problema de red para "${nombre}", verificando backend...`);
            
            // Verificar si el backend responde
            try {
                const healthRes = await fetch(`${API_URL}/health`, { 
                    signal: AbortSignal.timeout(5000) 
                });
                
                if (healthRes.ok) {
                    console.log(`✅ Backend responde, fue error temporal para "${nombre}"`);
                } else {
                    console.log(`⚠️ Backend no responde correctamente`);
                }
            } catch (healthError) {
                console.log(`🔴 Backend parece caído: ${healthError.message}`);
            }
        }
        
        throw e; // Re-lanzar el error original
    }
}


// --- INICIALIZACIÓN DE EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Aplicación iniciada. Vinculando eventos...");
    actualizarTodo();

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
        console.log(`📦 Enviando ${gastosParaGuardar.length} gastos en lote...`);
        
        // Usar el endpoint de lote (UNA SOLA LLAMADA)
        const res = await fetch(`${API_URL}/guardar-gastos-lote`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                gastos: gastosParaGuardar.map(g => ({
                    nombre: g.nombre,
                    valor: g.valor,
                    prioridad: g.tipo
                })),
                fecha: fechaUnica
            })
        });
        
        const resultado = await res.json();
        
        if (res.ok) {
            console.log(`✅ Lote guardado:`, resultado);
            mostrarNotificacion(`✅ ${resultado.mensaje}`, 'success');
            
            // Limpiar formulario
            document.getElementById('desc-gasto').value = '';
            document.getElementById('valor-gasto-real').value = '';
            document.getElementById('gasto-compras').value = '';
            document.getElementById('gasto-antojos').value = '';
            document.getElementById('deuda-corto').value = '';
            document.getElementById('deuda-largo').value = '';
            
            // Actualizar tabla
            await cargarHistorial(true);
            await actualizarTotales();
            
        } else {
            throw new Error(resultado.error || 'Error guardando lote');
        }
        
    } catch (error) {
        console.error("❌ Error en lote:", error);
        mostrarNotificacion(`❌ Error: ${error.message}`, 'error');
        
        // Si falla el lote, intentar individualmente
        console.log("🔄 Falló el lote, intentando gastos individualmente...");
        await guardarGastosIndividualmente(gastosParaGuardar, fechaUnica);
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
});

async function guardarGastosIndividualmente(gastos, fecha) {
    let exitosos = 0;
    
    for (const gasto of gastos) {
        try {
            // Usar la versión simple sin abort controller
            await registrarGastoEspecialSimple(gasto.nombre, gasto.valor, gasto.tipo, fecha);
            exitosos++;
            await new Promise(r => setTimeout(r, 500)); // Pequeña pausa
        } catch (error) {
            console.error(`❌ ${gasto.nombre} falló individualmente:`, error.message);
        }
    }
    
    if (exitosos > 0) {
        mostrarNotificacion(`✅ ${exitosos} de ${gastos.length} gastos guardados individualmente`, 'success');
        await actualizarTodo();
    }
}

async function registrarGastoEspecialSimple(nombre, valor, tipo, fecha) {
    const fechaFinal = fecha || new Date().toISOString().split('T')[0];
    
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
        
        if (res.ok) {
            const resultado = await res.json();
            console.log(`✅ ${nombre} guardado simple:`, resultado);
            return resultado;
        } else {
            throw new Error('Error del servidor');
        }
    } catch (e) {
        console.error(`❌ ${nombre} falló simple:`, e.message);
        throw e;
    }
}

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
                await actualizarTodo();
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


// Verificaciones por intervalos de tiempo - VERSIÓN MEJORADA
let intervaloVerificacion;
let verificacionesActivas = 0;
const MAX_VERIFICACIONES_SIMULTANEAS = 1;

function iniciarVerificacionesPeriodicas() {
    // Limpiar intervalo existente
    if (intervaloVerificacion) {
        clearInterval(intervaloVerificacion);
    }
    
    intervaloVerificacion = setInterval(() => {
        // Evitar múltiples verificaciones simultáneas
        if (verificacionesActivas >= MAX_VERIFICACIONES_SIMULTANEAS) {
            console.log("⏸️ Ya hay una verificación en curso, omitiendo...");
            return;
        }
        
        const ahora = new Date();
        const hora = ahora.getHours();
        const minutos = ahora.getMinutes();
        const segundos = ahora.getSeconds();
        
        // 1. Verificar si hay conexión a internet
        if (!navigator.onLine) {
            console.log(`📡 [${hora}:${minutos}:${segundos}] Sin conexión a internet`);
            return;
        }
        
        // 2. Verificar circuit breaker
        if (!backendDisponible) {
            console.log(`🔴 [${hora}:${minutos}:${segundos}] Backend no disponible (circuit breaker)`);
            return;
        }
        
        // Marcar que comenzó una verificación
        verificacionesActivas++;
        
        console.log(`⏰ [${hora}:${minutos}:${segundos}] Iniciando verificación (#${verificacionesActivas})...`);
        
        // 3. Usar fetch con timeout más largo
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos
        
        fetch(`${API_URL}/obtener-gastos?cache=${Date.now()}`, {
            method: 'GET',
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`✅ [${hora}:${minutos}:${segundos}] Backend responde OK, ${data.gastos?.length || 0} gastos`);
            
            // Actualizar datos sólo si hay cambios
            if (data.gastos && data.gastos.length > 0) {
                actualizarTablaConDatos(data.gastos);
                actualizarTotales();
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                console.log(`⚠️ [${hora}:${minutos}:${segundos}] Timeout en verificación`);
            } else {
                console.log(`❌ [${hora}:${minutos}:${segundos}] Error en verificación: ${error.message}`);
            }
            
            // Manejar circuit breaker
            intentosFallidos++;
            console.log(`⚠️ Intento fallido #${intentosFallidos}`);
            
            if (intentosFallidos >= MAX_INTENTOS_FALLIDOS) {
                backendDisponible = false;
                console.log("🔴 Circuit breaker activado por fallos consecutivos");
                
                // Reactivar después de 3 minutos
                setTimeout(() => {
                    backendDisponible = true;
                    intentosFallidos = 0;
                    console.log("🟢 Circuit breaker reset");
                }, 3 * 60 * 1000);
            }
        })
        .finally(() => {
            // Marcar que terminó la verificación
            verificacionesActivas = Math.max(0, verificacionesActivas - 1);
            console.log(`✓ [${hora}:${minutos}:${segundos}] Verificación completada`);
        });
        
    }, 60000); // Aumentado de 30 a 60 segundos para reducir carga
}



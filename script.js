// ================================================
// SCRIPT.JS
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

// --- NOTIFICACIONES ---
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `position:fixed; top:20px; right:20px; padding:15px 25px; border-radius:8px; color:white; font-weight:bold; z-index:10000; background-color:${tipo === 'success' ? '#28a745' : '#dc3545'}; box-shadow: 0 4px 6px rgba(0,0,0,0.1);`;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// --- CONFIGURAR EVENTOS DE TECLADO ---
function configurarEventosTeclado() {
    // Permitir Enter en campos numéricos
    document.getElementById('monto-ingreso').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            guardarIngreso();
        }
    });
    
    document.getElementById('valor-gasto-real').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            guardarGasto();
        }
    });
    
    // Permitir Enter en textareas con Ctrl+Enter
    document.getElementById('desc-ingreso').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            guardarIngreso();
        }
    });
    
    document.getElementById('desc-gasto').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            guardarGasto();
        }
    });
}

// --- FUNCIÓN PARA LIMPIAR FORMULARIOS ---
function limpiarFormularios() {
    console.log("🧹 Limpiando formularios...");
    
    // Restablecer fecha de ingresos a hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-ingreso').value = hoy;
    
    // Limpiar campos de ingreso
    document.getElementById('monto-ingreso').value = '';
    document.getElementById('desc-ingreso').value = '';
    
    // Limpiar solo campos específicos de gastos (mantener fecha y categoría)
    document.getElementById('valor-gasto-real').value = '';
    document.getElementById('desc-gasto').value = '';
    
    console.log("✅ Formularios limpiados");
}

// --- FUNCIONES DE INGRESOS ---

// 1. GUARDAR INGRESO
async function guardarIngreso() {
    console.log("🖱️ Clic en Guardar Ingreso.");

    // Validar antes de enviar
    if (!validarFormularioIngreso()) {
        return;
    }

    // Obtener valores del formulario
    const fecha = document.getElementById('fecha-ingreso').value;
    const monto = document.getElementById('monto-ingreso').value;
    const descripcion = document.getElementById('desc-ingreso').value;

    console.log("📋 Datos ingresos:", { fecha, monto, descripcion });

    try {
        const res = await fetch(`${API_URL}/guardar-ingreso`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                monto: parseFloat(monto), 
                clases: 0,
                descripcion: descripcion,
                fecha: fecha
            })
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Error HTTP: ${res.status}`);
        }
        
        const resultado = await res.json();
        console.log("✅ Ingreso guardado con éxito:", resultado);
        mostrarNotificacion('✅ Ingreso guardado correctamente', 'success');
        
        // ✅ USAR FUNCIÓN DE LIMPIEZA
        limpiarFormularios();
        
        // ✅ CORRECCIÓN: VERIFICAR QUE EL BACKEND PROCESÓ ANTES DE ACTUALIZAR
        const procesado = await verificarProcesamiento(resultado.id, 'ingreso');
        
        if (procesado) {
            console.log("✅ Backend confirmó el ingreso, actualizando interfaz...");
            await actualizarTodo();
        } else {
            console.log("⚠️ Backend no confirmó aún, esperando y reintentando...");
            // Esperar un poco más y actualizar de todos modos
            setTimeout(async () => {
                await actualizarTodo();
            }, 1000);
        }
        
    } catch (error) { 
        console.error("❌ Error al guardar ingreso:", error.message);
        mostrarNotificacion(`Error: ${error.message}`, 'error');
    }
}

// --- FUNCIÓN PARA VERIFICAR SI BACKEND PROCESÓ ---
async function verificarProcesamiento(id, tipo) {
    console.log(`🔍 Verificando procesamiento de ${tipo} ID: ${id}`);
    
    const maxIntentos = 5;
    const delay = 500; // ms entre intentos
    
    for (let i = 0; i < maxIntentos; i++) {
        try {
            const endpoint = tipo === 'gasto' ? '/obtener-gastos' : '/obtener-ingresos';
            const res = await fetch(`${API_URL}${endpoint}?cache=${Date.now()}`);
            
            if (res.ok) {
                const data = await res.json();
                const items = tipo === 'gasto' ? data.gastos : data.ingresos;
                
                // Buscar el item recién creado
                const encontrado = items.find(item => item.id === id);
                if (encontrado) {
                    console.log(`✅ ${tipo} ${id} confirmado en backend`);
                    return true;
                }
            }
            
            // Si no se encontró, esperar y reintentar
            await new Promise(resolve => setTimeout(resolve, delay));
            
        } catch (error) {
            console.log(`⚠️ Intento ${i+1} falló: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.log(`⚠️ No se pudo confirmar ${tipo} ${id} después de ${maxIntentos} intentos`);
    return false;
}

// 2. CARGAR  Y MOSTRAR INGRESOS
async function cargarIngresos() {
    console.log("📥 Cargando historial de ingresos...");
    
    try {
        const res = await fetch(`${API_URL}/obtener-ingresos?t=${Date.now()}`);
        
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const respuestaServidor = await res.json();
        const ingresos = Array.isArray(respuestaServidor.ingresos) ? respuestaServidor.ingresos : [];
        
        console.log(`🔢 ${ingresos.length} ingresos recibidos del servidor`);
        
        // Actualizar tabla de ingresos
        actualizarTablaIngresos(ingresos);
        
    } catch (error) { 
        console.error("❌ Error al cargar ingresos:", error.message);
        mostrarErrorEnTablaIngresos(error.message);
    }
}

// 3. ACTUALIZAR TABLA DE INGRESOS
function actualizarTablaIngresos(ingresos) {
    console.log("🔄 Actualizando tabla de ingresos...");
    
    const tbody = document.getElementById('cuerpo-tabla-ingresos');
    const totalIngresos = document.getElementById('total-ingresos');
    
    if (!tbody) {
        console.error("❌ No se encuentra la tabla de ingresos");
        return;
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    let sumaTotal = 0;
    
    // Si no hay ingresos
    if (ingresos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="texto-centrado">
                    📭 No hay ingresos registrados aún.
                </td>
            </tr>`;
        if (totalIngresos) totalIngresos.textContent = '$0';
        console.log("ℹ️ Tabla de ingresos vacía");
        return;
    }
    
    // Procesar cada ingreso
    ingresos.forEach(ingreso => {
        const monto = parseFloat(ingreso.monto) || 0;
        sumaTotal += monto;
        
        const fecha = ingreso.fecha || '';
        const descripcion = ingreso.descripcion || 'Sin descripción';
        
        // Crear fila
        const fila = `
            <tr>
                <td>${fecha}</td>
                <td>${descripcion}</td>
                <td style="color:#28a745; font-weight:bold">$${monto.toLocaleString('es-CO')}</td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarIngreso(${ingreso.id})" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>`;
        tbody.innerHTML += fila;
    });
    
    // Actualizar total
    if (totalIngresos) {
        totalIngresos.textContent = `$${sumaTotal.toLocaleString('es-CO')}`;
        console.log(`💰 Total ingresos: $${sumaTotal.toLocaleString('es-CO')}`);
    }
}

// 4. ELIMINAR INGRESO
async function eliminarIngreso(id) {
    console.log(`🗑️ Intentando eliminar ingreso con ID: ${id}`);
    
    if (!confirm('¿Eliminar este ingreso?')) return;
    
    try {
        const res = await fetch(`${API_URL}/eliminar-ingreso/${id}`, { 
            method: 'DELETE' 
        });
        
        if (res.ok) {
            const resultado = await res.json();
            console.log("✅ Ingreso eliminado correctamente:", resultado);
            mostrarNotificacion('✅ Ingreso eliminado', 'success');
            
            // Actualizar interfaz
            await cargarIngresos();
            await actualizarTotales();
            await actualizarGrafico();
            
        } else {
            const errorData = await res.json();
            throw new Error(errorData.error || `Error del servidor: ${res.status}`);
        }
    } catch (error) { 
        console.error("❌ Error al eliminar ingreso:", error.message);
        mostrarNotificacion(`Error: ${error.message}`, 'error');
    }
}

// 5. BORRAR TODOS LOS INGRESOS
async function borrarTodoIngresos() {
    console.log("🖱️ Intento de borrado de ingresos iniciado.");
    
    if (!confirm('⚠️ ¿ESTÁS SEGURO?\n\nEsta acción borrará PERMANENTEMENTE todos los ingresos registrados.\n\nEsta acción NO se puede deshacer.')) return;
    
    try {
        mostrarNotificacion('⏳ Borrando todos los ingresos...', 'info');
        
        const res = await fetch(`${API_URL}/eliminar-todos-ingresos`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            const resultado = await res.json();
            console.log("✅ Ingresos borrados:", resultado);
            mostrarNotificacion(`🗑️ Se eliminaron ${resultado.eliminados || 0} ingresos`, 'success');
            
            // Actualizar interfaz
            await cargarIngresos();
            await actualizarTotales();
            await actualizarGrafico();
            
        } else {
            throw new Error('Error del servidor');
        }
        
    } catch (error) {
        console.error("❌ Error borrando ingresos:", error.message);
        mostrarNotificacion('Error al borrar ingresos', 'error');
    }
}

// 6. EXPORTAR INGRESOS A CSV
function exportarIngresosCSV() {
    const filas = document.querySelectorAll('#cuerpo-tabla-ingresos tr');
    
    if (filas.length === 0 || filas[0].innerText.includes("No hay ingresos")) {
        console.warn("⚠️ No hay datos en la tabla para exportar.");
        return mostrarNotificacion('No hay ingresos para exportar', 'error');
    }
    
    let csv = "Fecha,Descripción,Monto\n";
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length >= 3) {
            const fecha = celdas[0].innerText;
            const descripcion = celdas[1].innerText;
            const monto = celdas[2].innerText.replace(/[^0-9]/g, '');
            csv += `"${fecha}","${descripcion}",${monto}\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ingresos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    console.log("✅ Archivo CSV de ingresos generado.");
    mostrarNotificacion('✅ Ingresos exportados a CSV', 'success');
}

// --- FUNCIONES DE GASTOS ---
async function guardarGasto() {
    console.log("🖱️ Clic en Guardar Gasto.");
    
    // Validar antes de enviar
    if (!validarFormularioGasto()) {
        return;
    }
    
    // Obtener valores del formulario ANTES de limpiar
    const fecha = document.getElementById('fecha-global-registro').value;
    const categoria = document.getElementById('categoria-gasto').value;
    const monto = document.getElementById('valor-gasto-real').value;
    const descripcion = document.getElementById('desc-gasto').value;
    
    console.log("📋 Datos gasto:", { fecha, categoria, monto, descripcion });
    
    try {
        // Determinar prioridad basada en categoría
        let prioridad = 'Media';
        if (categoria === 'Deudas' || categoria === 'Salud' || categoria === 'Vivienda') prioridad = 'Alta';
        if (categoria === 'Entretenimiento' || categoria === 'Ropa' || categoria === 'Otros') prioridad = 'Baja';
        
        const res = await fetch(`${API_URL}/guardar-gasto`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                nombre: `${categoria}: ${descripcion}`,
                valor: parseFloat(monto),
                fecha: fecha,
                prioridad: prioridad
            })
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Error HTTP: ${res.status}`);
        }
        
        const resultado = await res.json();
        console.log("✅ Gasto guardado con éxito:", resultado);
        mostrarNotificacion('✅ Gasto guardado correctamente', 'success');
        
        // ✅ CORRECCIÓN: USAR FUNCIÓN DE LIMPIEZA UNIFICADA (igual que ingresos)
        limpiarFormularios();
        
        // ✅ CORRECCIÓN: VERIFICAR QUE EL BACKEND PROCESÓ ANTES DE ACTUALIZAR
        const procesado = await verificarProcesamiento(resultado.id, 'gasto');
        
        if (procesado) {
            console.log("✅ Backend confirmó el gasto, actualizando interfaz...");
            await actualizarTodo();
        } else {
            console.log("⚠️ Backend no confirmó aún, esperando y reintentando...");
            // Esperar un poco más y actualizar de todos modos
            setTimeout(async () => {
                await actualizarTodo();
            }, 1000);
        }
        
    } catch (error) { 
        console.error("❌ Error al guardar gasto:", error.message);
        mostrarNotificacion(`Error: ${error.message}`, 'error');
    }
}

// 2. CARGAR Y MOSTRAR GASTOS (REEMPLAZA a cargarHistorial)
async function cargarGastos() {
    console.log("📥 Cargando historial de gastos...");
    
    try {
        const res = await fetch(`${API_URL}/obtener-gastos?t=${Date.now()}`);
        
        if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const respuestaServidor = await res.json();
        const gastos = Array.isArray(respuestaServidor.gastos) ? respuestaServidor.gastos : [];
        
        console.log(`🔢 ${gastos.length} gastos recibidos del servidor`);
        
        // Actualizar tabla de gastos
        actualizarTablaGastos(gastos);
        
    } catch (error) { 
        console.error("❌ Error al cargar gastos:", error.message);
        mostrarErrorEnTablaGastos(error.message);
    }
}

// 3. ACTUALIZAR TABLA DE GASTOS 
function actualizarTablaGastos(gastos) {
    console.log("🔄 Actualizando tabla de gastos...");
    
    const tbody = document.getElementById('cuerpo-historial');
    const totalGastado = document.getElementById('total-gastado');
    
    if (!tbody) {
        console.error("❌ No se encuentra la tabla de gastos");
        return;
    }
    
    // Limpiar tabla
    tbody.innerHTML = '';
    let sumaTotal = 0;
    
    // Si no hay gastos
    if (gastos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="texto-centrado">
                    📭 No hay gastos registrados aún.
                </td>
            </tr>`;
        if (totalGastado) totalGastado.textContent = '$0';
        console.log("ℹ️ Tabla de gastos vacía");
        return;
    }
    
    // Fecha de referencia para calcular prioridad
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Procesar cada gasto
    gastos.forEach(gasto => {
        const valor = parseFloat(gasto.valor) || 0;
        sumaTotal += valor;
        
        // Extraer categoría y descripción del nombre
        const nombreCompleto = gasto.nombre || '';
        let categoria = 'Otros';
        let descripcion = nombreCompleto;
        
        // Intentar extraer categoría del formato "Categoría: Descripción"
        if (nombreCompleto.includes(':')) {
            const partes = nombreCompleto.split(':');
            categoria = partes[0].trim();
            descripcion = partes.slice(1).join(':').trim();
        }
        
        // Calcular prioridad dinámica
        let textoPrioridad = "";
        let claseCss = "";
        
        try {
            const fechaGasto = new Date(gasto.fecha + 'T00:00:00');
            if (!isNaN(fechaGasto.getTime())) {
                const diferenciaTiempo = fechaGasto - hoy;
                const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
                
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
            }
        } catch (e) {
            textoPrioridad = gasto.prioridad || "Media";
            claseCss = "media";
        }
        
        // Crear fila
        const fila = `
            <tr>
                <td>${gasto.fecha || ''}</td>
                <td>${descripcion}</td>
                <td>${categoria}</td>
                <td style="color:#dc3545; font-weight:bold">$${valor.toLocaleString('es-CO')}</td>
                <td><span class="badge ${claseCss}">${textoPrioridad}</span></td>
                <td>
                    <button class="btn-eliminar" onclick="eliminarGasto(${gasto.id})" title="Eliminar">
                        🗑️
                    </button>
                </td>
            </tr>`;
        tbody.innerHTML += fila;
    });
    
    // Actualizar total
    if (totalGastado) {
        totalGastado.textContent = `$${sumaTotal.toLocaleString('es-CO')}`;
        console.log(`💰 Total gastado: $${sumaTotal.toLocaleString('es-CO')}`);
    }
}

// 4. BORRAR TODOS LOS GASTOS
async function borrarTodoGastos() {
    console.log("🖱️ Intento de borrado de gastos iniciado.");
    
    if (!confirm('⚠️ ¿ESTÁS SEGURO?\n\nEsta acción borrará PERMANENTEMENTE todos los gastos registrados.\n\nEsta acción NO se puede deshacer.')) return;
    
    try {
        mostrarNotificacion('⏳ Borrando todos los gastos...', 'info');
        
        const res = await fetch(`${API_URL}/eliminar-todos-gastos`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            const resultado = await res.json();
            console.log("✅ Gastos borrados:", resultado);
            mostrarNotificacion(`🗑️ Se eliminaron ${resultado.eliminados || 0} gastos`, 'success');
            
            // Actualizar interfaz
            await cargarGastos();
            await actualizarTotales();
            await actualizarGrafico();
            
        } else {
            throw new Error('Error del servidor');
        }
        
    } catch (error) {
        console.error("❌ Error borrando gastos:", error.message);
        mostrarNotificacion('Error al borrar gastos', 'error');
    }
}

// 5. EXPORTAR GASTOS A CSV
function exportarGastosCSV() {
    const filas = document.querySelectorAll('#cuerpo-historial tr');
    
    if (filas.length === 0 || filas[0].innerText.includes("No hay gastos")) {
        console.warn("⚠️ No hay datos en la tabla para exportar.");
        return mostrarNotificacion('No hay gastos para exportar', 'error');
    }
    
    let csv = "Fecha,Descripción,Categoría,Monto,Prioridad\n";
    filas.forEach(fila => {
        const celdas = fila.querySelectorAll('td');
        if (celdas.length >= 5) {
            const fecha = celdas[0].innerText;
            const descripcion = celdas[1].innerText;
            const categoria = celdas[2].innerText;
            const monto = celdas[3].innerText.replace(/[^0-9]/g, '');
            const prioridad = celdas[4].innerText;
            csv += `"${fecha}","${descripcion}","${categoria}",${monto},"${prioridad}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Gastos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    console.log("✅ Archivo CSV de gastos generado.");
    mostrarNotificacion('✅ Gastos exportados a CSV', 'success');
}

// 6. FUNCIONES DE ERROR PARA TABLAS (AGREGAR)
function mostrarErrorEnTablaIngresos(mensaje) {
    const tbody = document.getElementById('cuerpo-tabla-ingresos');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="texto-centrado" style="color:#dc3545;">
                    ❌ Error: ${mensaje}
                </td>
            </tr>`;
    }
}

function mostrarErrorEnTablaGastos(mensaje) {
    const tbody = document.getElementById('cuerpo-historial');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="texto-centrado" style="color:#dc3545;">
                    ❌ Error: ${mensaje}
                </td>
            </tr>`;
    }
}

// --- FUNCIONES DE CARGA ---
async function actualizarTotales() {
    console.log("🔄 Actualizando totales desde el servidor...");
    try {
        const res = await fetch(`${API_URL}/calcular-totales?t=${Date.now()}`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        
        const data = await res.json();
        console.log("📊 Datos recibidos:", data);
        
        // Solo actualizar total-gastado que SÍ existe
        const displayTotalHistorial = document.getElementById('total-gastado');
        if (displayTotalHistorial) {
            displayTotalHistorial.textContent = `$${(data.total_gastos || 0).toLocaleString('es-CO')}`;
        }
        
        console.log(`💰 Total gastos: $${(data.total_gastos || 0).toLocaleString('es-CO')}`);
        
    } catch (e) { 
        console.error("❌ Error al actualizar totales:", e.message);
    }
}



// --- FUNCIÓN PARA ACTUALIZAR EL GRÁFICO ---
async function actualizarGrafico() {
    console.log("📊 Actualizando gráfico de gastos...");
    
    const ctx = document.getElementById('graficoGastos');
    if (!ctx) {
        console.error("❌ No se encuentra el canvas para el gráfico");
        return;
    }
    
    try {
        // Usar un timeout más corto para evitar esperas eternas
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch(`${API_URL}/estadisticas-gastos`, {
            signal: controller.signal,
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        // Verificar si fue abortado
        if (controller.signal.aborted) {
            throw new Error('Timeout al cargar estadísticas');
        }
        
        if (!res.ok) {
            // Si es 404, el endpoint no existe
            if (res.status === 404) {
                console.warn("⚠️ Endpoint /estadisticas-gastos no encontrado (404)");
                mostrarGraficoVacio();
                return;
            }
            throw new Error(`Error HTTP: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("📈 Datos para gráfico:", data);
        
        // Verificar estructura de datos
        if (data.categorias && typeof data.categorias === 'object' && data.total > 0) {
            crearGraficoDona(data);
        } else {
            console.log("ℹ️ No hay datos suficientes para el gráfico");
            mostrarGraficoVacio();
        }
        
    } catch (e) {
        console.error("❌ Error al cargar estadísticas:", e.message);
        
        // Mostrar error específico en el gráfico
        const errorMessage = e.name === 'AbortError' ? 'Timeout' : e.message;
        mostrarGraficoError(errorMessage);
    }
}

// --- FUNCIÓN PARA MOSTRAR ERROR EN EL GRÁFICO ---
function mostrarGraficoError(mensaje) {
    const ctx = document.getElementById('graficoGastos');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (window.graficoGastos instanceof Chart) {
        window.graficoGastos.destroy();
    }
    
    // Crear gráfico de error
    window.graficoGastos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Error'],
            datasets: [{
                data: [1],
                backgroundColor: ['#dc3545'],
                borderColor: ['#b02a37'],
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
    
    // Mostrar mensaje de error en el centro
    const centerText = ctx.getContext('2d');
    centerText.clearRect(0, 0, ctx.width, ctx.height);
    centerText.font = '14px "Segoe UI"';
    centerText.fillStyle = '#dc3545';
    centerText.textAlign = 'center';
    centerText.textBaseline = 'middle';
    centerText.fillText('Error: ' + mensaje, ctx.width / 2, ctx.height / 2);
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
    
    // Preparar datos para las 12 categorías
    const categorias = Object.keys(data.categorias);
    const valores = Object.values(data.categorias);
    
    // Colores para las 12 categorías del selector
    const coloresCategorias = {
        'Vivienda': '#FF6384',        // Rojo
        'Alimentacion': '#36A2EB',    // Azul
        'Transporte': '#FFCE56',      // Amarillo
        'Servicios': '#4BC0C0',       // Turquesa
        'Educacion': '#9966FF',       // Púrpura
        'Salud': '#FF9F40',           // Naranja
        'Entretenimiento': '#C9CBCF', // Gris
        'Ropa': '#FF6384',            // Rojo claro
        'Deudas': '#E7E9ED',          // Gris claro
        'Ahorros': '#4BC0C0',         // Turquesa oscuro
        'Otros': '#C9CBCF',           // Gris
        'Especificos': '#FF6384',     // Para compatibilidad
        'Variables': '#36A2EB',       // Para compatibilidad
        'Deuda': '#FFCE56'            // Para compatibilidad
    };
    
    // Crear el gráfico con todas las categorías
    window.graficoGastos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categorias.map(cat => `${cat}`),
            datasets: [{
                data: valores,
                backgroundColor: categorias.map(cat => coloresCategorias[cat] || '#C9CBCF'),
                borderColor: categorias.map(cat => coloresCategorias[cat] ? coloresCategorias[cat] + 'CC' : '#CCCCCC'),
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
                            const categoria = context.label;
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${categoria}: $${value.toLocaleString('es-CO')} (${porcentaje}%)`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: `Total Gastos: $${data.total ? data.total.toLocaleString('es-CO') : '0'}`,
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
    
    console.log("✅ Gráfico creado exitosamente con", categorias.length, "categorías");
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

// --- FUNCIÓN PARA ACTUALIZAR ---
async function actualizarTodo() {
    console.log("🔄 Actualizando toda la interfaz...");
    
    try {
        // Usar Promise.all para cargar en paralelo
        await Promise.all([
            cargarIngresos(),
            cargarGastos(),
            actualizarTotales(),
            actualizarGrafico()
        ]);
        
        console.log("✅ Interfaz completamente actualizada");
        
    } catch (error) {
        console.error("❌ Error en actualizarTodo:", error.message);
        mostrarNotificacion('⚠️ Hubo un error al actualizar la interfaz', 'error');
    }
}

// --- FUNCIONES DE VALIDACIÓN ---
function validarFormularioIngreso() {
    const fecha = document.getElementById('fecha-ingreso').value;
    const monto = document.getElementById('monto-ingreso').value;
    const descripcion = document.getElementById('desc-ingreso').value.trim();
    
    if (!fecha) {
        mostrarNotificacion('Selecciona una fecha para el ingreso', 'error');
        return false;
    }
    
    if (!monto || parseFloat(monto) <= 0) {
        mostrarNotificacion('El monto debe ser mayor a 0', 'error');
        return false;
    }
    
    if (!descripcion) {
        mostrarNotificacion('Agrega una descripción para el ingreso', 'error');
        return false;
    }
    
    return true;
}

function validarFormularioGasto() {
    const fecha = document.getElementById('fecha-global-registro').value;
    const categoria = document.getElementById('categoria-gasto').value;
    const monto = document.getElementById('valor-gasto-real').value;
    const descripcion = document.getElementById('desc-gasto').value.trim();
    
    if (!fecha) {
        mostrarNotificacion('Selecciona una fecha para el gasto', 'error');
        return false;
    }
    
    if (!categoria || categoria === "") {
        mostrarNotificacion('Selecciona una categoría para el gasto', 'error');
        return false;
    }
    
    if (!monto || parseFloat(monto) <= 0) {
        mostrarNotificacion('El monto debe ser mayor a 0', 'error');
        return false;
    }
    
    if (!descripcion) {
        mostrarNotificacion('Agrega una descripción para el gasto', 'error');
        return false;
    }
    
    return true;
}

// --- ACCIONES ---

async function eliminarGasto(id) {
    console.log(`🗑️ Intentando eliminar gasto con ID: ${id}`);
    
    if (!confirm('¿Eliminar este gasto?')) return;
    
    try {
        const res = await fetch(`${API_URL}/eliminar-gasto/${id}`, { 
            method: 'DELETE' 
        });
        
        if (res.ok) {
            const resultado = await res.json();
            console.log("✅ Gasto eliminado correctamente:", resultado);
            mostrarNotificacion('✅ Gasto eliminado', 'success');
            
            // Pequeño delay y actualizar
            await new Promise(r => setTimeout(r, 500));
            await actualizarTodo();
            
        } else {
            const errorData = await res.json();
            throw new Error(errorData.error || `Error del servidor: ${res.status}`);
        }
    } catch (error) { 
        console.error("❌ Error de conexión al eliminar:", error.message);
        mostrarNotificacion(`Error: ${error.message}`, 'error');
    }
}


// --- INICIALIZACIÓN DE EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Aplicación iniciada. Vinculando eventos...");
    
    // 1. Establecer fecha actual por defecto
    const fechaHoy = new Date().toISOString().split('T')[0];
    document.getElementById('fecha-ingreso').value = fechaHoy;
    document.getElementById('fecha-global-registro').value = fechaHoy;
    
    // 2. Vincular botones de ingresos
    document.getElementById('botonGuardarIngreso').addEventListener('click', guardarIngreso);
    document.getElementById('btn-exportar-ingresos').addEventListener('click', exportarIngresosCSV);
    document.getElementById('btn-borrar-todo-ingresos').addEventListener('click', borrarTodoIngresos);
    
    // 3. Vincular botones de gastos
    document.getElementById('botonGuardarGasto').addEventListener('click', guardarGasto);
    document.getElementById('btn-exportar-gastos').addEventListener('click', exportarGastosCSV);
    document.getElementById('botonBorrarHistorial').addEventListener('click', borrarTodoGastos);
    
    // 4. Vincular botón de cerrar sesión
    document.querySelector('.btn-logout').addEventListener('click', cerrarSesion);
    
    // 5. Inicializar aplicación
    inicializarAplicacion();
    
    setInterval(() => {
        if (backendDisponible && document.visibilityState === 'visible') {
            console.log("⏰ Actualización periódica programada...");
            // Solo actualizar totales y gráfico, no toda la tabla
            actualizarTotales();
            actualizarGrafico();
        }
    }, 60000); // 60 segundos

    console.log("✅ Eventos vinculados correctamente");
});

// --- FUNCIÓN PARA CERRAR SESIÓN ---
function cerrarSesion() {
    console.log("🚪 Cerrando sesión...");
    
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        // Limpiar localStorage
        localStorage.removeItem('usuario_logueado');
        
        // Redirigir a la página de login
        window.location.href = 'index.html';
        
        console.log("✅ Sesión cerrada correctamente");
    }
}

// FUNCIÓN PARA PROBAR CONEXIÓN
async function probarConexion() {
    console.log("🔍 Probando conexión con el backend...");
    
    try {
        const res = await fetch(`${API_URL}/health`);
        
        if (res.ok) {
            const data = await res.json();
            console.log("✅ Backend activo:", data);
            mostrarNotificacion('✅ Conexión establecida con el servidor', 'success');
            return true;
        } else {
            throw new Error(`Error HTTP: ${res.status}`);
        }
    } catch (error) {
        console.error("❌ Backend no disponible:", error.message);
        mostrarNotificacion('⚠️ No se pudo conectar con el servidor', 'error');
        return false;
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


// Iniciar actualización periódica del gráfico
function iniciarActualizacionPeriodicaGrafico() {
    // Actualizar el gráfico cada 30 segundos
    setInterval(async () => {
        if (backendDisponible) {
            console.log("🔄 Actualización periódica del gráfico...");
            await actualizarGrafico();
        }
    }, 30000);
}

// --- FUNCIÓN PARA INICIALIZAR TODO ---
async function inicializarAplicacion() {
    console.log("🚀 Inicializando aplicación...");
    
    try {
        // 1. Verificar conexión al backend
        const conexionOk = await probarConexion();
        
        if (!conexionOk) {
            console.warn("⚠️ Backend no disponible, intentando reconexión...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const reconexion = await probarConexion();
            if (!reconexion) {
                mostrarNotificacion('⚠️ No se puede conectar al servidor. Verifica tu conexión.', 'error');
            }
        }
        
        // 2. Cargar datos iniciales
        await actualizarTodo();
        
        // 3. Configurar eventos de teclado
        configurarEventosTeclado();
        
        // 4. Iniciar verificaciones periódicas (¡AGREGAR!)
        iniciarVerificacionesPeriodicas();
        iniciarActualizacionPeriodicaGrafico();
        
        console.log("✅ Aplicación inicializada correctamente");
        
    } catch (error) {
        console.error("❌ Error en inicialización:", error);
        mostrarNotificacion('⚠️ Error al inicializar la aplicación', 'error');
    }
}

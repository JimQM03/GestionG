// ================================================
// SECCION 0: Configuracion de API
// ================================================
const API_URL = "https://gestiong-production.up.railway.app";

function getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ================================================
// SECCION 1: Referencias al DOM (Las 19 Variables)
// ================================================
const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
let gastosConFecha = [];

// 1. Boton Guardar Ingreso
const botonGuardar = document.getElementById("botonGuardar");
// 2. Boton Calcular Gastos
const botonCalcularGastos = document.getElementById("botonCalcularGastos");
// 3. Input COP Quincenal
const inputCop = document.getElementById("CopQuincenal");
// 4. Input Número de Clases
const inputClases = document.getElementById("num-clases");
// 5. Input Descripción Ingreso
const descIngreso = document.getElementById("desc-ingreso");
// 6. Display Ahorro
const displayAhorro = document.getElementById("Ahorro-quincenal");
// 7. Display Sueldo (Mostrar-sueldo)
const displaySueldo = document.getElementById("Mostrar-sueldo");
// 8. Display Valor Clase
const displayValorClase = document.getElementById("valor-clase");
// 9. Cuerpo de la Tabla Historial
const cuerpoHistorial = document.getElementById("cuerpo-historial");
// 10. Input Descripción Gasto
const descGasto = document.getElementById("desc-gasto");
// 11. Input Fecha Gasto
const fechaGastoReal = document.getElementById("fecha-gasto-real");
// 12. Input Valor Gasto Real
const valorGastoReal = document.getElementById("valor-gasto-real");
// 13. Input Gasto Compras
const gastoCompras = document.getElementById("gasto-compras");
// 14. Input Gasto Antojos
const gastoAntojos = document.getElementById("gasto-antojos");
// 15. Input Deuda Corto Plazo
const deudaCorto = document.getElementById("deuda-corto");
// 16. Input Deuda Largo Plazo
const deudaLargo = document.getElementById("deuda-largo");
// 17. Contenedor Agenda
const contenedorAgenda = document.getElementById("contenedor-agenda");
// 18. Contenedor Historial
const contenedorHistorial = document.getElementById("contenedor-historial");
// 19. Boton Borrar Historial
const botonBorrarHistorial = document.getElementById("botonBorrarHistorial");

// Extras necesarios
const totalElem = document.getElementById("total-gastado");
const botonExportar = document.getElementById("boton-exportar");

// ================================================
// SECCION 2: Inicialización
// ================================================
document.addEventListener("DOMContentLoaded", () => {
    renderizarHistorial();
    cargarHistorial();
    obtenerSaldoGlobal();
});

// ================================================
// SECCION 3: Funcionalidad de Ingresos
// ================================================
if (botonGuardar) {
    botonGuardar.addEventListener("click", async () => {
        const sueldoTotal = parseFloat(inputCop.value) || 0;
        const clases = parseInt(inputClases.value) || 0;
        const descripcion = descIngreso?.value || "Ingreso de clases";

        if (clases === 0) {
            mostrarNotificacion("Ponle al menos 1 clase para calcular", "error");
            return;
        }

        const ahorro = sueldoTotal * 0.10;
        const pagoPorClase = sueldoTotal / clases;

        // Actualización visual inmediata
        if (displaySueldo) displaySueldo.textContent = sueldoTotal.toLocaleString('es-CO');
        if (displayAhorro) displayAhorro.textContent = ahorro.toLocaleString('es-CO');
        if (displayValorClase) displayValorClase.textContent = pagoPorClase.toLocaleString('es-CO');

        // Enviar a Railway
        await guardarIngresoEnBaseDeDatos(sueldoTotal, clases, descripcion);
        await obtenerSaldoGlobal();
        
        // Limpiar campos de ingreso
        inputCop.value = "";
        inputClases.value = "";
        if (descIngreso) descIngreso.value = "";
        
        mostrarNotificacion("Ingreso registrado con éxito", "success");
    });
}

// ================================================
// SECCION 4: Funcionalidad de Gastos
// ================================================
if (botonCalcularGastos) {
    botonCalcularGastos.addEventListener("click", async () => {
        const valor = parseFloat(valorGastoReal.value) || 0;
        const fecha = fechaGastoReal.value;
        const desc = descGasto.value;

        if (valor <= 0 || desc === "" || fecha === ""){
            mostrarNotificacion("Por favor, completa los campos del gasto", "error");
            return;
        }

        if (displaySueldo) {
            displaySueldo.style.color = "#dc3545"; 
            setTimeout(() => { displaySueldo.style.color = "";}, 500);
        }

        await guardarGastoEnBaseDeDatos(desc, valor);
        await obtenerSaldoGlobal();
        await cargarHistorial();
        
        // LIMPIEZA TOTAL de inputs (Variables 10 a 16)
        [valorGastoReal, fechaGastoReal, descGasto, gastoCompras, gastoAntojos, deudaCorto, deudaLargo].forEach(campo => {
            if (campo) campo.value = "";
        });
        
        mostrarNotificacion("Gasto registrado con éxito", "success");
    });
}

// ================================================
// SECCION 5: Gestión de Historial (LocalStorage + UI)
// ================================================
function renderizarHistorial() {
    const historial = JSON.parse(localStorage.getItem("historialGastos")) || [];
    if (!cuerpoHistorial) return;

    if (historial.length === 0) {
        cuerpoHistorial.innerHTML = `<tr><td colspan="3" style="text-align: center;">Aún no hay registros.</td></tr>`;
        if (totalElem) totalElem.textContent = "$0";
        return;
    }

    historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const sumaTotal = historial.reduce((acc, reg) => acc + reg.monto, 0);

    let html = "";
    historial.forEach((reg) => {
        html += `
            <tr>
                <td>${reg.fecha}</td>
                <td>${reg.descripcion}</td>
                <td style="color: #dc3545; font-weight: bold;">$${reg.monto.toLocaleString('es-CO')}</td>
            </tr>
        `;
    });

    cuerpoHistorial.innerHTML = html;
    if (totalElem) totalElem.textContent = "$" + sumaTotal.toLocaleString("es-CO");
}

function guardarEnHistorialLocal(monto, descripcion, fecha) {
    let historial = JSON.parse(localStorage.getItem("historialGastos")) || [];
    historial.push({
        fecha: fecha || new Date().toLocaleDateString(),
        descripcion: descripcion || "Gasto general",
        monto: monto
    });
    localStorage.setItem("historialGastos", JSON.stringify(historial));
    renderizarHistorial();
}

// ================================================
// SECCION 6: Modales
// ================================================
if (botonBorrarHistorial) {
    botonBorrarHistorial.addEventListener("click", () => {
        document.getElementById("custom-modal")?.classList.remove("modal-hidden");
    });
}

document.getElementById("modal-confirmar")?.addEventListener("click", () => {
    localStorage.removeItem("historialGastos");
    renderizarHistorial();
    document.getElementById("custom-modal")?.classList.add("modal-hidden");
    mostrarNotificacion("Historial borrado", "success");
});

document.getElementById("modal-cancelar")?.addEventListener("click", () => {
    document.getElementById("custom-modal")?.classList.add("modal-hidden");
});

// ================================================
// SECCION 7: Conexión Railway (Resistente a errores)
// ================================================
async function guardarIngresoEnBaseDeDatos(monto, clases, descripcion) {
    try {
        await fetch(`${API_URL}/guardar-ingreso`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ monto, descripcion })
        });
    } catch (e) { console.warn("Error de red al guardar ingreso."); }
}

async function guardarGastoEnBaseDeDatos(descripcion, valor) {
    const fecha = fechaGastoReal.value || new Date().toISOString().split('T')[0];
    try {
        await fetch(`${API_URL}/guardar-gasto`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                tipo: "Gasto General", 
                nombre: descripcion, 
                valor: parseFloat(valor), 
                prioridad: "Media", 
                fecha: fecha 
            })
        });
    } catch (e) { console.warn("Error de red al guardar gasto."); }
    // Siempre guardamos local para que el usuario vea el cambio
    guardarEnHistorialLocal(parseFloat(valor), descripcion, fecha);
}

async function obtenerSaldoGlobal() {
    try {
        const res = await fetch(`${API_URL}/calcular-saldo`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "success") {
            if (displaySueldo) displaySueldo.textContent = data.saldo.toLocaleString('es-CO');
            if (displayAhorro) displayAhorro.textContent = (data.total_ingresos * 0.10).toLocaleString('es-CO');
        }
    } catch (e) { console.warn("No se pudo sincronizar el saldo real."); }
}

async function cargarHistorial() {
    try {
        const res = await fetch(`${API_URL}/obtener-gastos`, { headers: getAuthHeaders() });
        if (res.ok) {
            const gastos = await res.json();
            // Si el backend responde, podrías usar esos datos aquí
        }
    } catch (e) { console.log("Cargando historial desde caché local."); }
    renderizarHistorial();
}

// ================================================
// SECCION 8: Extras (Exportación y Notificaciones)
// ================================================
if (botonExportar) {
    botonExportar.addEventListener("click", () => {
        const historial = JSON.parse(localStorage.getItem("historialGastos")) || [];
        if (historial.length === 0) return alert("No hay datos para exportar.");
        let csv = "Fecha;Descripcion;Monto\n" + historial.map(r => `${r.fecha};${r.descripcion};${r.monto}`).join("\n");
        const blob = new Blob([csv], {type: "text/csv"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "historial.csv"; a.click();
    });
}

function mostrarNotificacion(mensaje, tipo = "success") {
    const contenedor = document.getElementById("notificacion-container");
    const texto = document.getElementById("notificacion-mensaje");
    if (!contenedor || !texto) return;
    texto.textContent = mensaje;
    contenedor.className = `notificacion-${tipo}`;
    contenedor.classList.remove("notificacion-hidden");
    setTimeout(() => { if (contenedor) contenedor.classList.add("notificacion-hidden"); }, 3000);
}
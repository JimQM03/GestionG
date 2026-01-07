// ================================================
// SECCIÓN 1: Referencias a elementos del DOM
// ================================================

// ARRAYS

//==============================================================================

//meses del año
const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

let gastosConFecha = [];

//==============================================================================

// Botones principales
const botonGuardar = document.getElementById("botonGuardar");
const botonCalcularGastos = document.getElementById("botonCalcularGastos");

// Inputs de ingresos
const inputCop = document.getElementById("CopQuincenal");
const inputClases = document.getElementById("num-clases");

// Displays de resultados
const displayAhorro = document.getElementById("Ahorro-quincenal");
const displaySueldo = document.getElementById("Mostrar-sueldo");
const displayValorClase = document.getElementById("valor-clase");

// Selectores para la tabla y descripcion
const cuerpoHistorial = document.getElementById("cuerpo-historial");
const descGasto = document.getElementById("desc-gasto");
const fechaGastoReal = document.getElementById("fecha-gasto-real");
const valorGastoReal = document.getElementById("valor-gasto-real");

// Inputs de gastos variables
const gastoCompras = document.getElementById("gasto-compras");
const gastoAntojos = document.getElementById("gasto-antojos");

// Inputs de deudas
const deudaCorto = document.getElementById("deuda-corto");
const deudaLargo = document.getElementById("deuda-largo");

// Contenedor de la agenda
const contenedorAgenda = document.getElementById("contenedor-agenda");

//Seccion del historial
const contenedorHistorial = document.getElementById("contenedor-historial");
const botonBorrarHistorial = document.getElementById("botonBorrarHistorial");


// ================================================
// SECCIÓN 2: Funcionalidad de ingresos
// ================================================

botonGuardar.addEventListener("click", () => {
    // Agarramos lo que el usuario escribió
    const sueldoTotal = parseFloat(inputCop.value) || 0;
    const clases = parseInt(inputClases.value) || 0;

    // Validación básica para no dividir entre cero
    if (clases === 0) {
        alert("Ponle al menos 1 clase para calcular el valor");
        return;
    }

    // Los cálculos importantes
    const ahorro = sueldoTotal * 0.10;  // 10% de ahorro automático
    const pagoPorClase = sueldoTotal / clases;

    // Actualizamos la pantalla
    displaySueldo.textContent = sueldoTotal.toLocaleString('es-CO');
    displayAhorro.textContent = ahorro.toLocaleString('es-CO');
    displayValorClase.textContent = pagoPorClase.toLocaleString('es-CO');

    // Limpiamos para la próxima
    inputCop.value = "";
    inputClases.value = "";

    console.log("Ingreso guardado correctamente.")
});


// ================================================
// SECCIÓN 3: Funcionalidad de gastos
// ================================================

// 1. Esto hace que al abrir la página, los datos guardados aparezcan solos
document.addEventListener("DOMContentLoaded", renderizarHistorial);

botonCalcularGastos.addEventListener("click", () => {
// --- Captura del Planificador Único ---
const valorGasto = parseFloat(valorGastoReal.value) || 0;
const fechaSeleccionada = fechaGastoReal.value;
const descripcion = descGasto.value;

// --- Lógica de guardado y resta ---
if (valorGasto > 0) {
    guardarEnHistorial(valorGasto, descripcion, fechaSeleccionada);

    // Restar del sueldo en pantalla
    let sueldoActual = parseFloat(displaySueldo.textContent.replace(/\./g, '')) || 0;
    displaySueldo.textContent = (sueldoActual - valorGasto).toLocaleString('es-CO');
}

// --- Limpieza de Gastos Variables ---
gastoCompras.value = "";
gastoAntojos.value = "";

// --- Limpieza de Deudas ---
deudaCorto.value = "";
deudaLargo.value = "";

valorGastoReal.value = "";
fechaGastoReal.value = "";
descGasto.value = "";
});


//==========================================================================

// Funcionalidad de historial

//==========================================================================

botonBorrarHistorial.addEventListener("click", () => {
    // 1. Confirmación 
    if (confirm("¿Estás seguro de que quieres borrar todo el historial?")) {
        
        // 2. Limpiar la memoria del navegador
        localStorage.removeItem("historialGastos");

        // 3. Limpiar la pantalla
        contenedorHistorial.innerHTML = "<p>Aún no hay registros en el historial.</p>";
        
        alert("Historial borrado con éxito ");
    }
});

function guardarEnHistorial(total) {
    // 1. Intentamos traer lo que ya existe en el historial. 
    // Si no hay nada, empezamos con una lista vacía [].
    let historial = JSON.parse(localStorage.getItem("historialGastos")) || [];

    // 2. Creamos el nuevo registro con la fecha y hora actual
    const nuevoRegistro = {
        fechaHora: new Date().toLocaleString(),
        montoTotal: total
    };

    // 3. Lo agregamos a nuestra lista
    historial.push(nuevoRegistro);

    // 4. ¡A la maleta! Convertimos la lista a texto y la guardamos
    localStorage.setItem("historialGastos", JSON.stringify(historial));
    
    // 5. Actualizamos lo que se ve en pantalla
    renderizarHistorial();
}

function renderizarHistorial() {
    // 1. Traemos los datos y los convertimos de texto a Lista (Array)
    const historial = JSON.parse(localStorage.getItem("historialGastos")) || [];
    const contenedor = document.getElementById("contenedor-historial");

    // 2. Si no hay nada, mostramos el mensaje por defecto
    if (historial.length === 0) {
        contenedor.innerHTML = "<p>Aún no hay registros en el historial.</p>";
        return;
    }

    // 3. Construimos el HTML detallado
    let html = "";
    historial.forEach((registro, index) => {
        html += `
            <div class="item-historial" style="border-bottom: 1px solid #ddd; padding: 10px; margin-bottom: 5px;">
                <p><strong>Registro #${index + 1}</strong></p>
                <p>📅 Fecha: ${registro.fechaHora}</p>
                <p>💰 Total calculado: <span style="color: #28a745; font-weight: bold;">$${registro.montoTotal.toLocaleString('es-CO')}</span></p>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}
// ================================================
// SECCIÓN 4: Generación de la agenda
// ================================================

function mostrarAgenda(gastosConFecha, gastosVariables, deudas) {
    // Limpiamos lo que había antes
    contenedorAgenda.innerHTML = "";

    // Si no hay nada que mostrar
    if (gastosConFecha.length === 0 && gastosVariables.length === 0 && deudas.length === 0) {
        contenedorAgenda.innerHTML = "<p>No hay gastos registrados todavía.</p>";
        return;
    }

    // Ordenamos los gastos por día del mes
    gastosConFecha.sort((a, b) => a.fecha - b.fecha);

    // Creamos la estructura de la agenda
    let html = "<div class='agenda-completa'>";

    // Gastos fijos con calendario
    if (gastosConFecha.length > 0) {
        html += "<div class='grupo-gastos'>";
        html += "<h3>📅 Gastos por fecha</h3>";
        
        gastosConFecha.forEach(gasto => {
            html += `
            <div class='item-gasto'>
            <span class='dia-mes'>${gasto.fecha.getDate()} de ${nombresMeses[gasto.fecha.getMonth()]}</span>
            <span class='nombre-gasto'>${gasto.nombre}</span>
            <span class='valor-gasto'>$${gasto.valor.toLocaleString('es-CO')}</span>
            </div>
            `;
        });
        
        html += "</div>";
    }

    // Gastos variables
    if (gastosVariables.length > 0) {
        html += "<div class='grupo-gastos'>";
        html += "<h3>🛒 Gastos variables</h3>";
        
        gastosVariables.forEach(gasto => {
            html += `
                <div class='item-gasto'>
                    <span class='nombre-gasto'>${gasto.nombre}</span>
                    <span class='valor-gasto'>$${gasto.valor.toLocaleString('es-CO')}</span>
                </div>
            `;
        });
        
        html += "</div>";
    }

    // Deudas
    if (deudas.length > 0) {
        html += "<div class='grupo-gastos deudas'>";
        html += "<h3>💳 Deudas pendientes</h3>";
        
        deudas.forEach(deuda => {
            html += `
                <div class='item-gasto'>
                    <span class='nombre-gasto'>${deuda.nombre}</span>
                    <span class='valor-gasto'>$${deuda.valor.toLocaleString('es-CO')}</span>
                </div>
            `;
        });
        
        html += "</div>";
    }

    // Total de gastos
    const totalFijos = gastosConFecha.reduce((sum, g) => sum + g.valor, 0);
    const totalVariables = gastosVariables.reduce((sum, g) => sum + g.valor, 0);
    const totalDeudas = deudas.reduce((sum, d) => sum + d.valor, 0);
    const totalGeneral = totalFijos + totalVariables + totalDeudas;

        // Dentro de mostrarAgenda, después de calcular totalGeneral:

    // 1. Obtenemos el sueldo que se calculó al principio (quitándole puntos o comas)
    const sueldoActual = parseFloat(displaySueldo.innerText.replace(/\./g, '')) || 0;

    // 2. Calculamos cuánto queda 
    const sueldoRestante = sueldoActual - totalGeneral;

    // 3. Lo mostramos en el mismo lugar o en uno nuevo
    displaySueldo.innerText = sueldoRestante.toLocaleString('es-CO');

    html += `
        <div class='resumen-total'>
            <h3> Total estimado</h3>
            <p class='total-grande'>$${totalGeneral.toLocaleString('es-CO')} COP</p>
        </div>
    `;

    html += "</div>";
    contenedorAgenda.innerHTML = html;
}

// ================================================
// SECCIÓN 5: MySQL Workbrench
// ================================================

async function enviarAlServidor(datosGasto) {
    try {
        const respuesta = await fetch('http://127.0.0.1:5000/guardar-gasto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosGasto)
        });
        const resultado = await respuesta.json();
        console.log("Respuesta del servidor:", resultado.mensaje);
    } catch (error) {
        console.error("Error al conectar con el backend:", error);
    }
}

// Función para enviar datos al Backend (Tú, Desarrollador A)
async function guardarGastoEnBaseDeDatos(nombre, valor, prioridad = 'Normal') {
    const objetoGasto = {
        tipo: 'Gasto',
        nombre: nombre,
        valor: valor,
        descripcion: 'Registrado desde la web',
        prioridad: prioridad
    };

    try {
        const respuesta = await fetch('http://127.0.0.1:5001/guardar-gasto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objetoGasto)
        });
        
        const resultado = await respuesta.json();
        console.log("Servidor dice:", resultado.mensaje);
    } catch (error) {
        console.error("Error conectando al servidor:", error);
    }
}
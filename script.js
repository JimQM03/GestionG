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

        // 3. renderizar
        renderizarHistorial();
        
        alert("Historial borrado con éxito ");
    }
});

function guardarEnHistorial(total, descripcion, fecha) {
    // 1. Intentamos traer lo que ya existe en el historial. 
    // Si no hay nada, empezamos con una lista vacía [].
    let historial = JSON.parse(localStorage.getItem("historialGastos")) || [];

    // 2. Creamos el nuevo registro con la fecha, descripcion y monto
    const nuevoRegistro = {
        fecha: fecha || new Date().toLocaleDateString(),
        descripcion: descripcion || "Gasto general",
        monto: total
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

    // 2. Si no hay nada, mostramos el mensaje por defecto
    if (historial.length === 0) {
        cuerpoHistorial.innerHTML = `<tr><td colspan="3" style="text-align: center;">Aún no hay registros.</td></tr>`;
        return;
    }

    // 3. Construimos el HTML detallado
    let html = "";
    historial.forEach((registro, index) => {
        html += `
            <tr>
                <td>${registro.fecha}</td>
                <td>${registro.descripcion}</td>
                <td style="color: #dc3545; font-weight: bold;">$${registro.monto.toLocaleString('es-CO')}</td>
        `;
    });

    cuerpoHistorial.innerHTML = html;
}

// ================================================
// SECCIÓN 5: Conexión al Backend (Unificada)
// ================================================

async function guardarGastoEnBaseDeDatos(nombre, valor, prioridad = 'Normal') {
    // 1. Preparamos el objeto con todos los campos que pide la tabla de MySQL
    const objetoGasto = {
        tipo: 'Gasto General', // Categoría por defecto
        nombre: nombre,
        valor: valor,
        descripcion: 'Registrado desde GestionG Web',
        prioridad: prioridad
    };

    console.log("🚀 Enviando datos a Python...", objetoGasto);

    try {
        // 2. Hacemos la petición a tu servidor local (App.py)
        const respuesta = await fetch('http://127.0.0.1:5000/guardar-gasto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objetoGasto)
        });
        
        // 3. Analizamos la respuesta del servidor
        if (respuesta.ok) {
            const resultado = await respuesta.json();
            console.log("✅ Servidor dice:", resultado.mensaje);
            alert("¡Gasto guardado con éxito en Railway!");
        } else {
            const errorData = await respuesta.json();
            console.error("❌ Error en el servidor:", errorData.mensaje);
            alert("Error del servidor: " + errorData.mensaje);
        }

    } catch (error) {
        console.error("❌ Error de conexión:", error);
        alert("No se pudo conectar con el servidor Python. ¿Olvidaste ejecutar 'python app.py'?");
    }
}
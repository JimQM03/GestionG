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
// Extraemos los valores de los inputs
const valorGasto = parseFloat(valorGastoReal.value) || 0;
const fechaSeleccionada = fechaGastoReal.value;
const descripcion = descGasto.value;

// Si falta algún dato o el valor es 0, detenemos el proceso con un aviso
if (valorGasto <=0 || descripcion === "" || fechaSeleccionada === ""){
    alert("Por favor, completa la descripcion, valor y fecha para registrar el gasto");
    return
}

// Guardamos en el historial pasando los 3 datos necesarios
guardarEnHistorial(valorGasto, descripcion, fechaSeleccionada);

// Restar del sueldo en pantalla
let sueldoActual = parseFloat(displaySueldo.textContent.replace(/\./g, '')) || 0;
let nuevoSueldo = sueldoActual - valorGasto;
displaySueldo.textContent = nuevoSueldo.toLocaleString('es-CO');

// Resaltamos el sueldo en rojo brevemente para confirmar el descuento
displaySueldo.style.color = "#dc3545"; 
setTimeout(() => { displaySueldo.style.color = "";}, 500);

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
        const totalElem = document.getElementById("total-gastado") 
        // Si borras el historial, el contador de "Total" debe volver a cero
        if (totalElem) totalElem.textContent = "$0";
        return;
    }

    // Comparamos las fechas para que el gasto más reciente aparezca de primero
    historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Usamos .reduce para sumar todos los "monto" que hay en el historial
    const sumaTotal = historial.reduce((acumulado, registro) => acumulado + registro.monto, 0);

    // 3. Construimos el HTML detallado
    let html = "";
    historial.forEach((registro, index) => {
        html += `
            <tr>
                <td>${registro.fecha}</td>
                <td>${registro.descripcion}</td>
                <td style="color: #dc3545; font-weight: bold;">$${registro.monto.toLocaleString('es-CO')}</td>
            </tr>
                `;
    });

    cuerpoHistorial.innerHTML = html;

    // Si tienes un elemento para el total, lo actualizamos con la suma
    const elementoTotal = document.getElementById("total-gastado");
    if (elementoTotal){
        elementoTotal.textContent = "$" + sumaTotal.toLocaleString("es-CO");
    }
}

//==========================================================================
// Funcionalidad de Exportación
//==========================================================================

// Esta función convierte el historial en un archivo de texto (.txt) o CSV
    function exportarHistorial(){
        const historial = JSON.parse(localStorage.getItem("historialGastos")) || [];

        if (historial.length === 0){
            alert("No hay datos para exportar.");
            return;
        }

        //Creamos el encabezado del archivo
        let contenido = "Fecha;Descripcion;Monto\n";

        //Recorremos los datos y los organizamos por filas separadas por punto y coma
        historial.forEach(reg => {
            contenido += `${reg.fecha}; ${reg.descripcion}; ${reg.monto}\n`;
        });
        // Creamos un "Blob" (un objeto de datos binarios) para generar el archivo
        const blob = new Blob([contenido], {type:  "text/csv"});
        const url = URL.createObjectURL(blob);

        // Creamos un enlace invisible para forzar la descarga
        const a = document.createElement("a");
        a.href = url;
        a.download = "mi_historial_gastos.csv";
        document.body.appendChild(a);
        a.click();

        // Limpiamos el rastro del enlace creado
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Escuchamos el click en el botón de exportar (asegúrate de que el ID coincida en tu HTML)
    const botonExportar = document.getElementById("boton-exportar");
    if (botonExportar){
        botonExportar.addEventListener("click", exportarHistorial);
    }
/* ================================================
   SECCIÓN 4: MySQL via Railway (Backend)
   ================================================ */

   /* ⚠️ NOTA PARA EL DÍA 2: 
   Cuando el Desarrollador A te entregue el link, pégalo entre las comillas.
   Debe verse algo así: "https://proyectogestion-production.up.railway.app/guardar-gasto"
*/

const URL_RAILWAY = "";
async function guardarGastoEnBaseDeDato(nombre, valor) {
    /* Si la URL está vacía, mostramos un aviso en consola y no intentamos el envío */
    if(!URL_RAILWAY){
        console.warn("Pendiente: Configurar URL de Railway");
        return;
    }
    
    /* unificamos el nombre del objeto a enviar */
    const objetoGasto = {
        nombre: nombre,
        valor: valor,
        descripcion: 'Registrado desde GestionG Web',
        fecha: new Date().toISOString().slice(0, 10)
    };
    
    try {
        const respuesta = await fetch(URL_RAILWAY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(objetoGasto)
        });
        const resultado = await respuesta.json();
        console.log("Railway dice:", resultado.mensaje);
    }catch(error){
        console.error("Error conectando a Railway:", error);
    }
}

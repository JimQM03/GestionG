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
const fechaGastoReal = document.getElementById("fecha-gasto-real").value;
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
    mostrarNotificacion("Porfavor, completa todos los campos", "error");
    return
}

// Guardamos en el historial pasando los 3 datos necesarios
guardarEnHistorial(valorGasto, descripcion, fechaSeleccionada);

// Enviamos el gasto a MySQL / Railway automáticamente
guardarGastoEnBaseDeDatos(descripcion, valorGasto);

// Restar del sueldo en pantalla
let sueldoActual = parseFloat(displaySueldo.textContent.replace(/\./g, '')) || 0;
let nuevoSueldo = sueldoActual - valorGasto;
displaySueldo.textContent = nuevoSueldo.toLocaleString('es-CO');

// Resaltamos el sueldo en rojo brevemente para confirmar el descuento
displaySueldo.style.color = "#dc3545"; 
setTimeout(() => { displaySueldo.style.color = "";}, 500);

// --- Limpieza de inputs ---
    [valorGastoReal, fechaGastoReal, descGasto, gastoCompras, gastoAntojos, deudaCorto, deudaLargo].forEach(input => {
        if(input) input.value="";
    });
    mostrarNotificacion("Gasto registrado con éxito", "success");
});


//==========================================================================
// Funcionalidad de historial
//==========================================================================

botonBorrarHistorial.addEventListener("click", () => {
    const modal = document.getElementById("custom-modal");
    modal.classList.remove("modal-hidden"); // Quitamos la clase que lo esconde 
});

// Lógica del botón "Confirmar" dentro del Modal
document.getElementById("modal-confirmar").addEventListener("click", () =>{
    localStorage.removeItem("historialGastos") // Borramos datos
    renderizarHistorial(); // Actualizamos tabla
    document.getElementById("custom-modal").classList.add("modal-hidden");// Cerramos modal
    mostrarNotificacion("Todo el historial ha sido borrado", "success");
});

//Lógica del botón "Cancelar" dentro del Modal
document.getElementById("modal-cancel").addEventListener("click", () => {
    document.getElementById("custom-modal").classList.add("modal-hidden"); // Solo cerramos

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
    const sumaTotal = historial.reduce((acc, reg) => acc + reg.monto, 0);

    // 3. Construimos el HTML detallado
    let html = "";
    historial.forEach((registro) => {
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
    if(totalElem) totalElem.textContent = "$" + sumaTotal.toLocaleString("es-CO");
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
// ================================================
// SECTOR 3.5: Funcionalidad de Notificaciones
// ================================================
function mostrarNotificacion(mensaje, tipo = "success") {
    const contenedor = document.getElementById("notificacion-container");
    const texto = document.getElementById("notificacion-mensaje");
    
    if (!contenedor || !texto) {
        console.warn("No se encontraron los elementos de notificación, usando alert.");
        alert(mensaje);
        return;
    }

    texto.textContent = mensaje;
    contenedor.className = `notificacion-${tipo}`;
    contenedor.classList.remove("notificacion-hidden");

    setTimeout(() => {
        contenedor.classList.add("notificacion-hidden");
    }, 3000);
}

// ================================================
// SECCIÓN 4: Conexión al Backend (Guardado)
// ================================================

// Usamos DOMContentLoaded para evitar el error "Cannot read properties of null"
document.addEventListener("DOMContentLoaded", () => {
    const btnCalcular = document.getElementById("btn-calcular");

    // Verificamos que el botón exista antes de asignarle el evento
    if (btnCalcular) {
        btnCalcular.addEventListener("click", async () => {
            // 1. Recolectar datos con IDs exactos de tu Main.html
            const nombre = document.getElementById("desc-gasto").value;
            const valor = document.getElementById("valor-gasto-real").value;
            const prioridad = document.getElementById("prioridad-gasto").value;
            const fecha = document.getElementById("fecha-gasto-real").value;

            // 2. Validación básica
            if (!nombre || !valor || !fecha) {
                mostrarNotificacion("Por favor, completa descripción, valor y fecha.", "error");
                return;
            }

            const datosGasto = {
                tipo: "Gasto General",
                nombre: nombre,
                valor: parseFloat(valor),
                prioridad: prioridad,
                fecha: fecha
            };

            try {
                const respuesta = await fetch(`${API_URL}/guardar-gasto`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(datosGasto)
                });

                if (respuesta.ok) {
                    mostrarNotificacion("¡Gasto guardado con éxito en la nube!", "success");
                    
                    // Limpiar campos
                    document.getElementById("desc-gasto").value = "";
                    document.getElementById("valor-gasto-real").value = "";
                    
                    // Actualizar la tabla inmediatamente
                    cargarHistorial(); 
                } else {
                    mostrarNotificacion("Error al guardar en el servidor", "error");
                }
            } catch (error) {
                console.error("❌ Error de conexión:", error);
                mostrarNotificacion("Sin conexión al servidor de Railway", "error");
            }
        });
    } else {
        console.warn("Aviso: No se encontró el botón 'btn-calcular' en esta página.");
    }

    // Al cargar la página, también traemos el historial
    cargarHistorial();
});

// ================================================
// SECCIÓN 5: Carga de Historial desde MySQL (Lectura)
// ================================================
async function cargarHistorial() {
    const cuerpoTabla = document.getElementById("cuerpo-historial");
    
    // Si no estamos en la página que tiene la tabla, no hacemos nada
    if (!cuerpoTabla) return;

    try {
        const respuesta = await fetch(`${API_URL}/obtener-gastos`);
        if (!respuesta.ok) throw new Error("Error al obtener datos");
        
        const gastos = await respuesta.json();

        // Limpiamos la tabla antes de llenarla
        cuerpoTabla.innerHTML = "";

        if (gastos.length === 0) {
            cuerpoTabla.innerHTML = `<tr><td colspan="4" class="texto-centrado">No hay registros aún.</td></tr>`;
            return;
        }

        // Creamos las filas dinámicamente
        gastos.forEach(gasto => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${gasto.fecha}</td>
                <td>${gasto.nombre}</td>
                <td>$${parseFloat(gasto.valor).toLocaleString()}</td>
                <td><span class="badge ${gasto.prioridad.toLowerCase()}">${gasto.prioridad}</span></td>
            `;
            cuerpoTabla.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar historial:", error);
    }
}
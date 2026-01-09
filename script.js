// ================================================
// SECCIÓN 0: Configuración de API
// ================================================

// URL de tu backend en Railway
const API_URL = "https://gestiong-production.up.railway.app";
const fetchConfig = { credentials: 'include' };
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

botonGuardar.addEventListener("click", async () => {
    // Agarramos lo que el usuario escribió
    const sueldoTotal = parseFloat(inputCop.value) || 0;
    const clases = parseInt(inputClases.value) || 0;
    const descripcionIngreso = document.getElementById("desc-ingreso")?.value || "";

    // Validación básica para no dividir entre cero
    if (clases === 0) {
        mostrarNotificacion("Ponle al menos 1 clase para calcular", "error");
        return;
    }

    // Los cálculos importantes
    const ahorro = sueldoTotal * 0.10;  // 10% de ahorro automático
    const pagoPorClase = sueldoTotal / clases;

    // Actualizamos la pantalla
    displaySueldo.textContent = sueldoTotal.toLocaleString('es-CO');
    displayAhorro.textContent = ahorro.toLocaleString('es-CO');
    displayValorClase.textContent = pagoPorClase.toLocaleString('es-CO');

    // Guardar en la base de datos
    await guardarIngresoEnBaseDeDatos(sueldoTotal, clases, descripcionIngreso);

    // Sincronizar el saldo real desde MySQL
    await obtenerSaldoGlobal();
    // Limpiamos para la próxima
    inputCop.value = "";
    inputClases.value = "";
    if(document.getElementById("desc-ingreso")) document.getElementById("desc-ingreso").value = "";

    console.log("Ingreso guardado correctamente.")
    mostrarNotificacion("Ingreso registro con éxito", "success");
});


// ================================================
// SECCIÓN 3: Funcionalidad de gastos
// ================================================

// 1. Esto hace que al abrir la página, los datos guardados aparezcan solos
document.addEventListener("DOMContentLoaded", renderizarHistorial);

botonCalcularGastos.addEventListener("click", async () => {
// Extraemos los valores de los inputs
const valorGasto = parseFloat(valorGastoReal.value) || 0;
const fechaSeleccionada = fechaGastoReal.value;
const descripcion = descGasto.value;

// Si falta algún dato o el valor es 0, detenemos el proceso con un aviso
if (valorGasto <=0 || descripcion === "" || fechaSeleccionada === ""){
    mostrarNotificacion("Porfavor, completa todos los campos", "error");
    return
}

// Resaltamos el sueldo en rojo brevemente para confirmar el descuento
displaySueldo.style.color = "#dc3545"; 
setTimeout(() => { displaySueldo.style.color = "";}, 500);

await guardarGastoEnBaseDeDatos(descripcion, valorGasto);

await obtenerSaldoGlobal();
await cargarHistorial();
// --- Limpieza de inputs ---
    [valorGastoReal, fechaGastoReal, descGasto, gastoCompras, gastoAntojos, deudaCorto, deudaLargo].forEach(input => {
        if(input) input.value="";
    });
    mostrarNotificacion("Gasto registrado con éxito", "success");
});


//==========================================================================
// Funcionalidad de historial y modal
//==========================================================================

// CORRECCIÓN 1: Verificar que el botón existe antes de agregar el listener
if (botonBorrarHistorial) {
    botonBorrarHistorial.addEventListener("click", () => {
        const modal = document.getElementById("custom-modal");
        if (modal) {
            modal.classList.remove("modal-hidden"); // Quitamos la clase que lo esconde 
        }
    });
}

// Lógica del botón "Confirmar" dentro del Modal
const modalConfirmar = document.getElementById("modal-confirmar");
if (modalConfirmar) {
    modalConfirmar.addEventListener("click", () =>{
        localStorage.removeItem("historialGastos") // Borramos datos
        renderizarHistorial(); // Actualizamos tabla
        const modal = document.getElementById("custom-modal");
        if (modal) {
            modal.classList.add("modal-hidden");// Cerramos modal
        }
        mostrarNotificacion("Todo el historial ha sido borrado", "success");
    });
}

//Lógica del botón "Cancelar" dentro del Modal

document.getElementById("modal-cancelar").addEventListener("click", () => {
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
    // CORRECCIÓN 2: Mover totalElem al inicio de la función
    const totalElem = document.getElementById("total-gastado");
    
    // 1. Traemos los datos y los convertimos de texto a Lista (Array)
    const historial = JSON.parse(localStorage.getItem("historialGastos")) || [];

    // 2. Si no hay nada, mostramos el mensaje por defecto
    if (historial.length === 0) {
        cuerpoHistorial.innerHTML = `<tr><td colspan="3" style="text-align: center;">Aún no hay registros.</td></tr>`;
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
// SECTOR 3.5: Función para guardar en Base de Datos
// ================================================
async function guardarGastoEnBaseDeDatos(descripcion, valor) {
    try {
        const datosGasto = {
            tipo: "Gasto General",
            nombre: descripcion,
            valor: parseFloat(valor),
            prioridad: "Media",
            fecha: fechaGastoReal.value || new Date().toISOString().split('T')[0]
        };

        const respuesta = await fetch(`${API_URL}/guardar-gasto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosGasto)
        });

        if (respuesta.ok) {
            console.log("✅ Gasto guardado en la base de datos");
        } else {
            console.warn(`⚠️ Backend respondió con error ${respuesta.status}. Gasto guardado solo en localStorage.`);
        }
    } catch (error) {
        console.warn("⚠️ No se pudo conectar con el backend. Gasto guardado solo en localStorage.");
    }
}

async function guardarIngresoEnBaseDeDatos(monto, clases, descripcion) {
    try {
        const datosIngreso = {
            tipo: "Ingreso Quincenal",
            monto: parseFloat(monto),
            clases: parseInt(clases),
            descripcion: descripcion || "Ingreso de clases"
        };

        const respuesta = await fetch(`${API_URL}/guardar-ingreso`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosIngreso)
        });

        if (respuesta.ok) {
            console.log("✅ Ingreso guardado en la base de datos");
        } else {
            console.warn(`⚠️ Backend respondió con error ${respuesta.status}.`);
        }
    } catch (error) {
        console.warn("⚠️ No se pudo conectar con el backend para guardar el ingreso.");
    }
}

// ================================================
// SECTOR 3.6: Funcionalidad de Notificaciones
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
// SECTOR 4: Conexión y Guardado
// ================================================
document.addEventListener("DOMContentLoaded", () => {
    //Traer todo de la base de datos al arrancar
    cargarHistorial();
    obtenerSaldoGlobal();
});

// ================================================
// SECTOR 5: Carga de Historial Corregida
// ================================================
async function cargarHistorial() {
    const cuerpoTabla = document.getElementById("cuerpo-historial");
    const totalElem = document.getElementById("total-gastos");

    if (!cuerpoTabla) return;

    try {
        const respuesta = await fetch(`${API_URL}/obtener-gastos`);
        
        // Verificar si la respuesta es exitosa
        if (!respuesta.ok) {
            console.warn(`Backend no disponible (${respuesta.status}). Usando solo localStorage.`);
            return;
        }

        // Verificar que la respuesta sea JSON
        const contentType = respuesta.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.warn("Backend no devolvió JSON. Usando solo localStorage.");
            return;
        }

        const gastos = await respuesta.json();

        cuerpoTabla.innerHTML = "";
        let sumaTotal = 0;

        gastos.forEach(gasto => {
            sumaTotal += parseFloat(gasto.valor);
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${gasto.fecha}</td>
                <td>${gasto.nombre}</td>
                <td>${parseFloat(gasto.valor).toLocaleString()}</td>
                <td><span class="badge ${gasto.prioridad.toLowerCase()}">${gasto.prioridad}</span></td>
            `;
            cuerpoTabla.appendChild(fila);
        });

        if (totalElem) {
            totalElem.textContent = sumaTotal.toLocaleString();
        }

    } catch (error) {
        console.warn("No se pudo conectar con el backend:", error.message);
        console.log("La aplicación funcionará con localStorage solamente.");
    }
}
// ================================================
// SECTOR 6: Sincronización de Saldo Real 
// ================================================
async function obtenerSaldoGlobal() {
    try{
        const res = await fetch(`${API_URL}/calcular-saldo`);
        // Si no es 200 OK, no intentamos leer el JSON
        if(!res.ok){
            console.warn("EL endpoint /calcular-saldo aún no esta disponible en el servidor.");
            return;
        }
        const data = await res.json();

        if (data.status === "success"){
            // Actualizamos los displays con la info real de MySQL
            displaySueldo.textContent = data.saldo.toLocaleString('es-CO');
            // Calculamos el ahorro basado en el total de ingresos de la DB
            const ahorroCalculado = data.total_ingresos*0.10;
            displayAhorro.textContent = ahorroCalculado.toLocaleString('es-CO');
           
            console.log("Pantalla actualizada");
        }
    } catch (e){
        console.error("Error al sincronizar saldo.", e);
    }
}
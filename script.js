// ================================================
// SECTOR 0: Configuración de API
// ================================================

// URL de tu backend en Railway
const API_URL = "https://gestiong-production.up.railway.app";
const fetchConfig = { credentials: 'include' };


// ================================================
// SECTOR 0.1: Funciones de sesión
// ================================================

// Mostrar usuario logueado
const userLogueado = localStorage.getItem('usuario_logueado');
if (userLogueado) {
    const displayElement = document.getElementById('nombre-usuario-display');
    if (userLogueado){
        displayElement.textContent = userLogueado;
    }
}

// Función para cerrar sesión
async function cerrarSesion() {
    try {
        await fetch(`${API_URL}/logout`,{
            method: 'POST',
            credentials: 'include'
        });
        localStorage.removeItem(usuario_logueado);
        window.location.href = 'index.html'
    }catch (error){
        console.error('Error al cerrar sesión:', error);
        // Igual redirigimos aunque falle el servidor
        localStorage.removeItem('usuario_logueado');
        window.location.href = 'index.html';
    }
}

// ================================================
// SECTOR 1: Referencias a elementos del DOM
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
// SECTOR 2: Funcionalidad de ingresos
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
// SECTOR 3: Funcionalidades
// ================================================
// ================================================
// SECTOR 3.1: Funcionalidad de gastos
// ================================================

botonCalcularGastos.addEventListener("click", async () => {
    // Extraemos los valores de los inputs
    const valorGasto = parseFloat(valorGastoReal.value) || 0;
    const vCompras = parseFloat(gastoCompras.value) || 0;
    const vAntojos = parseFloat(gastoAntojos.value) || 0;
    const vDeudaC = parseFloat(deudaCorto.value) || 0;
    const vDeudaL = parseFloat(deudaLargo.value) || 0;

    const fechaSeleccionada = fechaGastoReal.value || new Date().toISOString().split('T')[0];
    const descripcion = descGasto.value || "Gasto General";

    // Creamos una lista de lo que tenga valor mayor a 0 para enviarlo a la DB
    const gastoAProcesar = [];

    if(valorGasto > 0) gastoAProcesar.push({ nombre: descripcion, valor: valorGasto});
    if (vCompras > 0) gastoAProcesar.push({ nombre: "Mercado/Día a día", valor:vCompras});
    if (vAntojos > 0) gastoAProcesar.push({ nombre: "Antojos y salidad", valor:vAntojos});
    if (vDeudaC > 0) gastoAProcesar.push({ nombre: "Deuda corto plazo", valor:vDeudaC});
    if (vDeudaL > 0) gastoAProcesar.push({ nombre: "Deuda largo plazo", valor:vDeudaL});

    // Si falta algún dato o el valor es 0, detenemos el proceso con un aviso
    if (gastoAProcesar.length === 0){
        mostrarNotificacion("Porfavor, completa todos los campos", "error");
        return
    }

    //Enviamos cada gasto detectado a la base de datos
    for (const gasto of gastoAProcesar){
        await guardarGastoEnBaseDeDatos(gasto.nombre, gasto.valor, fechaSeleccionada);
    }
    // Resaltamos el sueldo en rojo brevemente para confirmar el descuento
    displaySueldo.style.color = "#dc3545"; 

    setTimeout(() => { displaySueldo.style.color = "";}, 500);

    await obtenerSaldoGlobal();
    await cargarHistorial();
    // --- Limpieza de inputs ---
    [valorGastoReal, fechaGastoReal, descGasto, gastoCompras, gastoAntojos, deudaCorto, deudaLargo].forEach(input => {
        if(input) input.value="";
    });
    mostrarNotificacion("Gasto registrado con éxito", "success");
});


//==========================================================================
// SECTOR 3.2: Funcionalidad de historial y modal
//==========================================================================

// Verificar que el botón existe antes de agregar el listener
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

    // Convertimos la lista a texto y la guardamos
    localStorage.setItem("historialGastos", JSON.stringify(historial));
    
    // Actualizamos lo que se ve en pantalla
    renderizarHistorial();
}

function renderizarHistorial() {
    // Mover totalElem al inicio de la función
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
// SECTOR 3.2: Funcionalidad de Exportación
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
// SECTOR 3.3: Función para guardar en Base de Datos
// ================================================
async function guardarGastoEnBaseDeDatos(descripcion, valor, fechaManual) {
    try {
        const datosGasto = {
            tipo: "Gasto General",
            nombre: descripcion,
            valor: parseFloat(valor),
            prioridad: "Media",
            fecha: fechaManual
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
// SECTOR 3.4: Funcionalidad de Notificaciones
// ================================================
function mostrarNotificacion(mensaje, tipo = "success") {
    // Buscamos los elementos del modal de notificación
    const modal = document.getElementById("modal-notificacion");
    const texto = document.getElementById("mensaje-notificacion-modal");
    const icono = document.getElementById("icono-notificacion");
    const btnCerrar = document.getElementById("btn-cerrar-notif");
    
    // Por si el modal deja de funcionar usamos un alert para no romper la app
    if (!modal || !texto) {
        console.warn("No se encontraron los elementos de notificación, usando alert.");
        alert(mensaje);
        return;
    }

    texto.textContent = mensaje;
    
    // Personalizamos el icono según el tipo
    if(tipo === "success"){
        icono.textContent="✅";
        icono.style.color="#28a745";
    }else if(tipo === "error"){
        icono.textContent="⚠️";
        icono.style.color="#dc3545";
    }else{
        icono.textContent="ℹ️";
        icono.style.color="#007bff";
    }

    // Mostramos el modal
    modal.classList.remove("modal-hidden");

    // Funcionamiento boton cerrar
    if(btnCerrar){
        btnCerrar.onclick = () => {
            modal.classList.add("modal-hidden");
        }
    }

    // Cerrar automaticamente a los 5 segundos si el usuario no hace nada
    setTimeout(() => {
        modal.classList.add("modal-hidden");
    }, 5000);
}

// ================================================
// SECTOR 3.5: Funcionalidad borrar gasto (individual)
// ================================================

async function confirmarEliminar(id) {
    const modal = document.getElementById("modal-confirmar-eliminar");
    const btnSi = document.getElementById("btn-si-eliminar");
    const btnNo = document.getElementById("btn-no-eliminar");

    if(!modal || !btnSi || !btnNo) return;

    // Mostramos el modal
    modal.classList.remove("modal-hidden");

    //Limpiamos el evento anterior para que no se duplique
    btnSi.onclick = null;
    // Si hace clic en "Sí"
    btnSi.onclick = async() => {
        try{
            modal.classList.add("modal-hidden");

            const res = await fetch(`${API_URL}/eliminar-gasto/${id}`,{method: 'DELETE'});
            if (res.ok){
                mostrarNotificacion("Gasto eliminado", "success");
                await cargarHistorial(); // Recargamos la tabla
                await obtenerSaldoGlobal(); //Actualizamos el saldo
            }else{
                mostrarNotificacion("El servidor no pudo borrar el gasto", "error");
            }
        }catch (error){
            console.error("Error al eliminar:", error);
            mostrarNotificacion("Error de conexión con el servidor", "error");
        }
    };

    // Si hace clic en "No" o "Cancelar" 
    btnNo.onclick = () => {
        modal.classList.add("modal-hidden");
    };
}

// ================================================
// SECTOR 3.6: Funcionalidad grafico 
// ================================================

let miGrafico;

function actualizarGrafico(gastos){
    const canvas = document.getElementById('graficoGastos');
    if(!canvas || !gastos || gastos.length === 0) return;
    const ctx = canvas.getContext('2d')

    // Agrupar por nombre
    const resumen = {};
    gastos.forEach(g => {
        resumen[g.nombre] = (resumen[g.nombre] || 0) + parseFloat(g.valor);
    });

    const etiquetas = Object.keys(resumen);
    const valores = Object.values(resumen);

    const coloresDinamicos = etiquetas.map(nombre => {
        const n = nombre.toLowerCase();
        if(n.includes("deuda") || n.includes("celular")) return '#8B0000';
        if(n.includes("antojo")) return '#FFC107';
        if(n.includes("mercado")) return '#28A745';
        return '#007bff';
    });
    if(miGrafico){
        miGrafico.destroy();
    }

    miGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: etiquetas,
            datasets: [{
                data: valores,
                backgroundColor: coloresDinamicos,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels:{
                        boxWidth: 12,
                        font: { size:11 }
                    }
                },
                // Configuración para ver los montos al pasar el mouse
                tooltip:{
                    callbacks:{
                        label: function(context){
                            let label = context.label || '';
                            let value = context.raw || 0;
                            return `${label}: $${value.toLocaleString('es-CO')}`;
                        }
                    }
                }
            },
            cutout: '60%' // Hace que el centro sea más grande (estilo anillo)
        }
    });
}
// ================================================
// SECTOR 4: Conexión y Guardado
// ================================================
document.addEventListener("DOMContentLoaded", async () => {
    // Verificar si hay usuario logueado
    const usuarioLogueado = localStorage.getItem('usuario_logueado');

    if (!usuarioLogueado){
        console.warn("No hay usuario logueado");
        return;
    }

    // Trar todo de la base de datos al arrancar
    await cargarHistorial();
    await obtenerSaldoGlobal();
});

// ================================================
// SECTOR 5: Carga de Historial
// ================================================
async function cargarHistorial() {
    const cuerpoTabla = document.getElementById("cuerpo-historial");
    const totalElem = document.getElementById("total-gastado");

    if (!cuerpoTabla) return;

    try {
        const respuesta = await fetch(`${API_URL}/obtener-gastos`);
        
        // Verificar si la respuesta es exitosa
        if (!respuesta.ok) {
            console.warn(`Backend no disponible (${respuesta.status}). Usando solo localStorage.`);
            renderizarHistorial();
            return;
        }

        // Verificar que la respuesta sea JSON
        const contentType = respuesta.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.warn("Backend no devolvió JSON. Usando solo localStorage.");
            return;
        }

        const gastos = await respuesta.json();

        actualizarGrafico(gastos);

        cuerpoTabla.innerHTML = "";
        let sumaTotal = 0;

        gastos.forEach(gasto => {
            // Sumamos el valor de cada gasto traído de la base de datos
            const valorNumerico = parseFloat(gasto.valor) || 0;
            sumaTotal += valorNumerico;

            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${gasto.fecha}</td>
                <td>${gasto.nombre}</td>
                <td style="color: #dc3545; font-weight: bold">${parseFloat(gasto.valor).toLocaleString()}</td>
                <td><span class="badge ${gasto.prioridad.toLowerCase()}">${gasto.prioridad}</span></td>
                <td>
                    <button class="btn-eliminar" onclick="confirmarEliminar(${gasto.id})">
                        🗑️
                    </button>
                </td>    
            `;
            cuerpoTabla.appendChild(fila);
        });
        // ACTUALIZACIÓN DEL TOTAL:
        if (totalElem) {
            // Formateamos el total con signo de pesos y puntos de miles
            totalElem.textContent = "$" + sumaTotal.toLocaleString('es-CO');
            console.log("Suma total actualizada: ", sumaTotal);
        }

    } catch (error) {
        console.warn("No se pudo conectar con el backend:", error.message);
        console.log("La aplicación funcionará con localStorage solamente.");
        renderizarHistorial();
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

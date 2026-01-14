// ================================================
// SCRIPT.JS - VERSIÓN CORREGIDA PARA SUPABASE
// ================================================

// URL de tu backend en Render
const API_URL = "https://gestiong-backend.onrender.com";

// ================================================
// SECTOR 0.1: Funciones de sesión
// ================================================

// Mostrar usuario logueado
const token = localStorage.getItem('usuario_logueado');
if (token) { 
    const displayElement = document.getElementById('nombre-usuario-display');
    if (displayElement) {
        displayElement.textContent = token;
    }
}

// Función para cerrar sesión
async function cerrarSesion() {
    try {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });
        localStorage.removeItem('usuario_logueado');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        localStorage.removeItem('usuario_logueado');
        window.location.href = 'index.html';
    }
}

// ================================================
// SECTOR 1: Referencias a elementos del DOM
// ================================================

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

// Sección del historial
const contenedorHistorial = document.getElementById("contenedor-historial");
const botonBorrarHistorial = document.getElementById("botonBorrarHistorial");

// ================================================
// SECTOR 2: Funcionalidad de ingresos (CORREGIDO)
// ================================================

if (botonGuardar) {
    botonGuardar.addEventListener("click", async () => {
        // Verificar sesión
        const usuario = localStorage.getItem('usuario_logueado');
        if (!usuario) {
            mostrarNotificacion("Debes iniciar sesión primero", "error");
            return;
        }

        // Obtener valores
        const sueldoTotal = parseFloat(inputCop.value) || 0;
        const clases = parseInt(inputClases.value) || 0;
        const descripcionIngreso = document.getElementById("desc-ingreso")?.value || "";

        // Validación básica
        if (clases === 0) {
            mostrarNotificacion("Pon al menos 1 clase para calcular", "error");
            return;
        }

        if (sueldoTotal <= 0) {
            mostrarNotificacion("Ingresa un sueldo válido", "error");
            return;
        }

        // Cálculos
        const ahorro = sueldoTotal * 0.10;
        const pagoPorClase = sueldoTotal / clases;

        // Actualizar pantalla
        displaySueldo.textContent = sueldoTotal.toLocaleString('es-CO');
        displayAhorro.textContent = ahorro.toLocaleString('es-CO');
        displayValorClase.textContent = Math.round(pagoPorClase).toLocaleString('es-CO');

        try {
            // Guardar en base de datos
            await guardarIngresoEnBaseDeDatos(sueldoTotal, clases, descripcionIngreso);
            
            // Sincronizar saldo
            await obtenerSaldoGlobal();
            
            // Limpiar campos
            inputCop.value = "";
            inputClases.value = "";
            const descInput = document.getElementById("desc-ingreso");
            if (descInput) descInput.value = "";
            
            mostrarNotificacion("✅ Ingreso registrado con éxito", "success");
        } catch (error) {
            console.error("Error al guardar ingreso:", error);
            mostrarNotificacion("⚠️ Ingreso guardado localmente (error de conexión)", "error");
        }
    });
}

// ================================================
// SECTOR 3.1: Funcionalidad de gastos (CORREGIDO)
// ================================================

if (botonCalcularGastos) {
    botonCalcularGastos.addEventListener("click", async () => {
        // Verificar sesión
        const usuario = localStorage.getItem('usuario_logueado');
        if (!usuario) {
            mostrarNotificacion("Debes iniciar sesión primero", "error");
            return;
        }

        // Extraer valores
        const valorGasto = parseFloat(valorGastoReal.value) || 0;
        const vCompras = parseFloat(gastoCompras.value) || 0;
        const vAntojos = parseFloat(gastoAntojos.value) || 0;
        const vDeudaC = parseFloat(deudaCorto.value) || 0;
        const vDeudaL = parseFloat(deudaLargo.value) || 0;

        const fechaSeleccionada = fechaGastoReal.value || new Date().toISOString().split('T')[0];
        const descripcion = descGasto.value || "Gasto General";

        // Crear lista de gastos a procesar
        const gastoAProcesar = [];

        if (valorGasto > 0) gastoAProcesar.push({ nombre: descripcion, valor: valorGasto });
        if (vCompras > 0) gastoAProcesar.push({ nombre: "Mercado/Día a día", valor: vCompras });
        if (vAntojos > 0) gastoAProcesar.push({ nombre: "Antojos y salidas", valor: vAntojos });
        if (vDeudaC > 0) gastoAProcesar.push({ nombre: "Deuda corto plazo", valor: vDeudaC });
        if (vDeudaL > 0) gastoAProcesar.push({ nombre: "Deuda largo plazo", valor: vDeudaL });

        // Validar
        if (gastoAProcesar.length === 0) {
            mostrarNotificacion("Por favor, ingresa al menos un gasto", "error");
            return;
        }

        try {
            // Enviar cada gasto a la base de datos
            for (const gasto of gastoAProcesar) {
                await guardarGastoEnBaseDeDatos(gasto.nombre, gasto.valor, fechaSeleccionada);
            }

            // Efecto visual
            displaySueldo.style.color = "#dc3545";
            setTimeout(() => { displaySueldo.style.color = ""; }, 500);

            // Actualizar datos
            await obtenerSaldoGlobal();
            await cargarHistorial();

            // Limpiar inputs
            [valorGastoReal, fechaGastoReal, descGasto, gastoCompras, gastoAntojos, deudaCorto, deudaLargo].forEach(input => {
                if (input) input.value = "";
            });

            mostrarNotificacion("✅ Gastos registrados con éxito", "success");
        } catch (error) {
            console.error("Error al guardar gastos:", error);
            mostrarNotificacion("⚠️ Gastos guardados localmente (error de conexión)", "error");
        }
    });
}

// ================================================
// SECTOR 3.3: Funciones para guardar en Base de Datos (CORREGIDAS)
// ================================================

async function guardarGastoEnBaseDeDatos(descripcion, valor, fechaManual) {
    try {
        const datosGasto = {
            nombre: descripcion,
            valor: parseFloat(valor),
            prioridad: "Media",
            fecha: fechaManual
        };

        const respuesta = await fetch(`${API_URL}/guardar-gasto`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(datosGasto),
            credentials: 'include'
        });

        if (!respuesta.ok) {
            const errorText = await respuesta.text();
            console.warn(`⚠️ Error al guardar gasto (${respuesta.status}):`, errorText);
            return false;
        }

        console.log("✅ Gasto guardado en la base de datos");
        return true;
    } catch (error) {
        console.warn("⚠️ No se pudo conectar con el backend:", error.message);
        return false;
    }
}

async function guardarIngresoEnBaseDeDatos(monto, clases, descripcion) {
    try {
        const datosIngreso = {
            monto: parseFloat(monto),
            clases: parseInt(clases),
            descripcion: descripcion || "Ingreso de clases"
        };

        const respuesta = await fetch(`${API_URL}/guardar-ingreso`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(datosIngreso),
            credentials: 'include'
        });

        if (!respuesta.ok) {
            const errorText = await respuesta.text();
            console.warn(`⚠️ Error al guardar ingreso (${respuesta.status}):`, errorText);
            return false;
        }

        console.log("✅ Ingreso guardado en la base de datos");
        return true;
    } catch (error) {
        console.warn("⚠️ No se pudo conectar con el backend:", error.message);
        return false;
    }
}

// ================================================
// SECTOR 3.4: Funcionalidad de Notificaciones
// ================================================

function mostrarNotificacion(mensaje, tipo = "success") {
    const modal = document.getElementById("modal-notificacion");
    const texto = document.getElementById("mensaje-notificacion-modal");
    const icono = document.getElementById("icono-notificacion");
    const btnCerrar = document.getElementById("btn-cerrar-notif");
    
    if (!modal || !texto) {
        console.warn("No se encontraron elementos de notificación, usando alert.");
        alert(mensaje);
        return;
    }

    texto.textContent = mensaje;
    
    if (tipo === "success") {
        icono.textContent = "✅";
        icono.style.color = "#28a745";
    } else if (tipo === "error") {
        icono.textContent = "⚠️";
        icono.style.color = "#dc3545";
    } else {
        icono.textContent = "ℹ️";
        icono.style.color = "#007bff";
    }

    modal.classList.remove("modal-hidden");

    if (btnCerrar) {
        btnCerrar.onclick = () => {
            modal.classList.add("modal-hidden");
        };
    }

    setTimeout(() => {
        if (!modal.classList.contains("modal-hidden")) {
            modal.classList.add("modal-hidden");
        }
    }, 5000);
}

// ================================================
// SECTOR 3.5: Funcionalidad borrar gasto (individual)
// ================================================

async function confirmarEliminar(id) {
    const modal = document.getElementById("modal-confirmar-eliminar");
    const btnSi = document.getElementById("btn-si-eliminar");
    const btnNo = document.getElementById("btn-no-eliminar");

    if (!modal || !btnSi || !btnNo) return;

    modal.classList.remove("modal-hidden");

    // Limpiar evento anterior
    const handler = async () => {
        try {
            modal.classList.add("modal-hidden");

            const res = await fetch(`${API_URL}/eliminar-gasto/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (res.ok) {
                mostrarNotificacion("✅ Gasto eliminado", "success");
                await cargarHistorial();
                await obtenerSaldoGlobal();
            } else {
                const errorData = await res.json();
                mostrarNotificacion("❌ Error: " + (errorData.mensaje || "No se pudo borrar"), "error");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarNotificacion("❌ Error de conexión", "error");
        }
    };

    btnSi.onclick = handler;
    btnNo.onclick = () => {
        modal.classList.add("modal-hidden");
    };
}

// ================================================
// SECTOR 5: Carga de Historial (CORREGIDO)
// ================================================

async function cargarHistorial() {
    const cuerpoTabla = document.getElementById("cuerpo-historial");
    const totalElem = document.getElementById("total-gastado");

    if (!cuerpoTabla) {
        console.warn("No se encontró cuerpoHistorial");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/obtener-gastos`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!respuesta.ok) {
            console.warn(`Backend no disponible (${respuesta.status}). Mostrando vacío.`);
            cuerpoTabla.innerHTML = `<tr><td colspan="5" style="text-align: center;">No se pudo cargar el historial</td></tr>`;
            if (totalElem) totalElem.textContent = "$0";
            return;
        }

        const gastos = await respuesta.json();
        
        // Verificar si es un array
        if (!Array.isArray(gastos)) {
            console.warn("Respuesta no es un array:", gastos);
            cuerpoTabla.innerHTML = `<tr><td colspan="5" style="text-align: center;">Formato de datos incorrecto</td></tr>`;
            return;
        }

        // Actualizar gráfico si hay datos
        if (gastos.length > 0) {
            actualizarGrafico(gastos);
        }

        // Limpiar tabla
        cuerpoTabla.innerHTML = "";
        let sumaTotal = 0;

        // Llenar tabla
        gastos.forEach(gasto => {
            const valorNumerico = parseFloat(gasto.valor) || 0;
            sumaTotal += valorNumerico;

            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${gasto.fecha || 'Sin fecha'}</td>
                <td>${gasto.nombre || 'Sin nombre'}</td>
                <td style="color: #dc3545; font-weight: bold">$${valorNumerico.toLocaleString('es-CO')}</td>
                <td><span class="badge ${(gasto.prioridad || 'Media').toLowerCase()}">${gasto.prioridad || 'Media'}</span></td>
                <td>
                    <button class="btn-eliminar" onclick="confirmarEliminar(${gasto.id})">
                        🗑️
                    </button>
                </td>    
            `;
            cuerpoTabla.appendChild(fila);
        });

        // Mostrar mensaje si no hay datos
        if (gastos.length === 0) {
            cuerpoTabla.innerHTML = `<tr><td colspan="5" style="text-align: center;">No hay gastos registrados</td></tr>`;
        }

        // Actualizar total
        if (totalElem) {
            totalElem.textContent = "$" + sumaTotal.toLocaleString('es-CO');
        }

    } catch (error) {
        console.warn("No se pudo conectar con el backend:", error.message);
        cuerpoTabla.innerHTML = `<tr><td colspan="5" style="text-align: center;">Error de conexión</td></tr>`;
        if (totalElem) totalElem.textContent = "$0";
    }
}

// ================================================
// SECTOR 6: Sincronización de Saldo Real (CORREGIDO)
// ================================================

async function obtenerSaldoGlobal() {
    try {
        const res = await fetch(`${API_URL}/calcular-saldo`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!res.ok) {
            console.warn("El endpoint /calcular-saldo no está disponible:", res.status);
            return;
        }

        const data = await res.json();

        if (data.status === "success") {
            // Actualizar displays
            displaySueldo.textContent = data.saldo.toLocaleString('es-CO');
            
            // Calcular ahorro (10% del total de ingresos)
            const ahorroCalculado = (data.total_ingresos || 0) * 0.10;
            displayAhorro.textContent = ahorroCalculado.toLocaleString('es-CO');
            
            // Actualizar valor por clase si hay datos
            if (displayValorClase && data.total_ingresos > 0) {
                // Esto es un ejemplo, ajusta según tu lógica
                displayValorClase.textContent = Math.round(data.total_ingresos / 20).toLocaleString('es-CO');
            }
        }
    } catch (e) {
        console.error("Error al sincronizar saldo:", e);
    }
}

// ================================================
// SECTOR 3.6: Funcionalidad gráfico 
// ================================================

let miGrafico = null;

function actualizarGrafico(gastos) {
    const canvas = document.getElementById('graficoGastos');
    if (!canvas || !gastos || gastos.length === 0) {
        // Ocultar gráfico si no hay datos
        if (canvas) canvas.style.display = 'none';
        return;
    }
    
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');

    // Agrupar por nombre
    const resumen = {};
    gastos.forEach(g => {
        const nombre = g.nombre || 'Sin nombre';
        resumen[nombre] = (resumen[nombre] || 0) + parseFloat(g.valor || 0);
    });

    const etiquetas = Object.keys(resumen);
    const valores = Object.values(resumen);

    // Colores dinámicos
    const coloresDinamicos = etiquetas.map(nombre => {
        const n = nombre.toLowerCase();
        if (n.includes("deuda") || n.includes("celular")) return '#8B0000';
        if (n.includes("antojo")) return '#FFC107';
        if (n.includes("mercado")) return '#28A745';
        if (n.includes("salida")) return '#17A2B8';
        return '#007bff';
    });

    // Destruir gráfico anterior si existe
    if (miGrafico) {
        miGrafico.destroy();
    }

    // Crear nuevo gráfico
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
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw || 0;
                            return `${label}: $${value.toLocaleString('es-CO')}`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

// ================================================
// SECTOR 4: Inicialización al cargar la página
// ================================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("📱 DOM cargado, inicializando aplicación...");
    
    // Verificar sesión
    const usuarioLogueado = localStorage.getItem('usuario_logueado');
    if (!usuarioLogueado) {
        console.warn("No hay usuario logueado, redirigiendo...");
        // window.location.href = 'index.html'; // Descomenta si quieres redirigir automáticamente
        return;
    }

    console.log("Usuario logueado:", usuarioLogueado);

    // Configurar botones modales
    const modalConfirmar = document.getElementById("modal-confirmar");
    const modalCancelar = document.getElementById("modal-cancelar");
    const modalBorrar = document.getElementById("custom-modal");

    if (modalConfirmar && modalCancelar && modalBorrar) {
        modalConfirmar.addEventListener("click", async () => {
            try {
                const respuesta = await fetch(`${API_URL}/eliminar-historial`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                
                const resultado = await respuesta.json();
                
                if (resultado.status === 'success') {
                    modalBorrar.classList.add("modal-hidden");
                    mostrarNotificacion("✅ Historial borrado exitosamente", "success");
                    await cargarHistorial();
                    await obtenerSaldoGlobal();
                } else {
                    mostrarNotificacion("❌ Error: " + resultado.mensaje, "error");
                }
            } catch (error) {
                console.error("Error al borrar historial:", error);
                mostrarNotificacion("❌ Error de conexión", "error");
            }
        });

        modalCancelar.addEventListener("click", () => {
            modalBorrar.classList.add("modal-hidden");
        });
    }

    if (botonBorrarHistorial) {
        botonBorrarHistorial.addEventListener("click", () => {
            if (modalBorrar) {
                modalBorrar.classList.remove("modal-hidden");
            }
        });
    }

    // Configurar botón exportar
    const botonExportar = document.getElementById("boton-exportar");
    if (botonExportar) {
        botonExportar.addEventListener("click", exportarHistorial);
    }

    // Cargar datos iniciales
    try {
        await Promise.all([
            cargarHistorial(),
            obtenerSaldoGlobal()
        ]);
        console.log("✅ Datos iniciales cargados");
    } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
    }
});

// ================================================
// FUNCIÓN DE EXPORTACIÓN
// ================================================

function exportarHistorial() {
    try {
        // Intenta obtener datos del servidor primero
        fetch(`${API_URL}/obtener-gastos`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        })
        .then(res => res.ok ? res.json() : [])
        .then(gastos => {
            if (!Array.isArray(gastos) || gastos.length === 0) {
                alert("No hay datos para exportar.");
                return;
            }

            // Crear contenido CSV
            let contenido = "Fecha;Descripción;Monto;Prioridad\n";
            
            gastos.forEach(gasto => {
                contenido += `${gasto.fecha || ''};${gasto.nombre || ''};${gasto.valor || 0};${gasto.prioridad || 'Media'}\n`;
            });

            // Crear y descargar archivo
            const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `historial_gastos_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            mostrarNotificacion("✅ Historial exportado como CSV", "success");
        })
        .catch(error => {
            console.error("Error al exportar:", error);
            alert("Error al exportar datos.");
        });
    } catch (error) {
        console.error("Error en exportación:", error);
        alert("Error al exportar.");
    }
}
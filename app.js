// Pantalla de la aplicación: formulario, vista previa, libro y ajustes.
"use strict";

const $ = (id) => document.getElementById(id);

// --- Memoria del navegador (solo en este móvil) ------------------------------

function cargar(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : porDefecto;
  } catch (e) {
    return porDefecto;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) { /* sin memoria disponible: se sigue funcionando */ }
}

const ajustes = Object.assign({ pagina: "6x9", encabezado: "Soluciones" }, cargar("sopas-ajustes", {}));
if (!TAMANOS_PAGINA[ajustes.pagina]) ajustes.pagina = "6x9";
let libro = cargar("sopas-libro", []);       // [{ titulo, sopa }]
let actual = null;                            // { titulo, palabras, invertidas, sopa }
let vista = "sopa";

// --- Utilidades ---------------------------------------------------------------

function mostrarMensaje(texto, esError) {
  $("mensaje").textContent = texto;
  $("mensaje").className = esError ? "error" : "";
}

function numerado(numero, titulo) {
  return `${numero}. ${titulo}`;
}

function paginasLibro(cantidad) {
  return cantidad + Math.ceil(cantidad / SOLUCIONES_POR_PAGINA);
}

function nombreArchivo(texto) {
  return texto.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "sopa de letras";
}

function descargar(bytes, nombre) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Crea y descarga un PDF. Devuelve los avisos del diseño.
async function descargarPdf(sopas, nombre, boton) {
  const textoBoton = boton.textContent;
  boton.disabled = true;
  boton.textContent = "Creando PDF…";
  try {
    const diseno = disenarLibro(sopas, ajustes.pagina, ajustes.encabezado.trim());
    const bytes = await crearPdf(diseno.paginas, diseno.ancho, diseno.alto);
    descargar(bytes, nombre);
    return diseno.avisos;
  } catch (e) {
    alert("No se pudo crear el PDF: " + e.message);
    return [];
  } finally {
    boton.disabled = false;
    boton.textContent = textoBoton;
  }
}

function pintarAvisos(contenedor, avisos) {
  contenedor.innerHTML = "";
  for (const aviso of avisos) {
    const p = document.createElement("p");
    p.textContent = "⚠ " + aviso;
    contenedor.appendChild(p);
  }
}

// --- Formulario --------------------------------------------------------------

function analizarPalabras() {
  return prepararPalabras(separarPalabras($("palabras").value));
}

function actualizarContador() {
  const { palabras, errores, repetidas } = analizarPalabras();
  const lineas = [];
  const n = palabras.length;
  if (n === PALABRAS_POR_SOPA) lineas.push(["bien", `✓ ${n} palabras válidas`]);
  else if (n > PALABRAS_POR_SOPA) lineas.push(["mal", `Hay ${n} palabras válidas: sobran ${n - PALABRAS_POR_SOPA}.`]);
  else if (n > 0 || errores.length) lineas.push(["", `Llevas ${n} de ${PALABRAS_POR_SOPA} palabras válidas.`]);
  for (const error of errores) lineas.push(["mal", error]);
  for (const r of repetidas) lineas.push(["", `"${r}" está repetida y no se cuenta.`]);

  const contador = $("contador");
  contador.innerHTML = "";
  for (const [clase, texto] of lineas) {
    const div = document.createElement("div");
    div.className = clase;
    div.textContent = texto;
    contador.appendChild(div);
  }
  guardar("sopas-borrador", { titulo: $("titulo").value, palabras: $("palabras").value });
}

function generar() {
  const titulo = $("titulo").value.trim().replace(/\s+/g, " ");
  const { palabras, errores } = analizarPalabras();
  if (!titulo) return mostrarMensaje("Escribe un título.", true);
  if (errores.length) return mostrarMensaje("Corrige las palabras marcadas en rojo.", true);
  if (palabras.length !== PALABRAS_POR_SOPA) {
    return mostrarMensaje(`Hacen falta exactamente ${PALABRAS_POR_SOPA} palabras válidas (ahora hay ${palabras.length}).`, true);
  }
  const invertidas = $("invertidas").checked;
  const sopa = crearSopa(palabras, invertidas);
  if (!sopa) return mostrarMensaje("No he podido colocar todas las palabras. Prueba con alguna más corta.", true);
  mostrarMensaje("");
  actual = { titulo, palabras, invertidas, sopa };
  vista = "sopa";
  pintarVista();
  $("vista").hidden = false;
  $("vista").scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Vista previa --------------------------------------------------------------

function pintarVista() {
  if (!actual) return;
  const numero = libro.length + 1;
  $("tituloVista").textContent = `Vista previa (será la nº ${numero} del libro)`;
  const diseno = disenarLibro([{ titulo: numerado(numero, actual.titulo), sopa: actual.sopa }],
                              ajustes.pagina, ajustes.encabezado.trim());
  const pagina = vista === "sopa" ? diseno.paginas[0] : diseno.paginas[1];
  $("lienzo").innerHTML = svgPagina(pagina, diseno.ancho, diseno.alto);
  for (const b of document.querySelectorAll(".pestanas button")) {
    b.classList.toggle("activa", b.dataset.vista === vista);
  }
}

function otraColocacion() {
  const sopa = crearSopa(actual.palabras, actual.invertidas);
  if (sopa) actual.sopa = sopa;
  pintarVista();
}

function anadirAlLibro() {
  libro.push({ titulo: actual.titulo, sopa: actual.sopa });
  guardar("sopas-libro", libro);
  const numero = libro.length;
  actual = null;
  $("vista").hidden = true;
  $("titulo").value = "";
  $("palabras").value = "";
  actualizarContador();
  pintarLibro();
  mostrarMensaje(`Añadida al libro como sopa nº ${numero}. Puedes escribir la siguiente.`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function pdfDeEstaSopa() {
  const avisos = await descargarPdf([{ titulo: numerado(1, actual.titulo), sopa: actual.sopa }],
                                    nombreArchivo(actual.titulo) + ".pdf", $("btnPdfSopa"));
  if (avisos.length) alert(avisos.join("\n\n"));
}

// --- Libro ---------------------------------------------------------------------

function pintarLibro() {
  const lista = $("listaLibro");
  lista.innerHTML = "";
  libro.forEach((entrada, i) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = numerado(i + 1, entrada.titulo);
    const quitar = document.createElement("button");
    quitar.textContent = "Quitar";
    quitar.addEventListener("click", () => {
      if (!confirm(`¿Quitar "${numerado(i + 1, entrada.titulo)}" del libro? Las siguientes se renumeran.`)) return;
      libro.splice(i, 1);
      guardar("sopas-libro", libro);
      pintarLibro();
      pintarVista();
    });
    li.append(span, quitar);
    lista.appendChild(li);
  });

  const n = libro.length;
  $("resumenLibro").textContent = n === 0
    ? "Todavía no hay sopas. Genera una y pulsa «Añadir al libro»."
    : `${n} ${n === 1 ? "sopa" : "sopas"} · el PDF tendrá ${paginasLibro(n)} páginas.`;
  $("btnPdfLibro").disabled = n === 0;
  $("btnVaciar").disabled = n === 0;

  const avisos = [];
  if (n > 0 && paginasLibro(n) < 24) {
    avisos.push(`El libro tiene ${paginasLibro(n)} páginas y KDP pide al menos 24 (hacen falta 16 sopas).`);
  }
  pintarAvisos($("avisosLibro"), avisos);
}

async function pdfDelLibro() {
  const sopas = libro.map((e, i) => ({ titulo: numerado(i + 1, e.titulo), sopa: e.sopa }));
  const avisos = await descargarPdf(sopas, "Libro de sopas de letras.pdf", $("btnPdfLibro"));
  if (avisos.length) alert(avisos.join("\n\n"));
}

function vaciarLibro() {
  if (!confirm(`¿Seguro que quieres borrar las ${libro.length} sopas del libro? No se puede deshacer.`)) return;
  libro = [];
  guardar("sopas-libro", libro);
  pintarLibro();
  pintarVista();
}

// --- Ajustes -------------------------------------------------------------------

function pintarAvisoLetras() {
  const letras = estimarLetras(ajustes.pagina);
  const avisos = [];
  if (letras.sopa < LETRA_MINIMA_SOPA) avisos.push(textoAviso("la sopa", letras.sopa, LETRA_MINIMA_SOPA));
  if (letras.solucion < LETRA_MINIMA_SOLUCION) avisos.push(textoAviso("las soluciones", letras.solucion, LETRA_MINIMA_SOLUCION));
  pintarAvisos($("avisoLetras"), avisos);
}

function iniciarAjustes() {
  const select = $("pagina");
  for (const [clave, t] of Object.entries(TAMANOS_PAGINA)) select.add(new Option(t.nombre, clave));
  select.value = ajustes.pagina;
  select.addEventListener("change", () => {
    ajustes.pagina = select.value;
    guardar("sopas-ajustes", ajustes);
    pintarAvisoLetras();
    pintarVista();
  });
  $("encabezado").value = ajustes.encabezado;
  $("encabezado").addEventListener("input", () => {
    ajustes.encabezado = $("encabezado").value;
    guardar("sopas-ajustes", ajustes);
    pintarVista();
  });
}

// --- Arranque ------------------------------------------------------------------

function iniciar() {
  $("sinPrograma").hidden = true;
  const borrador = cargar("sopas-borrador", null);
  if (borrador) {
    $("titulo").value = borrador.titulo || "";
    $("palabras").value = borrador.palabras || "";
  }
  $("titulo").addEventListener("input", actualizarContador);
  $("palabras").addEventListener("input", actualizarContador);
  $("btnGenerar").addEventListener("click", generar);
  $("btnOtra").addEventListener("click", otraColocacion);
  $("btnAnadir").addEventListener("click", anadirAlLibro);
  $("btnPdfSopa").addEventListener("click", pdfDeEstaSopa);
  $("btnPdfLibro").addEventListener("click", pdfDelLibro);
  $("btnVaciar").addEventListener("click", vaciarLibro);
  for (const b of document.querySelectorAll(".pestanas button")) {
    b.addEventListener("click", () => { vista = b.dataset.vista; pintarVista(); });
  }
  iniciarAjustes();
  pintarAvisoLetras();
  actualizarContador();
  pintarLibro();

  $("btnGenerar").textContent = "Cargando…";
  cargarFuentes()
    .then(() => {
      $("btnGenerar").disabled = false;
      $("btnGenerar").textContent = "Generar sopa";
    })
    .catch((e) => {
      $("btnGenerar").textContent = "No disponible";
      const comoArchivo = location.protocol === "file:";
      mostrarMensaje(comoArchivo
        ? "La aplicación está abierta como archivo de la carpeta y así no puede funcionar. Ábrela desde su dirección web."
        : "Error al cargar la aplicación: " + e.message, true);
    });
}

iniciar();

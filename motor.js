// Motor de las sopas de letras: palabras, colocación, diseño de páginas y PDF.
// Todas las medidas van en puntos (72 por pulgada) y las coordenadas se miden
// desde la esquina SUPERIOR izquierda de la página (y crece hacia abajo).
"use strict";

const PULGADA = 72;
const CM = PULGADA / 2.54;

// La cuadrícula (y la lista de palabras) guardan siempre este margen con la caja de contenido.
const MARGEN_CUADRICULA = 1.5 * CM;
const LETRA_MINIMA_SOPA = 8;
const LETRA_MINIMA_SOLUCION = 5;

const TAMANOS_PAGINA = {
  "6x9":    { nombre: "6 x 9 pulgadas (el habitual en KDP)", ancho: 6 * PULGADA, alto: 9 * PULGADA },
  "8.5x11": { nombre: "8,5 x 11 pulgadas (carta, letra grande)", ancho: 8.5 * PULGADA, alto: 11 * PULGADA },
  "8x10":   { nombre: "8 x 10 pulgadas", ancho: 8 * PULGADA, alto: 10 * PULGADA },
  "7x10":   { nombre: "7 x 10 pulgadas", ancho: 7 * PULGADA, alto: 10 * PULGADA },
  "A4":     { nombre: "A4 (21 x 29,7 cm)", ancho: 595.28, alto: 841.89 },
};

const TAMANO_CUADRICULA = 13;   // todas las sopas son de 13 x 13
const PALABRAS_POR_SOPA = 12;   // cada sopa lleva exactamente 12 palabras
const COLUMNAS_LISTA = 3;       // lista de palabras: 3 columnas de 4 palabras
const SOLUCIONES_POR_PAGINA = 2;
const ESCALA_SOLUCION = 0.5;    // la cuadrícula de solución mide la mitad que en su página

const LETRAS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
// Letras de relleno: todas aparecen igual salvo la Ñ, que sale con menos frecuencia
const LETRAS_RELLENO = LETRAS.replace("Ñ", "").repeat(3) + "Ñ";

// [fila, columna]: horizontal, vertical, diagonal bajando, diagonal subiendo
const DIRECCIONES_NORMALES = [[0, 1], [1, 0], [1, 1], [-1, 1]];
const DIRECCIONES_INVERTIDAS = [[0, -1], [-1, 0], [-1, -1], [1, -1]];
const TODAS_DIRECCIONES = DIRECCIONES_NORMALES.concat(DIRECCIONES_INVERTIDAS);

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

function barajar(lista) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// ---------------------------------------------------------------------------
// Limpieza de palabras
// ---------------------------------------------------------------------------

function separarPalabras(texto) {
  return texto.split(/[\n,;]/).map((t) => t.trim()).filter(Boolean);
}

// Mayúsculas, sin tildes, conservando la Ñ.
function normalizar(texto) {
  texto = texto.normalize("NFC").toUpperCase().replace(/Ñ/g, "\0");
  texto = texto.normalize("NFD").replace(/\p{Mn}/gu, "");
  return texto.replace(/\0/g, "Ñ");
}

// Devuelve { palabras: [{visible, letras}], errores: [texto], repetidas: [texto] }.
function prepararPalabras(originales) {
  const palabras = [], errores = [], repetidas = [], vistas = new Set();
  for (const original of originales) {
    const visible = normalizar(original).replace(/\s+/g, " ").trim();
    const letras = [...visible].filter((ch) => LETRAS.includes(ch)).join("");
    if (letras.length < 2) {
      errores.push(`"${original}" no tiene letras suficientes`);
    } else if (letras.length > TAMANO_CUADRICULA) {
      errores.push(`"${original}" tiene ${letras.length} letras y la cuadrícula solo ${TAMANO_CUADRICULA}`);
    } else if (vistas.has(letras)) {
      repetidas.push(original);
    } else {
      vistas.add(letras);
      palabras.push({ visible, letras });
    }
  }
  return { palabras, errores, repetidas };
}

// ---------------------------------------------------------------------------
// Construcción de la sopa de letras
// ---------------------------------------------------------------------------

function contarApariciones(cuadricula, letras) {
  const n = cuadricula.length, largo = letras.length;
  const encontradas = new Set();
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      if (cuadricula[f][c] !== letras[0]) continue;
      for (const [df, dc] of TODAS_DIRECCIONES) {
        const ff = f + df * (largo - 1), fc = c + dc * (largo - 1);
        if (ff < 0 || ff >= n || fc < 0 || fc >= n) continue;
        let coincide = true;
        const casillas = [];
        for (let i = 0; i < largo && coincide; i++) {
          const a = f + df * i, b = c + dc * i;
          coincide = cuadricula[a][b] === letras[i];
          casillas.push(a * n + b);
        }
        if (coincide) encontradas.add(casillas.sort((x, y) => x - y).join(","));
      }
    }
  }
  return encontradas.size;
}

function intentarColocar(palabras, n, direcciones) {
  const cuadricula = Array.from({ length: n }, () => Array(n).fill(null));
  const colocadas = [];
  const ordenadas = [...palabras].sort((a, b) => b.letras.length - a.letras.length);
  for (const { visible, letras } of ordenadas) {
    const largo = letras.length;
    let colocada = false;
    for (const [df, dc] of barajar([...direcciones])) {
      const inicios = [];
      for (let f = 0; f < n; f++) {
        for (let c = 0; c < n; c++) {
          const ff = f + df * (largo - 1), fc = c + dc * (largo - 1);
          if (ff >= 0 && ff < n && fc >= 0 && fc < n) inicios.push([f, c]);
        }
      }
      for (const [f, c] of barajar(inicios)) {
        const casillas = [];
        for (let i = 0; i < largo; i++) casillas.push([f + df * i, c + dc * i]);
        if (!casillas.every(([a, b], i) => cuadricula[a][b] === null || cuadricula[a][b] === letras[i])) continue;
        if (casillas.every(([a, b]) => cuadricula[a][b] !== null)) continue; // quedaría escondida dentro de otra palabra
        casillas.forEach(([a, b], i) => { cuadricula[a][b] = letras[i]; });
        colocadas.push({ visible, letras, f, c, df, dc });
        colocada = true;
        break;
      }
      if (colocada) break;
    }
    if (!colocada) return null;
  }
  return { cuadricula, colocadas };
}

// Devuelve { cuadricula, colocadas } o null si no se consigue colocar todo.
function crearSopa(palabras, invertidas, intentos = 300) {
  const n = TAMANO_CUADRICULA;
  const direcciones = DIRECCIONES_NORMALES.concat(invertidas ? DIRECCIONES_INVERTIDAS : []);
  let resultado = null;
  for (let i = 0; i < intentos && !resultado; i++) resultado = intentarColocar(palabras, n, direcciones);
  if (!resultado) return null;
  const { cuadricula, colocadas } = resultado;

  // Relleno con letras al azar, evitando que alguna palabra aparezca dos veces
  const base = new Map(palabras.map((p) => [p.letras, contarApariciones(cuadricula, p.letras)]));
  let rellena;
  for (let i = 0; i < 60; i++) {
    rellena = cuadricula.map((fila) => fila.map((ch) => ch || azar(LETRAS_RELLENO)));
    if ([...base].every(([letras, veces]) => contarApariciones(rellena, letras) === veces)) break;
  }
  return { cuadricula: rellena, colocadas };
}

// ---------------------------------------------------------------------------
// Fuentes (Liberation Sans: gratuita y con las mismas medidas que Arial)
// ---------------------------------------------------------------------------

const FUENTES = { normal: null, negrita: null };
const BYTES_FUENTES = { normal: null, negrita: null };

async function cargarFuentes() {
  const archivos = { normal: "fuentes/LiberationSans-Regular.ttf", negrita: "fuentes/LiberationSans-Bold.ttf" };
  for (const [clave, ruta] of Object.entries(archivos)) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error("No se pudo cargar la fuente " + ruta);
    BYTES_FUENTES[clave] = new Uint8Array(await respuesta.arrayBuffer());
    FUENTES[clave] = fontkit.create(BYTES_FUENTES[clave]);
  }
}

function anchoTexto(texto, fuente, tam) {
  const f = FUENTES[fuente];
  return f.layout(texto).advanceWidth / f.unitsPerEm * tam;
}

// ---------------------------------------------------------------------------
// Diseño de las páginas. Cada página es una lista de "trazos":
//   { tipo: "texto", texto, x, y (línea base), tam, fuente, gris, centrado }
//   { tipo: "ruta", d (trazado SVG), grosor }
// Los mismos trazos se usan para la vista previa (SVG) y para el PDF.
// ---------------------------------------------------------------------------

function margenInterior(totalPaginas) {
  // Margen del lomo según el número de páginas (tabla de KDP) más un pequeño colchón.
  let minimo;
  if (totalPaginas <= 150) minimo = 0.375;
  else if (totalPaginas <= 300) minimo = 0.5;
  else if (totalPaginas <= 500) minimo = 0.625;
  else if (totalPaginas <= 700) minimo = 0.75;
  else minimo = 0.875;
  return Math.max(0.5, minimo + 0.125) * PULGADA;
}

// Caja de contenido con márgenes en espejo: en páginas impares (derecha) el lomo queda a la izquierda.
function areaUtil(ancho, alto, numeroPagina, interior) {
  const exterior = 0.5 * PULGADA, superior = 0.6 * PULGADA, inferior = 0.6 * PULGADA;
  const impar = numeroPagina % 2 === 1;
  return {
    x0: impar ? interior : exterior,
    x1: ancho - (impar ? exterior : interior),
    arriba: superior,
    abajo: alto - inferior,
  };
}

function partirLineas(texto, fuente, tam, anchoMax) {
  const lineas = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? actual + " " + palabra : palabra;
    if (actual && anchoTexto(prueba, fuente, tam) > anchoMax) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function prepararTitulo(texto, fuente, tamMax, tamMin, anchoMax) {
  let tam = tamMax;
  while (tam > tamMin && anchoTexto(texto, fuente, tam) > anchoMax) tam -= 0.5;
  const lineas = partirLineas(texto, fuente, tam, anchoMax);
  return { tam, lineas, alto: lineas.length * tam * 1.2 };
}

function trazarTitulo(trazos, titulo, xCentro, yArriba) {
  titulo.lineas.forEach((linea, i) => {
    trazos.push({ tipo: "texto", texto: linea, x: xCentro, y: yArriba + titulo.tam * 0.9 + i * titulo.tam * 1.2,
                  tam: titulo.tam, fuente: "negrita", gris: 0, centrado: true });
  });
}

const f2 = (v) => v.toFixed(2);

// Rectángulo de esquinas redondeadas como trazado SVG (curvas de Bézier).
function rutaRectanguloRedondeado(x, y, ancho, alto, r) {
  const k = r * 0.5523;
  const p = [
    `M${f2(x + r)},${f2(y)}`, `L${f2(x + ancho - r)},${f2(y)}`,
    `C${f2(x + ancho - r + k)},${f2(y)} ${f2(x + ancho)},${f2(y + r - k)} ${f2(x + ancho)},${f2(y + r)}`,
    `L${f2(x + ancho)},${f2(y + alto - r)}`,
    `C${f2(x + ancho)},${f2(y + alto - r + k)} ${f2(x + ancho - r + k)},${f2(y + alto)} ${f2(x + ancho - r)},${f2(y + alto)}`,
    `L${f2(x + r)},${f2(y + alto)}`,
    `C${f2(x + r - k)},${f2(y + alto)} ${f2(x)},${f2(y + alto - r + k)} ${f2(x)},${f2(y + alto - r)}`,
    `L${f2(x)},${f2(y + r)}`,
    `C${f2(x)},${f2(y + r - k)} ${f2(x + r - k)},${f2(y)} ${f2(x + r)},${f2(y)}`, "Z",
  ];
  return p.join(" ");
}

// Óvalo alargado (cápsula) que rodea el segmento entre dos centros de casilla.
function rutaCapsula(x1, y1, x2, y2, r) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / dist, uy = (y2 - y1) / dist;  // dirección de la palabra
  const nx = -uy, ny = ux;                              // perpendicular
  const k = r * 0.5523;
  const P = (x, y) => `${f2(x)},${f2(y)}`;
  const A = [x1 + nx * r, y1 + ny * r], B = [x2 + nx * r, y2 + ny * r];
  const C = [x2 + ux * r, y2 + uy * r], D = [x2 - nx * r, y2 - ny * r];
  const E = [x1 - nx * r, y1 - ny * r], F = [x1 - ux * r, y1 - uy * r];
  return [
    "M" + P(...A), "L" + P(...B),
    "C" + P(B[0] + ux * k, B[1] + uy * k) + " " + P(C[0] + nx * k, C[1] + ny * k) + " " + P(...C),
    "C" + P(C[0] - nx * k, C[1] - ny * k) + " " + P(D[0] + ux * k, D[1] + uy * k) + " " + P(...D),
    "L" + P(...E),
    "C" + P(E[0] - ux * k, E[1] - uy * k) + " " + P(F[0] - nx * k, F[1] - ny * k) + " " + P(...F),
    "C" + P(F[0] + nx * k, F[1] + ny * k) + " " + P(A[0] - ux * k, A[1] - uy * k) + " " + P(...A),
    "Z",
  ].join(" ");
}

// Tamaño de letra (pt) que tendrá una cuadrícula de n x n dibujada con ese lado.
function tamanoLetra(lado, n) {
  return lado * 0.97 / n * 0.6;
}

function trazarCuadricula(trazos, sopa, x, yArriba, lado, conSolucion) {
  const cuadricula = sopa.cuadricula;
  const n = cuadricula.length;
  const tam = tamanoLetra(lado, n);

  trazos.push({ tipo: "ruta", grosor: Math.max(0.6, lado / n * 0.04),
                d: rutaRectanguloRedondeado(x, yArriba, lado, lado, lado / n * 0.3) });

  // Pequeño espacio entre el marco y las letras
  const relleno = lado * 0.015;
  x += relleno; yArriba += relleno; lado -= 2 * relleno;
  const celda = lado / n;

  const enPalabra = new Set();
  if (conSolucion) {
    for (const p of sopa.colocadas) {
      for (let i = 0; i < p.letras.length; i++) enPalabra.add((p.f + p.df * i) * n + (p.c + p.dc * i));
    }
  }

  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      const gris = conSolucion && !enPalabra.has(f * n + c) ? 0.6 : 0;
      trazos.push({ tipo: "texto", texto: cuadricula[f][c], x: x + (c + 0.5) * celda,
                    y: yArriba + (f + 0.5) * celda + tam * 0.36, tam, fuente: "normal", gris, centrado: true });
    }
  }

  if (conSolucion) {
    const radio = celda * 0.42;
    const grosor = Math.max(0.5, celda * 0.06);
    for (const p of sopa.colocadas) {
      const largo = p.letras.length - 1;
      const xa = x + (p.c + 0.5) * celda, ya = yArriba + (p.f + 0.5) * celda;
      const xb = x + (p.c + p.dc * largo + 0.5) * celda, yb = yArriba + (p.f + p.df * largo + 0.5) * celda;
      trazos.push({ tipo: "ruta", grosor, d: rutaCapsula(xa, ya, xb, yb, radio) });
    }
  }
}

function claveOrden(texto) {
  return texto.replace(/Ñ/g, "N~");
}

// Página de la sopa: título numerado, cuadrícula y lista de palabras en 3 columnas.
// La cuadrícula y la lista quedan a MARGEN_CUADRICULA de la caja de contenido por los 4 lados;
// el título puede ocupar el margen superior.
function paginaSopa(sopa, titulo, area, anchoPagina) {
  const trazos = [];
  const ancho = area.x1 - area.x0, alto = area.abajo - area.arriba;
  const grande = anchoPagina >= 7 * PULGADA;

  const tit = prepararTitulo(titulo, "negrita", grande ? 22 : 18, 12, ancho);
  const huecoTitulo = 0.3 * PULGADA, huecoLista = 0.3 * PULGADA;

  const palabras = sopa.colocadas.map((p) => p.visible)
    .sort((a, b) => (claveOrden(a) < claveOrden(b) ? -1 : claveOrden(a) > claveOrden(b) ? 1 : 0));

  const ladoMax = ancho - 2 * MARGEN_CUADRICULA;
  const arriba = Math.max(MARGEN_CUADRICULA, tit.alto + huecoTitulo);

  // Lista en COLUMNAS_LISTA columnas iguales dentro del ancho de la cuadrícula;
  // se reduce la letra si alguna palabra no cabe.
  const filas = Math.ceil(palabras.length / COLUMNAS_LISTA);
  const anchoColumna = ladoMax / COLUMNAS_LISTA;
  let tamLista, masLarga;
  for (tamLista of (grande ? [12, 11, 10, 9, 8] : [11, 10, 9, 8])) {
    masLarga = Math.max(...palabras.map((p) => anchoTexto(p, "normal", tamLista)));
    if (masLarga <= anchoColumna - 14) break;
  }
  const altoLista = filas * tamLista * 1.55;
  const abajo = huecoLista + altoLista + MARGEN_CUADRICULA;
  const lado = Math.min(ladoMax, alto - arriba - abajo);

  const sobrante = alto - arriba - lado - abajo;
  trazarTitulo(trazos, tit, area.x0 + ancho / 2, area.arriba);
  const yCuadricula = area.arriba + arriba + sobrante / 3;
  trazarCuadricula(trazos, sopa, area.x0 + (ancho - lado) / 2, yCuadricula, lado, false);

  const xLista = area.x0 + (ancho - ladoMax) / 2;
  const yLista = yCuadricula + lado + huecoLista;
  palabras.forEach((palabra, i) => {
    const col = Math.floor(i / filas), fila = i % filas;
    trazos.push({ tipo: "texto", texto: palabra, x: xLista + col * anchoColumna + (anchoColumna - masLarga) / 2,
                  y: yLista + tamLista + fila * tamLista * 1.55, tam: tamLista, fuente: "normal", gris: 0, centrado: false });
  });

  return { trazos, letra: tamanoLetra(lado, sopa.cuadricula.length) };
}

// Huecos para las soluciones (2 por página, uno encima de otro), dentro de la caja
// de contenido reducida en MARGEN_CUADRICULA.
function huecosSoluciones(area, altoEncabezado) {
  let arriba = MARGEN_CUADRICULA;
  if (altoEncabezado) arriba = Math.max(arriba, altoEncabezado + 0.3 * PULGADA);
  const x0 = area.x0 + MARGEN_CUADRICULA, x1 = area.x1 - MARGEN_CUADRICULA;
  const y0 = area.arriba + arriba, y1 = area.abajo - MARGEN_CUADRICULA;
  const separacion = 0.25 * PULGADA;
  const ancho = x1 - x0;
  const alto = (y1 - y0 - separacion * (SOLUCIONES_POR_PAGINA - 1)) / SOLUCIONES_POR_PAGINA;
  const posiciones = [];
  for (let fila = 0; fila < SOLUCIONES_POR_PAGINA; fila++) posiciones.push({ x: x0, y: y0 + fila * (alto + separacion) });
  return { posiciones, ancho, alto };
}

function ladoSolucion(anchoHueco, altoHueco, altoTitulo) {
  return Math.min(anchoHueco * ESCALA_SOLUCION, altoHueco - altoTitulo - 6);
}

// grupo: lista de { titulo, sopa }. Devuelve los trazos y la letra más pequeña usada.
function paginaSoluciones(grupo, area, encabezado) {
  const trazos = [];
  const ancho = area.x1 - area.x0;
  let altoEncabezado = 0;
  if (encabezado) {
    const enc = prepararTitulo(encabezado, "negrita", 20, 12, ancho);
    trazarTitulo(trazos, enc, area.x0 + ancho / 2, area.arriba);
    altoEncabezado = enc.alto;
  }
  const huecos = huecosSoluciones(area, altoEncabezado);
  let letra = Infinity;
  grupo.forEach(({ titulo, sopa }, i) => {
    const h = huecos.posiciones[i];
    const tit = prepararTitulo(titulo, "negrita", 10, 7, huecos.ancho);
    const lado = ladoSolucion(huecos.ancho, huecos.alto, tit.alto);
    trazarTitulo(trazos, tit, h.x + huecos.ancho / 2, h.y);
    trazarCuadricula(trazos, sopa, h.x + (huecos.ancho - lado) / 2, h.y + tit.alto + 6, lado, true);
    letra = Math.min(letra, tamanoLetra(lado, sopa.cuadricula.length));
  });
  return { trazos, letra };
}

// Tamaño de letra aproximado (sopa, solución) para un tamaño de página.
function estimarLetras(clavePagina) {
  const { ancho, alto } = TAMANOS_PAGINA[clavePagina];
  const area = areaUtil(ancho, alto, 1, margenInterior(0));
  const letraSopa = tamanoLetra(area.x1 - area.x0 - 2 * MARGEN_CUADRICULA, TAMANO_CUADRICULA);
  const h = huecosSoluciones(area, 20 * 1.2);
  return { sopa: letraSopa, solucion: tamanoLetra(ladoSolucion(h.ancho, h.alto, 10 * 1.2), TAMANO_CUADRICULA) };
}

function textoAviso(que, letra, minima) {
  return `Con el margen de 1,5 cm alrededor de la cuadrícula, las letras de ${que} quedan de ` +
         `${letra.toFixed(1).replace(".", ",")} pt (mínimo recomendado: ${minima} pt) y pueden leerse mal.`;
}

// sopas: lista de { titulo (ya numerado), sopa }. Devuelve las páginas (listas de trazos) y avisos.
function disenarLibro(sopas, clavePagina, encabezado) {
  const { ancho, alto } = TAMANOS_PAGINA[clavePagina];
  const grupos = [];
  for (let i = 0; i < sopas.length; i += SOLUCIONES_POR_PAGINA) grupos.push(sopas.slice(i, i + SOLUCIONES_POR_PAGINA));
  const total = sopas.length + grupos.length;
  const interior = margenInterior(total);

  const paginas = [];
  let numero = 1, letraSopa = Infinity, letraSolucion = Infinity;
  for (const { titulo, sopa } of sopas) {
    const p = paginaSopa(sopa, titulo, areaUtil(ancho, alto, numero++, interior), ancho);
    paginas.push(p.trazos);
    letraSopa = Math.min(letraSopa, p.letra);
  }
  grupos.forEach((grupo, i) => {
    const p = paginaSoluciones(grupo, areaUtil(ancho, alto, numero++, interior), i === 0 ? encabezado : "");
    paginas.push(p.trazos);
    letraSolucion = Math.min(letraSolucion, p.letra);
  });

  const avisos = [];
  if (letraSopa < LETRA_MINIMA_SOPA) avisos.push(textoAviso("la sopa", letraSopa, LETRA_MINIMA_SOPA));
  if (letraSolucion < LETRA_MINIMA_SOLUCION) avisos.push(textoAviso("las soluciones", letraSolucion, LETRA_MINIMA_SOLUCION));
  return { paginas, ancho, alto, avisos };
}

// ---------------------------------------------------------------------------
// Dibujo: vista previa (SVG) y PDF
// ---------------------------------------------------------------------------

function escaparXml(texto) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function svgPagina(trazos, ancho, alto) {
  const partes = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f2(ancho)} ${f2(alto)}">`,
                  `<rect width="${f2(ancho)}" height="${f2(alto)}" fill="#fff"/>`];
  for (const t of trazos) {
    if (t.tipo === "texto") {
      const g = Math.round(t.gris * 255);
      partes.push(`<text x="${f2(t.x)}" y="${f2(t.y)}" font-size="${f2(t.tam)}" font-family="LetraSopa" ` +
                  `font-weight="${t.fuente === "negrita" ? 700 : 400}" fill="rgb(${g},${g},${g})"` +
                  `${t.centrado ? ' text-anchor="middle"' : ""}>${escaparXml(t.texto)}</text>`);
    } else {
      partes.push(`<path d="${t.d}" fill="none" stroke="#000" stroke-width="${f2(t.grosor)}"/>`);
    }
  }
  partes.push("</svg>");
  return partes.join("");
}

// Crea el PDF con las fuentes incrustadas y sin metadatos (nada de "creado con...").
async function crearPdf(paginas, ancho, alto) {
  const { PDFDocument, grayscale } = PDFLib;
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.registerFontkit(fontkit);
  const fuentes = {
    normal: await doc.embedFont(BYTES_FUENTES.normal, { subset: true }),
    negrita: await doc.embedFont(BYTES_FUENTES.negrita, { subset: true }),
  };
  for (const trazos of paginas) {
    const pagina = doc.addPage([ancho, alto]);
    for (const t of trazos) {
      if (t.tipo === "texto") {
        const x = t.centrado ? t.x - anchoTexto(t.texto, t.fuente, t.tam) / 2 : t.x;
        pagina.drawText(t.texto, { x, y: alto - t.y, size: t.tam, font: fuentes[t.fuente], color: grayscale(t.gris) });
      } else {
        pagina.drawSvgPath(t.d, { x: 0, y: alto, borderColor: grayscale(0), borderWidth: t.grosor });
      }
    }
  }
  return doc.save();
}

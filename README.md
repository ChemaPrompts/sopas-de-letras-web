# Sopas de letras (versión web para móvil)

Aplicación web para generar sopas de letras en PDF desde Chrome en Android,
pensada como interior de libros de Amazon KDP.

Es un proyecto separado del generador de escritorio en Python, con el mismo diseño.
No lleva temas ni palabras predefinidos: el título y las palabras se escriben en cada uso,
y todo se genera dentro del propio móvil (nada se envía a ningún servidor).

## Cómo se usa

1. Escribe el título y exactamente 12 palabras (con comas o una por línea).
2. Pulsa **Generar sopa** para verla. Con **Otra colocación** se recolocan las palabras.
3. Pulsa **Descargar solo esta sopa** para un PDF con la sopa y su solución,
   o **Añadir al libro** para ir juntando sopas.
4. En **Mi libro**, **Descargar libro completo** crea un solo PDF con todas las sopas
   numeradas y las soluciones al final.

El libro se guarda en la memoria de Chrome de ese móvil: si cierras la página, sigue ahí.
Si borras los datos de navegación de Chrome, se pierde.

## Reglas del diseño

- Cuadrícula de 13x13 con exactamente 12 palabras: horizontal, vertical y diagonal.
  Las palabras al revés solo si se marca la casilla.
- Se quitan las tildes y se conserva la Ñ. Las palabras con espacios van juntas en la cuadrícula.
- Las letras de relleno no forman por casualidad otra copia de ninguna palabra.
- Página de la sopa: título numerado, cuadrícula y lista de palabras en 3 columnas de 4, en orden alfabético.
- Soluciones al final, 2 por página, con la cuadrícula al 50 % y las palabras rodeadas con óvalos.
  Encabezado "Soluciones" en la primera página de soluciones (se puede cambiar o dejar vacío en Ajustes).
- Al menos 1,5 cm entre la cuadrícula (y la lista) y la caja de contenido, en los 4 lados.
- Tamaños: 6x9 (por defecto), 8,5x11, 8x10, 7x10 pulgadas y A4.
- Para KDP: márgenes en espejo con el margen interior según el número de páginas, sin sangrado,
  fuente incrustada y metadatos vacíos. Aviso si el libro tiene menos de 24 páginas.
- Sin ningún texto añadido: ni marcas de agua, ni números de página.

## Archivos

- `index.html`: la página y su aspecto.
- `app.js`: la pantalla (formulario, vista previa, libro y ajustes).
- `motor.js`: crea las sopas y dibuja las páginas (vista previa y PDF).
- `lib/`: pdf-lib 1.17.1 y fontkit 1.1.1, para crear el PDF.
- `fuentes/`: Liberation Sans (gratuita, mismas medidas que Arial) y su licencia.

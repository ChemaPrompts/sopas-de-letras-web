# Sopas de letras (versión web para móvil)

Aplicación web para generar sopas de letras en PDF desde Chrome en Android,
pensada como interior de libros de Amazon KDP.

Es un proyecto separado del generador de escritorio en Python.
No lleva temas ni palabras predefinidos: el título y las palabras se escriben en cada uso,
y todo se genera dentro del propio móvil (nada se envía a ningún servidor).

## Estado actual

Prueba mínima: `index.html` tiene un botón que genera un PDF de una hoja (6x9 pulgadas)
y lo descarga, para comprobar que la descarga funciona en Chrome de Android.

## Archivos

- `index.html`: la página.
- `lib/jspdf.umd.min.js`: librería jsPDF 2.5.1 para crear el PDF (copia local, sin depender de internet).

# InstagrameAMO

Plugin web de DesarrollAMO para comparar seguidores y seguidos de una exportación de Instagram.

## Qué muestra
- Seguidores
- Seguidos
- Seguimiento mutuo
- Cuentas que seguís y no te siguen
- Cuentas que te siguen y no seguís

## Privacidad
No pide usuario ni contraseña de Instagram.
Los archivos se procesan localmente en el navegador y no se suben a un servidor. El lector ZIP inspecciona su índice y descomprime exclusivamente los documentos de seguidores/seguidos, sin cargar fotos ni videos completos en memoria. La conexión a Internet no permite verificar seguidores en vivo.

## Archivos aceptados
- ZIP exportado por Instagram
- followers_*.json / following.json
- followers_*.html / following.html

## Rendimiento y pruebas
Los resultados se muestran en páginas de 100 cuentas y la búsqueda usa una demora corta. Para probar el lector sin subir datos personales, los tests unitarios están en `tests/`; la prueba de navegador con un ZIP real se realiza localmente y no se incorpora al repositorio.

La dependencia `vendor/zip.min.js` corresponde a zip.js; su licencia está en `vendor/zip.LICENSE.txt`.

## Uso local
Abrí `index.html` o serví esta carpeta con cualquier servidor estático.

## Publicación
Es una app estática: puede publicarse directamente en Netlify, GitHub Pages o cualquier hosting estático.

DesarrollAMO · 2026

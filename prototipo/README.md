# Prototipo

Prototipo estático y navegable de la interfaz. Datos simulados.

## Para qué sirve

Validar **cómo se comunica la certeza y la incertidumbre**, que es el problema de
diseño más difícil del producto (`../docs/04-motor-de-estimacion.md`). Concretamente:

- Mostrar un rango en vez de un número exacto.
- Explicar de dónde viene la confianza ("3 personas a bordo").
- Decir "no sé" sin que parezca una falla de la app.
- Avisar que una micro no llegará **con una alternativa concreta**.

## Para qué NO sirve

No prueba tecnología. No valida el motor de estimación, la inferencia de recorrido,
el consumo de batería ni el acceso a datos. Eso se valida en terreno
(`../docs/05-roadmap.md`, tarea F0-5).

## Ver en local

Basta abrir `index.html` en el navegador; no hay compilación ni dependencias.

## Publicación

El flujo `.github/workflows/pages.yml` publica esta carpeta en GitHub Pages con cada
push a `main`. Requiere, una sola vez, activar Pages en el repositorio:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

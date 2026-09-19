# Bus Checker

Aplicación de transporte público para Santiago de Chile. El objetivo no es sólo
mostrar un tiempo estimado de llegada, sino responder la pregunta que realmente
importa cuando alguien está en un paradero: **¿esta micro viene o no viene?**

> **Estado del proyecto:** fase de diseño. Este repositorio contiene, por ahora,
> la documentación técnica y el plan de desarrollo. No hay código de producción.

## Código

- [`movil/`](movil/) — la app, en React Native + Expo. **Un código para iPhone y
  Android.** Ver [cómo abrirla en tu teléfono](movil/README.md).
- [`backend/`](backend/) — ingesta del GTFS y la geometría sobre recorridos de la
  que depende el motor de estimación. 38 pruebas en verde.

## Verlo en el navegador

La app publicada en GitHub Pages, sin instalar nada:

**https://tomato885-dev.github.io/BusAPP/**

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/01-fuentes-de-datos.md`](docs/01-fuentes-de-datos.md) | Qué datos existen realmente en Santiago, cuáles no, y qué hacer al respecto. **Léelo primero.** |
| [`docs/02-stack-movil.md`](docs/02-stack-movil.md) | Swift nativo vs. Flutter vs. React Native. Evaluación y recomendación. |
| [`docs/03-arquitectura.md`](docs/03-arquitectura.md) | Arquitectura del sistema: app, backend, base de datos, ingesta de datos. |
| [`docs/04-motor-de-estimacion.md`](docs/04-motor-de-estimacion.md) | El diferenciador: cómo se decide si una micro "viene o no viene". |
| [`docs/05-roadmap.md`](docs/05-roadmap.md) | Fases de desarrollo, alcance del MVP y criterios de avance. |
| [`docs/06-riesgos-y-decisiones.md`](docs/06-riesgos-y-decisiones.md) | Riesgos abiertos, decisiones pendientes y supuestos del diseño. |
| [`docs/07-modelo-de-negocio.md`](docs/07-modelo-de-negocio.md) | Cómo se financia el proyecto sin invadir al usuario ni usar publicidad. |
| [`docs/08-lo-que-necesito-de-ti.md`](docs/08-lo-que-necesito-de-ti.md) | **Tareas, decisiones y definiciones de estilo que dependen de ti.** |
| [`docs/09-nombre.md`](docs/09-nombre.md) | Alternativas al nombre, y por qué «Bus Checker» no sirve. |

## Resumen ejecutivo de las conclusiones

1. **El dato que sostiene el producto no está garantizado.** El GTFS estático
   (paraderos, recorridos, horarios) es público. Las **posiciones GPS de los buses
   en tiempo real no lo son**: requieren gestión directa con el DTPM. Sin ese dato
   la propuesta de valor se degrada a "otra app más de horarios".
   → Ver [`docs/01`](docs/01-fuentes-de-datos.md).

2. **El motor es un sensor pasivo, no un sistema de reportes.** Cada usuario
   con la app y el permiso activo aporta su ubicación sin hacer nada. De ahí
   salen dos estimadores independientes del mismo número —el oficial y el
   derivado de la gente a bordo— que se combinan estadísticamente. **Cuando
   ambos se contradicen más allá de su incertidumbre, eso *es* la señal de que
   la micro no viene.** → Ver [`docs/04`](docs/04-motor-de-estimacion.md).

3. **Esto son dos proyectos, no uno:** una app móvil y un servicio backend. La
   fusión de datos es colectiva por definición y no puede vivir en el teléfono.
   → Ver [`docs/03`](docs/03-arquitectura.md).

4. **Hay que lanzar concentrado en una zona, no en todo Santiago.** Basta una
   persona a bordo para saber dónde va un bus: con ~5% de penetración entre los
   pasajeros de un corredor se cubre más del 90% de los buses en hora punta. Esa
   densidad es alcanzable en una comuna e impensable en toda la región.
   → Ver [`docs/04`](docs/04-motor-de-estimacion.md) §4.7.

5. **El MVP no muestra el diferenciador: lo prepara.** La fase 1 es una app útil
   con datos oficiales que además empieza a capturar telemetría en silencio. El
   diferenciador aparece en la fase 4, y el planificador después.
   → Ver [`docs/05`](docs/05-roadmap.md).

6. **Sin publicidad, y no por gusto:** los SDK publicitarios obligan a declarar
   rastreo en la ficha de las tiendas, lo que erosiona el permiso de ubicación
   del que depende el motor. El negocio son los datos agregados de movilidad,
   que el usuario nunca ve. → Ver [`docs/07`](docs/07-modelo-de-negocio.md).

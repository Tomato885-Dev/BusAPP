# Bus Checker

Aplicación de transporte público para Santiago de Chile. El objetivo no es sólo
mostrar un tiempo estimado de llegada, sino responder la pregunta que realmente
importa cuando alguien está en un paradero: **¿esta micro viene o no viene?**

> **Estado del proyecto:** fase de diseño. Este repositorio contiene, por ahora,
> la documentación técnica y el plan de desarrollo. No hay código de producción.

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

## Resumen ejecutivo de las conclusiones

1. **El dato que sostiene el producto no está garantizado.** El GTFS estático
   (paraderos, recorridos, horarios) es público. Las **posiciones GPS de los buses
   en tiempo real no lo son**: requieren gestión directa con el DTPM. Sin ese dato
   la propuesta de valor se degrada a "otra app más de horarios".
   → Ver [`docs/01`](docs/01-fuentes-de-datos.md).

2. **iOS-only es incompatible con la propuesta de valor.** El diferenciador
   depende de reportes y ubicación aportados por usuarios, y eso necesita masa
   crítica. Android domina ampliamente el mercado chileno; lanzar sólo en iOS
   limita la base de usuarios justo en el mecanismo que hace único al producto.
   → Ver [`docs/02`](docs/02-stack-movil.md).

3. **Esto son dos proyectos, no uno:** una app móvil y un servicio backend. La
   fusión de datos oficiales con reportes comunitarios no puede vivir sólo en el
   teléfono. → Ver [`docs/03`](docs/03-arquitectura.md).

4. **El MVP debe ser una sola pantalla hecha muy bien:** llegadas en paradero.
   El planificador de viajes y los reportes comunitarios son fases posteriores,
   por razones que se explican en el roadmap.
   → Ver [`docs/05`](docs/05-roadmap.md).

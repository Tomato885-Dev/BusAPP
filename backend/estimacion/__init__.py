"""De la posición de los buses a la respuesta «¿viene o no viene?».

Es el motor de `docs/04`, y dejó de ser teórico el 9 de octubre de 2026, cuando
el DTPM entregó el acceso al servicio de posicionamiento de la flota completa.

Hasta ese día el proyecto dependía de la telemetría de los propios usuarios
para saber dónde estaba un bus, con el problema de arranque que eso trae: sin
usuarios no hay datos, y sin datos nadie usa la app. Con las posiciones
oficiales **la promesa central funciona desde el primer día y con un solo
usuario**.

La telemetría no se cae del plan: pasa de ser el cimiento a ser lo que explica
*por qué* un bus no avanza —si va lleno, si está detenido, si se desvió— y lo
que cubre los huecos de la fuente oficial. Pero ya no es lo que hace existir al
producto.
"""

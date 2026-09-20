"""Análisis de trazas GPS grabadas a mano.

Existe para responder **la pregunta que puede hundir el proyecto**: ¿se puede
saber en qué micro va una persona mirando sólo el GPS de su teléfono?

Si la respuesta es no, no hay telemetría propia (`docs/01` §1.4), no hay
detección de desvíos, no hay diferenciador y no hay dato que vender. Es el
supuesto 3 de `docs/06` §6.3 y el riesgo R2b, y sigue sin comprobarse.

El módulo está escrito **antes** de tener las trazas reales, a propósito: así
el día que lleguen los `.gpx` la respuesta sale en minutos y no en una semana.
Mientras tanto se valida contra trazas sintéticas generadas del propio GTFS
(`simular.py`), que prueban el algoritmo aunque no prueben la realidad.
"""

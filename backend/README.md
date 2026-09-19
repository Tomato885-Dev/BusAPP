# Backend — ingesta GTFS

Primera pieza de código real del proyecto. Convierte el feed GTFS de Santiago en
las estructuras que necesita el motor de estimación (`../docs/04-motor-de-estimacion.md`).

## Por qué esto primero

Todo el producto descansa en una operación geométrica: **dado un punto GPS,
¿cuánto le falta a ese bus para llegar a este paradero, siguiendo el recorrido?**

No es la distancia en línea recta. Una micro a 400 m en línea recta puede estar a
3 km por el recorrido si todavía no dobló. Y el dato que hace falta para
calcularlo —la posición de cada paradero a lo largo del trazado— **no viene en el
GTFS de forma confiable**: el campo `shape_dist_traveled` es opcional y muchos
feeds lo omiten. Hay que calcularlo, y eso es lo que hace `posiciones.py`.

## Módulos

| Archivo | Qué hace |
|---|---|
| `geo.py` | Proyección de puntos sobre trazados. La pieza de la que depende todo lo demás. |
| `parse.py` | Lectura del feed (.zip o directorio) a registros tipados. |
| `posiciones.py` | Ubica cada parada a lo largo del trazado de su recorrido. |
| `validar.py` | Revisa si un feed sirve **para este producto**, no sólo si cumple la especificación. |
| `schema.sql` | Esquema PostgreSQL + PostGIS. |
| `load.py` | Carga a PostGIS con swap atómico de esquema. |
| `cli.py` | Línea de comandos. |

## Uso

```bash
pip install -r requirements.txt

python -m gtfs.cli descargar                      # baja el feed oficial
python -m gtfs.cli resumen  data/GTFS.zip         # qué trae
python -m gtfs.cli validar  data/GTFS.zip         # ¿sirve?
python -m gtfs.cli exportar data/GTFS.zip --recorridos 506 D09 210
python -m gtfs.cli cargar   data/GTFS.zip --dsn postgresql://localhost/buschecker
```

Sin argumentos de feed puedes usar el ejemplo sintético:

```bash
python -m gtfs.cli validar tests/fixtures/gtfs_ejemplo
```

## Pruebas

```bash
python -m pytest tests/ -q
```

## Estado

- ✅ **Probado:** geometría, lectura del feed, ubicación de paradas, validación.
  38 pruebas, todas sobre el feed de ejemplo sintético.
- ⚠️ **Sin ejecutar contra el feed real:** el entorno de desarrollo donde se
  escribió esto tiene bloqueado el acceso a `dtpm.cl`. Correrlo contra el feed
  oficial es la tarea F0-1 del roadmap.
- ⚠️ **Sin ejecutar contra una base de datos:** `load.py` y `schema.sql` están
  escritos pero nunca se han corrido contra un PostgreSQL real.

## Decisiones que conviene conocer

**Avance monótono.** Un bus no retrocede. Sin imponerlo, el ruido del GPS sobre un
recorrido que va y vuelve por la misma calle hace que la posición salte
kilómetros hacia atrás. `geo.proyectar_secuencia` lo resuelve, y hay una prueba
que reproduce exactamente ese caso.

**Swap de esquema al actualizar.** El feed se carga en un esquema nuevo y recién
al final se renombra. Actualizar en vivo dejaría la app sirviendo un feed a medio
cargar durante minutos. Las tablas propias del producto (telemetría, reportes,
histórico) viven aparte y no se tocan.

**Validación orientada al producto.** Un feed puede cumplir la especificación GTFS
y ser inservible aquí: si ningún viaje trae trazado, el motor de estimación no
existe. Por eso `validar.py` revisa lo que este producto necesita y marca como
error lo que lo dejaría sin funcionar.

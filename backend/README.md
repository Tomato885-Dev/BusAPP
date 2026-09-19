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
  39 pruebas.
- ✅ **Ejecutado contra el feed real del DTPM** (tarea F0-1 completada).
- ⚠️ **Sin ejecutar contra una base de datos:** `load.py` y `schema.sql` están
  escritos pero nunca se han corrido contra un PostgreSQL real.

## El feed real: qué trae y qué calidad tiene

Validado el 19 de septiembre de 2026 contra `GTFS.zip` del DTPM (10,7 MB
comprimidos, ~70 MB descomprimidos).

| | |
|---|---|
| Paraderos | **12.880** |
| Recorridos | **427** (418 de bus, 7 líneas de Metro) |
| Viajes | **26.137** |
| Trazados | **980** |
| Horarios (`stop_times`) | **1.097.285** |
| Viajes con trazado | **26.137 de 26.137** ✅ |
| Largo de recorrido | mediana 18,9 km · máximo 82,3 km |

**Veredicto: apto para producción, sin anomalías.**

Que *todos* los viajes traigan trazado es la mejor noticia posible: es la
condición que `validar.py` marca como error bloqueante, porque sin trazados el
motor de estimación no existe.

### Calidad geométrica

Distancia entre cada paradero y el trazado de su propio recorrido, sobre una
muestra de 800 viajes y 33.125 paradas:

| | |
|---|---|
| Mediana | 5,7 m |
| Percentil 95 | 54,5 m |
| Percentil 99 | 101,0 m |
| Máximo | 138,8 m |

Una mediana de 5,7 m es excelente: los trazados del feed calzan con los
paraderos. Estos números calibraron `DESVIACION_SOSPECHOSA_M` (ver
`posiciones.py`).

### Hallazgos que corrigieron el código

1. **Rendimiento.** `pasos_por_viaje` recorría la lista completa de pasos en cada
   llamada. Con el ejemplo sintético (10 pasos) daba igual; con el feed real
   (1,1 millones de pasos y 26.000 viajes) son 28 mil millones de comparaciones
   y la ingesta no termina. Ahora va por un índice perezoso.
2. **Nombres duplicados.** El feed trae el código repetido dentro del nombre:
   `"PD1641-Parada 7 / (M) Macul"`. Se limpia al leer.
3. **Paraderos que no son paraderos.** El feed incluye estaciones "padre" de
   Metro y accesos peatonales de `pathways.txt`. No sirven ningún recorrido y
   hay que filtrarlos antes de mostrarlos.

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

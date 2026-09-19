-- Esquema de la ingesta GTFS.
--
-- Requiere PostGIS:  CREATE EXTENSION IF NOT EXISTS postgis;
--
-- El feed se reemplaza completo en cada actualización, así que estas tablas son
-- desechables: se cargan en un esquema nuevo y se hace swap al final (ver
-- load.py). Las tablas propias del producto (reportes, telemetría, histórico de
-- llegadas) viven aparte y NO se tocan al actualizar el feed.

CREATE TABLE IF NOT EXISTS paradas (
    id          text PRIMARY KEY,
    codigo      text NOT NULL,              -- el que el usuario ve en el paradero
    nombre      text NOT NULL,
    ubicacion   geography(Point, 4326) NOT NULL
);

-- Índice que sostiene "paraderos cercanos", la consulta más frecuente de la app.
CREATE INDEX IF NOT EXISTS paradas_ubicacion_idx ON paradas USING GIST (ubicacion);
CREATE INDEX IF NOT EXISTS paradas_codigo_idx    ON paradas (codigo);

CREATE TABLE IF NOT EXISTS recorridos (
    id           text PRIMARY KEY,
    nombre_corto text NOT NULL,             -- "506"
    nombre_largo text NOT NULL,
    tipo         smallint NOT NULL          -- 3 = bus, 1 = metro
);

CREATE INDEX IF NOT EXISTS recorridos_nombre_corto_idx ON recorridos (nombre_corto);

CREATE TABLE IF NOT EXISTS trazados (
    id        text PRIMARY KEY,
    linea     geography(LineString, 4326) NOT NULL,
    largo_m   double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS viajes (
    id           text PRIMARY KEY,
    recorrido_id text NOT NULL REFERENCES recorridos(id) ON DELETE CASCADE,
    servicio_id  text NOT NULL,
    letrero      text NOT NULL DEFAULT '',
    trazado_id   text REFERENCES trazados(id) ON DELETE SET NULL,
    sentido      smallint
);

CREATE INDEX IF NOT EXISTS viajes_recorrido_idx ON viajes (recorrido_id);

-- Paradas de cada viaje, CON su posición a lo largo del trazado.
--
-- `distancia_recorrida` es la columna que hace posible el motor de estimación
-- (docs/04 §4.2): sin ella no se puede calcular cuánto le falta a un bus para
-- llegar a un paradero *por el recorrido*, que es lo único que importa. No
-- viene en el feed de forma confiable; la calcula posiciones.py.
CREATE TABLE IF NOT EXISTS pasos (
    viaje_id             text NOT NULL REFERENCES viajes(id) ON DELETE CASCADE,
    parada_id            text NOT NULL REFERENCES paradas(id) ON DELETE CASCADE,
    orden                smallint NOT NULL,
    hora_llegada         interval,
    hora_salida          interval,
    distancia_recorrida  double precision,   -- metros desde el inicio del recorrido
    desviacion           double precision,   -- distancia de la parada al trazado
    PRIMARY KEY (viaje_id, orden)
);

CREATE INDEX IF NOT EXISTS pasos_parada_idx ON pasos (parada_id);

-- Vista de apoyo: qué recorridos sirven cada parada. Es la consulta que alimenta
-- la pantalla de llegadas, y hacerla vista evita desnormalizar a mano.
CREATE OR REPLACE VIEW recorridos_por_parada AS
SELECT DISTINCT
    p.parada_id,
    v.recorrido_id,
    r.nombre_corto,
    v.sentido
FROM pasos p
JOIN viajes v     ON v.id = p.viaje_id
JOIN recorridos r ON r.id = v.recorrido_id;

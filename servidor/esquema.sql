-- ============================================================================
-- Esquema de Bus Checker en Supabase
-- ============================================================================
--
-- Se ejecuta en el editor SQL de Supabase. Es idempotente: se puede volver a
-- correr sin romper nada.
--
-- Dos grupos de tablas, con reglas muy distintas:
--
--   1. LA RED (paraderos, recorridos, pasos). Viene del feed del DTPM, es
--      pública y de sólo lectura para la app. La escribe únicamente el proceso
--      de ingesta con la llave de servicio.
--
--   2. LOS DATOS DE LA GENTE (favoritos, reportes, telemetría). Cada persona ve
--      y escribe lo suyo, y nadie puede leer lo ajeno.
--
-- La regla de privacidad que sostiene todo (docs/03 §3.7b):
--
--      El identificador del usuario y su trayectoria de ubicación NO comparten
--      llave. Si la compartieran, esta base contendría el mapa de movimientos
--      de cada persona asociado a su identidad.
--
--  Por eso `telemetria` guarda `sesion_id` —rotatorio— y no `user_id`.
-- ============================================================================

create extension if not exists postgis;

-- ============================================================================
-- 1. LA RED
-- ============================================================================

create table if not exists paraderos (
    id        text primary key,
    codigo    text not null,
    nombre    text not null,
    ubicacion geography(Point, 4326) not null
);

-- Índice que sostiene «paraderos cercanos», la consulta más frecuente.
create index if not exists paraderos_ubicacion_idx on paraderos using gist (ubicacion);
create index if not exists paraderos_codigo_idx    on paraderos (codigo);

create table if not exists recorridos (
    id           text primary key,
    nombre       text not null,
    destino      text not null default '',
    tipo         smallint not null default 3,   -- 3 = bus, 1 = metro
    -- Franjas horarias con el intervalo oficial, como [inicio, fin, intervalo]
    -- en segundos desde medianoche. La red de Santiago opera por frecuencia.
    frecuencias  jsonb not null default '[]'::jsonb
);

create index if not exists recorridos_nombre_idx on recorridos (nombre);

create table if not exists pasos (
    recorrido_id        text not null references recorridos(id) on delete cascade,
    paradero_id         text not null references paraderos(id) on delete cascade,
    orden               smallint not null,
    -- Metros desde el inicio del recorrido. No viene en el feed de forma
    -- confiable; lo calcula la ingesta, y sin él no hay motor de estimación.
    distancia_recorrida double precision,
    primary key (recorrido_id, orden)
);

create index if not exists pasos_paradero_idx on pasos (paradero_id);

-- ============================================================================
-- 2. LOS DATOS DE LA GENTE
-- ============================================================================

-- Perfil mínimo. No hay registro: `auth.uid()` viene del inicio de sesión
-- anónimo, así que la fila se crea sola la primera vez que la persona abre la
-- app y nunca se le pide un correo.
create table if not exists perfiles (
    id             uuid primary key references auth.users(id) on delete cascade,
    creado_en      timestamptz not null default now(),
    visto_en       timestamptz not null default now(),
    reputacion     integer not null default 0,
    aporta_datos   boolean not null default false  -- consentimiento explícito
);

create table if not exists favoritos (
    usuario_id  uuid not null references auth.users(id) on delete cascade,
    paradero_id text not null references paraderos(id) on delete cascade,
    creado_en   timestamptz not null default now(),
    primary key (usuario_id, paradero_id)
);

-- Posiciones aportadas por usuarios a bordo.
--
-- OJO: `sesion_id` es un identificador rotatorio del viaje, NO el del usuario.
-- Es deliberado y es la pieza central del diseño de privacidad.
create table if not exists telemetria (
    id           bigserial primary key,
    sesion_id    uuid not null,
    recorrido_id text references recorridos(id) on delete set null,
    ubicacion    geography(Point, 4326) not null,
    velocidad_ms real,
    precision_m  real,
    observado_en timestamptz not null default now(),
    confianza    real not null default 0
);

create index if not exists telemetria_tiempo_idx    on telemetria (observado_en desc);
create index if not exists telemetria_recorrido_idx on telemetria (recorrido_id, observado_en desc);

-- Llegadas efectivamente observadas. Es la verdad de terreno con la que se
-- mide el error de la fuente oficial (docs/04 §4.6).
create table if not exists llegadas_observadas (
    id           bigserial primary key,
    paradero_id  text not null references paraderos(id) on delete cascade,
    recorrido_id text not null references recorridos(id) on delete cascade,
    ocurrida_en  timestamptz not null,
    origen       text not null default 'telemetria'
);

create index if not exists llegadas_paradero_idx on llegadas_observadas (paradero_id, ocurrida_en desc);

-- ============================================================================
-- 3. SEGURIDAD POR FILA
-- ============================================================================
--
-- En Supabase la app habla DIRECTO con la base. Sin estas políticas,
-- cualquiera con la llave pública lee las tablas completas. No son un ajuste
-- posterior: son la única barrera que hay.

alter table paraderos           enable row level security;
alter table recorridos          enable row level security;
alter table pasos               enable row level security;
alter table perfiles            enable row level security;
alter table favoritos           enable row level security;
alter table telemetria          enable row level security;
alter table llegadas_observadas enable row level security;

-- La red es pública y de sólo lectura. La escritura queda para la llave de
-- servicio, que omite estas políticas y vive sólo en el proceso de ingesta.
drop policy if exists "red legible por cualquiera" on paraderos;
create policy "red legible por cualquiera" on paraderos for select using (true);

drop policy if exists "recorridos legibles por cualquiera" on recorridos;
create policy "recorridos legibles por cualquiera" on recorridos for select using (true);

drop policy if exists "pasos legibles por cualquiera" on pasos;
create policy "pasos legibles por cualquiera" on pasos for select using (true);

-- Cada persona ve y edita sólo su propio perfil.
drop policy if exists "perfil propio" on perfiles;
create policy "perfil propio" on perfiles
    for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "favoritos propios" on favoritos;
create policy "favoritos propios" on favoritos
    for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- Telemetría: se puede aportar, no se puede leer.
--
-- No hay política de SELECT a propósito. Ni siquiera quien envió un punto
-- puede recuperarlo: sólo la llave de servicio agrega estos datos. Es lo que
-- hace que una filtración de la llave pública no exponga trayectorias.
drop policy if exists "aportar telemetria" on telemetria;
create policy "aportar telemetria" on telemetria
    for insert to authenticated with check (true);

-- Las llegadas observadas sí son públicas: son el dato agregado que mejora la
-- estimación para todos, y no identifican a nadie.
drop policy if exists "llegadas legibles" on llegadas_observadas;
create policy "llegadas legibles" on llegadas_observadas for select using (true);

drop policy if exists "aportar llegadas" on llegadas_observadas;
create policy "aportar llegadas" on llegadas_observadas
    for insert to authenticated with check (true);

-- ============================================================================
-- 4. CONSULTAS DE LA APP
-- ============================================================================
--
-- El cuerpo de una función se revisa al crearla, usando el search_path de la
-- sesión y no el que la propia función declara. En Supabase PostGIS vive en el
-- esquema `extensions`, así que sin esta línea las llamadas a st_makepoint y
-- st_dwithin no se resuelven y las tres funciones fallan al crearse —aunque las
-- tablas, que sí se habían creado antes, queden bien.

set search_path = public, extensions;

-- Paraderos dentro de un radio, ordenados por cercanía.
-- Se llama desde la app con supabase.rpc('paraderos_cercanos', {...}).
create or replace function public.paraderos_cercanos(
    lat double precision,
    lon double precision,
    radio_m double precision default 500,
    tope integer default 20
)
returns table (
    id text,
    codigo text,
    nombre text,
    lat_paradero double precision,
    lon_paradero double precision,
    distancia_m double precision
)
language sql
stable
set search_path = public, extensions
as $$
    select
        p.id,
        p.codigo,
        p.nombre,
        st_y(p.ubicacion::geometry),
        st_x(p.ubicacion::geometry),
        st_distance(p.ubicacion, st_makepoint(lon, lat)::geography)
    from public.paraderos p
    where st_dwithin(p.ubicacion, st_makepoint(lon, lat)::geography, radio_m)
    order by 6
    limit tope;
$$;

-- Recorridos que sirven un paradero, con su frecuencia oficial.
create or replace function public.recorridos_de_paradero(paradero text)
returns table (
    id text,
    nombre text,
    destino text,
    tipo smallint,
    frecuencias jsonb
)
language sql
stable
set search_path = public
as $$
    select distinct r.id, r.nombre, r.destino, r.tipo, r.frecuencias
    from public.pasos s
    join public.recorridos r on r.id = s.recorrido_id
    where s.paradero_id = paradero
    order by r.nombre;
$$;

-- Crea el perfil la primera vez y refresca la última visita.
create or replace function public.registrar_visita()
returns void
language plpgsql
set search_path = public
as $$
begin
    insert into public.perfiles (id) values (auth.uid())
    on conflict (id) do update set visto_en = now();
end;
$$;


-- ============================================================================
-- 5. FUNCIONES PREMIUM
-- ============================================================================
--
-- Se agregó el 19 de septiembre de 2026. Ejecutar este bloque sobre una base
-- que ya tenga el esquema anterior; es idempotente.

set search_path = public, extensions;

-- Rutinas del usuario.
--
-- «Todos los días hábiles tomo la micro a las 7:40 en el paradero PA420.» Con
-- eso la app puede avisar quince minutos antes sin que la persona abra nada.
create table if not exists rutinas (
    id            uuid primary key default gen_random_uuid(),
    usuario_id    uuid not null references auth.users(id) on delete cascade,
    paradero_id   text not null references paraderos(id) on delete cascade,
    -- Opcional: una línea concreta. Si va en null, se muestran todas las del
    -- paradero, que es lo habitual cuando cualquiera de varias sirve.
    recorrido_id  text references recorridos(id) on delete set null,
    -- Minutos desde medianoche, hora de Santiago.
    hora          smallint not null check (hora between 0 and 1439),
    -- Días en que aplica: 1 = lunes … 7 = domingo.
    dias          smallint[] not null default '{1,2,3,4,5}',
    aviso_minutos smallint not null default 15 check (aviso_minutos between 1 and 60),
    activa        boolean not null default true,
    creada_en     timestamptz not null default now()
);

create index if not exists rutinas_usuario_idx on rutinas (usuario_id);

-- Registro de consultas, para las estadísticas personales.
--
-- Guarda QUÉ se consultó, no dónde estaba la persona. Es distinto de la
-- telemetría y por eso va en otra tabla: aquí el identificador del usuario sí
-- corresponde, porque son sus propias estadísticas.
create table if not exists consultas (
    id           bigserial primary key,
    usuario_id   uuid not null references auth.users(id) on delete cascade,
    paradero_id  text not null references paraderos(id) on delete cascade,
    recorrido_id text references recorridos(id) on delete set null,
    espera_s     integer,
    consultada_en timestamptz not null default now()
);

create index if not exists consultas_usuario_idx on consultas (usuario_id, consultada_en desc);

-- Estado de la suscripción.
--
-- Se escribe desde el servidor cuando la tienda confirma un pago. La app sólo
-- lee: si pudiera escribir, cualquiera se regalaría premium editando la
-- petición.
create table if not exists suscripciones (
    usuario_id uuid primary key references auth.users(id) on delete cascade,
    activa     boolean not null default false,
    hasta      timestamptz,
    origen     text not null default 'ninguno',  -- app_store | play_store | cortesia
    creada_en  timestamptz not null default now()
);

alter table rutinas       enable row level security;
alter table consultas     enable row level security;
alter table suscripciones enable row level security;

drop policy if exists "rutinas propias" on rutinas;
create policy "rutinas propias" on rutinas
    for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists "consultas propias" on consultas;
create policy "consultas propias" on consultas
    for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

-- La suscripción se lee, no se escribe: el cliente no puede regalarse premium.
drop policy if exists "suscripcion propia legible" on suscripciones;
create policy "suscripcion propia legible" on suscripciones
    for select using (auth.uid() = usuario_id);

-- Estadísticas personales: cuánto espera y qué línea le falla más.
create or replace function public.mis_estadisticas(desde_dias integer default 30)
returns table (
    consultas_totales bigint,
    espera_media_s numeric,
    paradero_habitual text,
    recorrido_habitual text
)
language sql
stable
set search_path = public
as $$
    with propias as (
        select * from public.consultas
        where usuario_id = auth.uid()
          and consultada_en > now() - make_interval(days => desde_dias)
    )
    select
        (select count(*) from propias),
        (select round(avg(espera_s)) from propias where espera_s is not null),
        (select paradero_id from propias group by paradero_id
         order by count(*) desc limit 1),
        (select recorrido_id from propias where recorrido_id is not null
         group by recorrido_id order by count(*) desc limit 1);
$$;

-- Comprobación del servidor de Kupay.
--
-- Pégalo completo en Supabase → SQL Editor → Run.
--
-- Devuelve una fila por cosa que tiene que existir, con OK o FALTA. Si todo
-- sale OK, el servidor está listo. No modifica nada: sólo mira.

with esperado(orden, grupo, nombre) as (values
    (1, 'tabla', 'paraderos'),
    (1, 'tabla', 'recorridos'),
    (1, 'tabla', 'pasos'),
    (1, 'tabla', 'perfiles'),
    (1, 'tabla', 'favoritos'),
    (1, 'tabla', 'telemetria'),
    (1, 'tabla', 'llegadas_observadas'),
    (1, 'tabla', 'rutinas'),
    (1, 'tabla', 'consultas'),
    (1, 'tabla', 'suscripciones'),
    (2, 'función', 'paraderos_cercanos'),
    (2, 'función', 'recorridos_de_paradero'),
    (2, 'función', 'registrar_visita'),
    (2, 'función', 'mis_estadisticas')
),
presente as (
    select 'tabla' as grupo, table_name as nombre
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    union all
    select 'función', routine_name
    from information_schema.routines
    where routine_schema = 'public'
)
select
    e.orden,
    e.grupo,
    e.nombre,
    case when p.nombre is null then '❌ FALTA' else '✅ OK' end as estado
from esperado e
left join presente p on p.grupo = e.grupo and p.nombre = e.nombre

union all

-- Seguridad por fila encendida en las tablas con datos de personas.
select 3, 'seguridad', c.relname,
       case when c.relrowsecurity then '✅ OK' else '❌ SIN RLS' end
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('perfiles','favoritos','telemetria','rutinas','consultas','suscripciones')

union all

-- La suscripción tiene que ser de sólo lectura desde la app: si el cliente
-- pudiera escribirla, cualquiera se regalaría premium.
select 4, 'suscripciones', 'sólo lectura desde la app',
       case when count(*) filter (where cmd <> 'SELECT') = 0
            then '✅ OK' else '❌ HAY POLÍTICA DE ESCRITURA' end
from pg_policies where schemaname = 'public' and tablename = 'suscripciones'

union all

-- Datos de la red ya cargados.
select 5, 'datos', 'paraderos cargados',
       case when count(*) > 0 then '✅ ' || count(*) || ' paraderos' else '❌ VACÍO' end
from paraderos

union all

select 5, 'datos', 'recorridos cargados',
       case when count(*) > 0 then '✅ ' || count(*) || ' recorridos' else '❌ VACÍO' end
from recorridos

union all

-- Inicio de sesión anónimo: si está activo, deberían aparecer usuarios
-- anónimos en cuanto alguien abra la app.
select 6, 'sesión anónima', 'usuarios anónimos registrados',
       case when count(*) > 0
            then '✅ ' || count(*) || ' usuario(s) — está activo'
            else '⚠️ NINGUNO todavía — abre la app una vez y vuelve a correr esto' end
from auth.users where is_anonymous

order by 1, 2, 3;

# Servidor — Supabase

Instrucciones para dejar el servidor andando. Son cinco pasos y no hay que
programar nada.

---

## 1. Crear el proyecto

En [supabase.com](https://supabase.com), **New project**:

- **Name:** buschecker *(o el nombre que definas)*
- **Database Password:** genera una y **guárdala**, se usa en el paso 4
- **Region:** `South America (São Paulo)` — es la más cercana a Chile y baja la
  latencia frente a las regiones de Estados Unidos

El proyecto demora un par de minutos en quedar listo.

---

## 2. Crear las tablas

En el panel, **SQL Editor → New query**. Pega el contenido completo de
[`esquema.sql`](esquema.sql) y aprieta **Run**.

Crea las tablas, los índices geográficos, las políticas de seguridad y las tres
consultas que usa la app. Se puede volver a ejecutar sin romper nada.

---

## 3. Activar el inicio de sesión anónimo

**Authentication → Sign In / Providers → Anonymous Sign-ins → activar.**

Esto es lo que permite reconocer a cada usuario y llevar su cuenta **sin
pantalla de registro**: la app crea la sesión sola al abrirse.

---

## 4. Subir la red de Santiago

Los datos ya están listos en [`datos/`](datos/). **No hay que instalar nada**:
se importan desde el navegador.

### El orden importa

Las tablas se apuntan entre sí, así que hay que importarlas en este orden. Si se
hace al revés, Supabase rechaza las filas.

| # | Archivo | Tabla | Filas |
|---|---|---|---|
| 1 | `datos/1-paraderos.csv` | `paraderos` | 3.748 |
| 2 | `datos/2-recorridos.csv` | `recorridos` | 288 |
| 3 | `datos/3-pasos.csv` | `pasos` | 9.375 |

### Cómo importar cada uno

1. En Supabase, menú izquierdo → **Table Editor**
2. Elige la tabla en la lista
3. Arriba a la derecha, botón **Insert** → **Import data from CSV**
4. Arrastra el archivo, revisa que las columnas calcen, y confirma

Repite con los tres, en orden.

### Para comprobar que quedó bien

**SQL Editor → New query**, pega esto y dale **Run**:

```sql
select 'paraderos' as tabla, count(*) from paraderos
union all select 'recorridos', count(*) from recorridos
union all select 'pasos',      count(*) from pasos;
```

Deberían salir 3748, 288 y 9375.

Y esta comprueba que las coordenadas quedaron bien guardadas — busca paraderos a
500 m de La Moneda:

```sql
select codigo, nombre, round(distancia_m) as metros
from paraderos_cercanos(-33.4429, -70.6539, 500, 5);
```

### Si la importación falla

El caso más probable es la columna `ubicacion`, que no es texto común sino un
punto geográfico. Si Supabase la rechaza, avísame y te paso los datos en otro
formato.

### Alternativa: hacerlo por comando

Sirve para **actualizar el feed** más adelante sin repetir la importación a
mano. Requiere Python.

```bash
cd backend
pip install -r requirements.txt
python -m gtfs.cli subir data/GTFS.zip \
    --recuadro=-33.52,-33.40,-70.72,-70.53 \
    --dsn "LA-CADENA-DE-CONEXION"
```

Para la cadena de conexión: botón verde **Connect** arriba en el panel →
pestaña **Session pooler** → copia la URI y reemplaza `[YOUR-PASSWORD]`.

> **Usa la del pooler, no la directa.** La conexión directa
> (`db.PROYECTO.supabase.co`) sólo responde por IPv6, y la mayoría de las
> conexiones domiciliarias en Chile no lo tienen. La del pooler funciona en
> ambos casos.

Todo ocurre dentro de una transacción: si algo falla a medio camino, la base
queda como estaba en vez de quedar a medio cargar.

---

## 5. Conectar la app

**Settings → API**, copia `Project URL` y la llave `anon public`.

```bash
cd movil
cp .env.example .env
```

Edita `.env` con esos dos valores y reinicia `npx expo start`.

---

## Sobre las llaves

| Llave | Dónde va | Por qué |
|---|---|---|
| `anon` | Dentro de la app | Es **pública por diseño**. Lo que protege los datos son las políticas de seguridad por fila, no el secreto de la llave |
| `service_role` | **Sólo en el servidor** | Omite todas las políticas. Si llega a la app, cualquiera la extrae del binario |
| Contraseña de la base | **Sólo en tu terminal** | Acceso total a la base |

`movil/.env` está en `.gitignore`. No lo subas al repositorio.

---

## Lo que el esquema protege

La regla que sostiene el diseño de privacidad (`../docs/03-arquitectura.md`
§3.7b):

> **El identificador del usuario y su trayectoria de ubicación no comparten
> llave.**

Por eso la tabla `telemetria` guarda un `sesion_id` rotatorio y no el
`user_id`. Y por eso **no tiene política de lectura**: ni siquiera quien envió
un punto puede recuperarlo. Sólo la llave de servicio agrega esos datos.

Si ambas cosas compartieran llave, esta base contendría el mapa de movimientos
de cada persona asociado a su identidad.

---

## Costo

El plan gratuito alcanza para desarrollar y para las primeras pruebas con
usuarios reales. El plan de pago ronda los USD 25 mensuales, dentro del
presupuesto. *(Verificar precios vigentes al contratar.)*

Lo primero que va a crecer es la **telemetría**: si cada usuario a bordo envía
una posición cada 15 segundos, mil usuarios activos son unas 67 escrituras por
segundo. Por eso la app tiene que agrupar los envíos en tandas en vez de mandar
puntos sueltos, y conviene mirar el uso desde el principio.

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

Necesitas la cadena de conexión: **Settings → Database → Connection string →
URI**. Reemplaza `[YOUR-PASSWORD]` por la del paso 1.

```bash
cd backend
pip install -r requirements.txt

# Primero sin conectarse, sólo para ver cuánto se va a subir
python -m gtfs.cli subir data/GTFS.zip --recuadro=-33.52,-33.40,-70.72,-70.53 --solo-contar

# Ahora sí
python -m gtfs.cli subir data/GTFS.zip \
    --recuadro=-33.52,-33.40,-70.72,-70.53 \
    --dsn "postgresql://postgres:TU-PASSWORD@db.TU-PROYECTO.supabase.co:5432/postgres"
```

Sube unos 3.700 paraderos, 288 recorridos y 9.400 pasos. Todo ocurre dentro de
una transacción: si algo falla a medio camino, la base queda como estaba en vez
de quedar a medio cargar.

> El recuadro acota la zona a Santiago centro-oriente. Para subir toda la Región
> Metropolitana, omite `--recuadro`; son bastantes más filas.

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

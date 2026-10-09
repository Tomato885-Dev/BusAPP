# 08 — Plan de trabajo

Qué está hecho, qué sigue, y quién hace cada cosa.

**Este documento se actualiza.** Es la lista viva del proyecto: cuando algo se
termina, se marca y se pasa al siguiente.

- 🧑 = lo haces tú *(necesita tu identidad, tu tarjeta o tu decisión)*
- 🤖 = lo hago yo *(código)*

---

## Lo que ya está funcionando

| | |
|---|---|
| ✅ | **Documentación completa** — 9 documentos: producto, arquitectura, motor, negocio |
| ✅ | **App** con mapa, llegadas por paradero, planificador de viajes y favoritos |
| ✅ | **Publicada en internet** → tomato885-dev.github.io/BusAPP |
| ✅ | **Datos reales del DTPM** — 12.880 paraderos, 427 recorridos, frecuencias oficiales |
| ✅ | **Ingesta del feed** con 39 pruebas automáticas |
| ✅ | **Servidor Supabase** con la red cargada y verificada |

**Gasto hasta ahora: CLP 0.**

---

# BLOQUE 1 — Ahora

> **El 9 de octubre el DTPM concedió el acceso al posicionamiento de la flota.**
> Era el riesgo número uno del proyecto y estuvo nueve meses en la lista. Lo
> resolvió un correo. Todo lo de abajo está ordenado según eso.

| | Qué | Dónde | Cuánto |
|---|---|---|---|
| **1.1** | **Mandarme los dos adjuntos del correo** ⭐ | Tu correo | 2 min |
| 1.2 | Contratar un servidor con IP fija | Internet | 30 min · ~USD 5/mes |
| 1.3 | Grabar 3 viajes en micro | Tu teléfono | 2 h repartidas |
| 1.4 | Pedir la licencia por Transparencia | Portal | 20 min |
| 1.5 | Guardar la clave de Stadia | GitHub | 10 min |

## 1.1 🧑 Mandarme los dos adjuntos ⭐ ES LO QUE BLOQUEA TODO

El correo del DTPM traía el documento que explica el formato de los servicios y
un archivo llamado `serviciodeco`. **Sin eso no puedo escribir el adaptador**:
no sé si la respuesta es XML o JSON, cómo se identifica cada bus, qué campo trae
el recorrido ni cada cuánto se actualiza.

El motor que convierte posiciones en «viene / no viene» **ya está escrito y
probado**. Lo único que falta es traducir el formato de ellos al nuestro.

**Súbelos a `datos-terreno/` o mándamelos por acá.**

> ⚠️ **La contraseña no.** Ni acá ni en el repositorio, que es público. Va en las
> variables de entorno del servidor, y ahí sólo entras tú. Lo que hiciste de
> inventarte unas credenciales falsas para contarme fue exactamente lo correcto.

## 1.2 🧑 Un servidor con IP fija

El formulario pedía registrar la IP pública desde donde se consume el servicio,
y respondimos «por definir». Hay que definirla, y hace falta **dos veces**:
para pasar las posiciones a producción, y para pedir el predictor oficial, donde
es requisito de entrada.

Sirve cualquier servidor chico: **del orden de USD 5 al mes**, dentro del
presupuesto. Hetzner, DigitalOcean o Vultr, el plan más barato.

**No sirve la conexión de tu casa:** la IP cambia sola y el acceso se caería.

Cuando lo tengas, dime la IP y preparo el aviso al DTPM.

## 1.3 🧑 Grabar viajes en micro *(bajó de prioridad, pero sigue sirviendo)*

Ya no es lo que puede hundir el proyecto. Con las posiciones oficiales la app
funciona sin telemetría de usuarios, así que esto pasó de **cimiento** a
**mejora**: sirve para explicar por qué un bus no avanza y para cubrir los
huecos de la fuente oficial.

El analizador está escrito y probado (`14`). Sobre trazas sintéticas acierta el
93%; tus grabaciones dirán cuánto sobrevive a la calle.

El protocolo está en `10-prueba-de-terreno.md`. Lo esencial: apretar *grabar*
**antes de salir de tu casa** y pararlo **después de bajarte**.

## 1.4 🧑 Pedir la licencia por Transparencia

El DTPM respondió que **no hay una cláusula que restrinja el uso**. Eso es la
ausencia de una prohibición, no la presencia de un permiso, y para cobrar hace
falta lo segundo.

Ellos mismos indicaron el camino:

> https://www.portaltransparencia.cl → crear usuario → *Solicitud de acceso a
> la información* → **Ministerio de Transportes y Telecomunicaciones
> (Subsecretaría de Transportes)**

Plazo legal: **20 días hábiles**. Pídemelo y te redacto el texto.

**No bloquea nada** —se puede construir mientras llega— pero conviene tenerlo
antes de cobrarle a alguien, y antes de publicar en las tiendas.

## 1.5 🧑 Guardar la clave de Stadia Maps

Sin esta clave el mapa usa Esri, **que no tiene teselas sobre el zoom 16**: por
eso la app tiene el acercamiento limitado ahí. Con la clave se llega a 19.

1. Crear cuenta en `stadiamaps.com` → *Manage Properties* → copiar la **API key**.
2. GitHub → el repositorio → **Settings** → *Secrets and variables* → *Actions*
   → **New repository secret**.
3. Nombre exacto: `STADIA_API_KEY`.

- [ ] Clave guardada como secreto `STADIA_API_KEY` en GitHub

---

## ✅ Hecho

| | | |
|---|---|---|
| Correr `esquema.sql` | Supabase | 20-09 |
| Activar el inicio de sesión anónimo | Supabase | 20-09 |
| Enviar la solicitud al DTPM | correo | 20-09 |
| **Respuesta del DTPM: acceso concedido** | | **09-10** |

---

# BLOQUE 2 — Este mes

## 2.1 ✅ Decidir el nombre — **Kupay**

Hecho. *Küpay* es «viene» en mapudungun: el nombre dice literalmente lo que la
app responde. El razonamiento completo está en `09-nombre.md`.

Ya está aplicado en el código. Lo que falta es tuyo, y hay que hacerlo **antes**
de encargar un logo o difundir el proyecto:

- [ ] App Store (tienda chilena)  - [ ] Google Play
- [ ] Dominio `.cl` y `.app`      - [ ] Instagram
- [ ] **INAPI** — revisar en particular la marca **Kuapay**, una empresa de
      pagos que operó en Chile y suena casi igual
- [ ] Confirmar la traducción con una persona hablante de mapudungun

## 2.2 🧑 Definir el estilo

Lo que más me sirve, y toma dos minutos:

**Respondido el 20-09: Instagram y SoSafe.**

Las dos referencias coinciden en algo, y no es el color:

**Instagram** no tiene interfaz visible. El contenido ocupa la pantalla entera y
los controles son íconos de línea monocromos, del mismo grosor, sin relleno y
sin color salvo donde hay una acción. El color aparece en un solo lugar y por
eso significa algo.

**SoSafe** es mapa a pantalla completa con una hoja abajo y **una** acción
principal evidente. Es exactamente la forma que Kupay ya tiene, lo que confirma
que la estructura está bien y el problema era el acabado.

**Qué se tomó de ahí, concretamente:** el juego de íconos. Eran caracteres de
texto —`≡`, `◷`, `★`, `⌕`—, cada uno de un tipógrafo distinto, con otro grosor y
otro centrado, así que ninguna fila se veía pareja. Era lo que más hacía ver la
interfaz vieja. Ahora están dibujados, todos con **el mismo grosor de trazo que
el símbolo de la marca** (`12`).

Queda pendiente de esta línea: reducir el color a donde hay acción, que es la
otra lección de Instagram.

Y el color de marca: hoy es teal apagado, elegido por la investigación de
calma. ¿Lo dejamos o prefieres otro? `______________`

## 2.3 🧑 Borrar tus direcciones del historial *(privacidad)*

El repositorio es **público**. En el código de hoy no hay ninguna dirección
tuya, pero **dos commits antiguos** todavía las contienen (`c2a5f4c` y
`1dc8a1f`, con «La Capitanía 436» y «Camino Los Siervos 1280»). Quien clone el
repositorio las ve.

Limpiarlas requiere reescribir el historial, que es una operación que cambia
todos los identificadores de commit. **Es tu decisión y no la tomo solo.**
Dime «límpialo» y lo hago.

## 2.4 🤖 Widget de rutina

La función premium principal (`07` §7.4). Empiezo por la versión donde el
usuario elige su paradero y su hora; aprender la rutina sola viene después.

**Necesito de ti antes:** nada. Puedo empezar cuando digas.

## 2.5 🤖 Terminar la conexión con el servidor

Que los favoritos, el perfil y el historial vivan en Supabase de punta a punta.

**Necesito de ti:** que esté hecho el punto 1.2.

---

# BLOQUE 3 — Cuando quieras publicar

## 3.1 🧑 Cuentas de desarrollador

| Cuenta | Costo | Para qué |
|---|---|---|
| **Google Play** | USD 25, pago único | Publicar en Android |
| **Apple Developer** | USD 99 al año | Publicar en iPhone, y el widget |

> **Empieza por Google Play.** Es cuatro veces más barata, la revisión es menos
> estricta, y es donde está la mayoría del mercado chileno.

Al contratar Apple: **inscríbete en el Small Business Program**. Es la
diferencia entre que Apple se quede con 15% o con 30%.

## 3.2 🧑 Textos legales

- [ ] Política de privacidad  - [ ] Términos de uso

🤖 Te redacto los borradores. **Deben ser revisados por un abogado** antes de
publicarse: manejamos datos de ubicación.

## 3.3 🧑 Elegir la zona de lanzamiento

La decisión estratégica más importante del proyecto.

Necesitas ~5% de los pasajeros de un corredor para que el motor funcione. Eso es
alcanzable en **una comuna**, e imposible disperso en toda la región.

**Zona elegida:** `______________________`

## 3.4 🤖 Preparar la app para las tiendas

Íconos, pantalla de carga, textos de permisos, compilación firmada.

**Necesito de ti:** el nombre (2.1), el estilo (2.2) y las cuentas (3.1).

---

# BLOQUE 4 — El diferenciador *(meses 3 a 12)*

Esto es lo que hace único al producto. **Depende de que el bloque 1.1 salga
bien.**

| | Qué | Quién |
|---|---|---|
| 4.1 | Motor de inferencia de recorrido | 🤖 |
| 4.2 | Recolección de telemetría con consentimiento | 🤖 |
| 4.3 | Fusión de las dos fuentes y ETA con confianza | 🤖 |
| 4.4 | **Detección de «esta micro no viene»** | 🤖 |
| 4.5 | Ubicación en segundo plano y revisión de tiendas | 🤖 + 🧑 |
| 4.6 | Asesoría legal en privacidad | 🧑 |

---

# BLOQUE 5 — Ganar dinero *(en paralelo, desde ya)*

No esperes a terminar la app. Esto corre aparte (`07` §7.7c).

## 5.1 🧑 Hablar con compradores del dato

Un municipio tarda meses en comprar. **Si la conversación parte ahora, el
producto llega con clientes esperando.**

Por orden de facilidad: consultoras e inmobiliarias → operadores de buses →
municipios → DTPM.

- [ ] Primer contacto hecho con: `______________________`

## 5.2 🤖 Herramienta de estudios de accesibilidad

Le das una dirección y devuelve un informe: cuántas líneas la sirven, a qué
distancia está el paradero, cuánto se demora al centro.

**Es lo primero vendible del proyecto y no necesita ni un solo usuario** — el
dato ya está cargado en tu Supabase.

**Necesito de ti:** que me digas que sí. Lo construyo cuando quieras.

## 5.3 🧑 Vender un estudio

Uno solo. Prueba que alguien paga, y eso vale más que cualquier proyección.

---

# Si sólo haces tres cosas

1. **Mándame los dos adjuntos del correo** (1.1) — dos minutos, y es lo único
   que separa la app de tener buses de verdad
2. **Contrata el servidor con IP fija** (1.2) — lo necesitas dos veces y tarda
   más en llegar de lo que uno cree
3. **Graba los viajes en micro** (1.3) — ya no es urgente, pero es lo que hace
   a Kupay mejor que las demás y no sólo igual

---

# Lo que necesito de ti, resumido

| Cuándo | Qué |
|---|---|
| **Ahora** | Los dos adjuntos del DTPM · servidor con IP fija |
| **Pronto** | Trazas GPS · licencia por Transparencia · clave de Stadia |
| **Este mes** | Registrar el nombre · decidir si limpiamos el historial |
| **Al publicar** | Cuentas de tiendas · zona de lanzamiento · abogado |
| **Siempre** | Decirme qué se ve mal cuando pruebes la app |

Lo último es lo más valioso. Cada vez que abriste la app y me dijiste «esto está
raro», encontramos un error real que ni las pruebas ni el análisis detectaban.

# datos-terreno

Aquí van los archivos `.gpx` de los viajes grabados en micro. El instructivo
completo está en [`docs/10-prueba-de-terreno.md`](../docs/10-prueba-de-terreno.md).

Nombre de los archivos: `AAAA-MM-DD_recorrido_referencia.gpx`

```
2026-09-22_506_a-la-u.gpx
```

Y en `viajes.md`, una línea por viaje con el recorrido real.

## Qué pasa cuando subas un archivo

```sh
cd backend && python -m trazas.cli analizar ../datos-terreno/*.gpx --detalle
```

Devuelve, para cada grabación: en qué tramos ibas caminando y en cuáles a
bordo, y con qué recorrido empareja cada tramo a bordo. El método y sus límites
están en [`docs/14-emparejamiento.md`](../docs/14-emparejamiento.md).

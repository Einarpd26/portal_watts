// MapLibre 6 deriva la URL de su worker de su propio archivo, algo que el empaquetador no
// resuelve: sin esta copia el mapa queda en blanco en producción (ADR-002 §4).
// El worker se sirve desde public/maplibre/ y MapaTerritorial lo registra con setWorkerUrl.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('public/maplibre', { recursive: true });
copyFileSync('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', 'public/maplibre/maplibre-gl-worker.mjs');

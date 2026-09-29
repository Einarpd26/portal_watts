# Tokens de Marca y Guía de Estilos — Portal Watts

> **Base:** Diseños sugeridos en base al manual de marca y colores corporativos de Caramelos Watts S.R.L.
> **Propósito:** Guiar la implementación de la identidad visual corporativa en Portal Watts.

---

## 1. Alcance de la Guía

Esta guía define los tokens visuales y los contratos de componentes base que debe respetar cualquier pantalla de Portal Watts:

- Paleta de colores corporativos y semánticos
- Tipografía corporativa (Plus Jakarta Sans)
- Radios, sombras y patrones de marca (gradientes, textura, orbs)
- Contratos visuales de los componentes atómicos: Button, Input, Card, Alert, Spinner
- Estructura del header / navegación por rol y su variante mobile
- Estructura de referencia para la pantalla de Login

---

## 2. Paleta de Colores

### 2.1 Primario — Rojo Watts (`primary`)

El rojo es el color corporativo. Escala completa de 50 a 900 y sus tokens derivados:

| Token | Valor | Uso |
|---|---|---|
| `--color-primary-50` | `#fef2f2` | Fondos suaves, badges, botón `danger` |
| `--color-primary-100` | `#fee2e2` | Hover de fondos suaves |
| `--color-primary-200` | `#fecaca` | Bordes de estados `info`/`danger` |
| `--color-primary-300` | `#fca5a5` | — |
| `--color-primary-400` | `#f87171` | — |
| `--color-primary-500` | `#ef4444` | — |
| `--color-primary-600` | `#dc2626` | **Color de acción principal** (botones, focus, links, spinner) |
| `--color-primary-700` | `#b91c1c` | Hover de botón primario |
| `--color-primary-800` | `#991b1b` | Gradiente de login (paso medio) |
| `--color-primary-900` | `#7f1d1d` | **Gradientes de marca** (login y header) |

Variables derivadas (CSS):

```css
:root {
  --color-primary: #dc2626;        /* = primary-600 */
  --color-primary-hover: #b91c1c;  /* = primary-700 */
  --color-primary-light: #fef2f2;  /* = primary-50 */
}
```

### 2.2 Semánticos

| Token | Valor | Uso |
|---|---|---|
| `success-50/100/200/500-900` | Escala verde (`#f0fdf4` → `#14532d`) | Alertas de éxito (base `#22c55e`) |
| `error-50/100/200/500-900` | Escala roja | Alertas/errores de formulario (base `#ef4444`) |
| `warning` | `yellow-50/200/800/900` | Alertas de advertencia |
| `info` | reutiliza `primary` | Alertas informativas |

### 2.3 Neutros de Fondo

| Token | Valor | Uso |
|---|---|---|
| `bg-gray-50` | `#f8fafc` / `#f9fafb` | Fondo de toda la app (body y páginas) |
| `text-gray-900` | `#111827` | Texto principal |
| `text-gray-500` | labels, secundarios | — |
| `text-gray-600` | descripciones | — |
| `border-gray-200` | `#e5e7eb` | Bordes de inputs/cards |

---

## 3. Tipografía — Plus Jakarta Sans

> **Decisión (rama `design/tokens-de-marca`):** se reemplaza **DM Sans** por **Plus Jakarta Sans** como tipografía corporativa. Se buscaba una familia más estética y con más carácter en títulos y números, manteniendo la calma de lectura en tablas y densidades del portal. Candidatas evaluadas: Plus Jakarta Sans, Manrope, Outfit, pairing Space Grotesk + Manrope.

- **Familia:** `'Plus Jakarta Sans', system-ui, sans-serif`
- **Pesos cargados con `next/font/google`:** 400, 500, 600, 700, 800 (la variable de Google Fonts soporta 200–800).
- **Uso de pesos:** títulos `font-extrabold` (800), labels `font-semibold uppercase` (600), cuerpo `font-medium`/normal (400/500).

> ⚠️ **Nota de implementación:** Portal Watts usa **Next.js 16** — usar `next/font/google` (`Plus_Jakarta_Sans`) en vez del `<link>` de Google Fonts para evitar layout shift y bloqueo de renderizado. En Pages Router, el patrón es idéntico al del boilerplate original con Geist: definir la fuente con `variable` en el Custom App (`_app.tsx`) y consumirla vía `@theme` en el CSS.

```ts
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});
```

```css
@theme {
  --font-sans: var(--font-plus-jakarta-sans);
}
```

---

## 4. Radios y Sombras

```css
--radius-card:  1.25rem;  /* rounded-card */
--radius-btn:   0.875rem; /* rounded-btn  */
--radius-input: 0.875rem; /* rounded-input */
```

| Sombra | Valor | Uso |
|---|---|---|
| `shadow-card` | `0 1px 4px rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.04)` | Cards |
| `shadow-brand` | `0 4px 16px rgba(220,38,38,.25)` | Botón primario (glow rojo) |
| Login card | `0 24px 64px rgba(0,0,0,.25), 0 4px 16px rgba(0,0,0,.1)` | Card del login |

---

## 5. Patrones de Marca Distintivos

### 5.1 Gradientes de Marca (rojo profundo → rojo vivo)

| Superficie | Degradado |
|---|---|
| **Login / AuthShell** (fondo) | `linear-gradient(140deg, #7f1d1d 0%, #991b1b 35%, #dc2626 100%)` |
| **Header / Navbar** | `linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)` |

### 5.2 Textura y decoración (solo pantallas de autenticación)

1. **Textura diagonal:** `repeating-linear-gradient(-45deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 1px, transparent 1px, transparent 14px)` cubriendo toda la pantalla (`pointer-events-none`).
2. **Orbs decorativos:** dos círculos `rgba(255,255,255,.06)`: uno de `22rem` arriba-derecha (`top:-7rem; right:-6rem`) y otro de `14rem` abajo-izquierda (`bottom:-4rem; left:-3rem`).

### 5.3 Header / Navegación

- Título "Portal Watts" en `text-xl font-extrabold text-white tracking-tight`.
- Tabs de navegación desktop: `text-xs font-semibold`, borde inferior `border-b-2` — activo: `border-white text-white`; inactivo: `border-transparent text-white/60 hover:text-white/90`. Separador superior del nav: `border-top: 1px solid rgba(255,255,255,.15)`.
- Link de ayuda siempre visible al final del nav.
- **Mobile:** hamburguesa (`border-white/40`) + drawer lateral derecho `w-72 bg-white shadow-2xl` con header en gradiente; links activos `bg-red-50 text-red-700 font-semibold`, inactivos `text-gray-700 hover:bg-gray-50`, radios `rounded-xl`.
- **Menú admin:** dropdowns agrupados (`Admin`, `Supervisor`) con items activos `text-red-700 font-semibold bg-red-50`.

### 5.4 Cards

```css
bg-white rounded-card shadow-card p-6
```

Con título opcional `text-base font-bold text-gray-900` + descripción `text-gray-600 text-sm`.

---

## 6. Componentes Atómicos Base (Contratos Visuales)

### Button
- **Variantes:** `primary` (fondo `primary-600` + `shadow-brand`, hover `primary-700` + lift `-translate-y-px`), `secondary` (blanco, borde `gray-200`), `danger` (fondo `primary-50`, borde `primary-200`, texto `primary-600`), `ghost-white` (sobre gradientes: `bg-white/10 border-white/30 text-white`, hover `bg-white/20`).
- **Tamaños:** `sm` `px-3 py-1.5 text-sm` · `md` `px-4 py-2 text-base` · `lg` `px-6 py-3 text-base w-full min-h-[3.25rem]`.
- **Estados:** `disabled`/`isLoading` → `opacity-50 cursor-not-allowed`; loading muestra spinner inline de 16px + texto "Cargando...".
- **Base:** `inline-flex items-center justify-center gap-2 font-bold rounded-btn transition-[background,transform,box-shadow] duration-150`.

### Input
- Label: `font-semibold uppercase tracking-[0.08em] text-gray-500 text-xs` (compact: `text-[10px]`).
- Campo: `rounded-input border-[1.5px] border-gray-200 px-3.5 py-2.5 text-sm`, focus ring rojo: `focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(220,38,38,.15)]`.
- Errores: borde `error-500` con ring `rgba(239,68,68,.15)` + mensaje `text-error-500 text-xs`.
- `showPasswordToggle`: botón de ojo a la derecha (padding derecho `pr-10`).

### Alert
- Estados: `success`/`error`/`info`/`warning` con fondo 50, borde 200, texto 800/900.
- Estructura: `rounded-xl border-[1.5px] p-4`, título `font-semibold` + mensaje `text-sm`, botón de cierre `×`.

### Spinner
- SVG `animate-spin` con anillo `opacity-25` y sector `opacity-75`, color `text-primary-600` (6x6 por defecto).
- `PageLoader`: spinner + texto "Cargando..." centrado `h-64`.

---

## 7. Login de Referencia (Estructura)

1. Fondo: gradiente 140deg de §5.1 + textura diagonal + orbs.
2. Card centrada (`w-full max-w-sm`, `!rounded-3xl`, sombra de login, `gap-7` hacia el contenido).
3. Logo `/watts_logo_rojo.png` de **120×120** `rounded-2xl`, centrado arriba de la card.
4. Alertas de error (query param `?error=pkce-failed` desde callback, o errores de submit).
5. Form `space-y-4`: Input email → Input contraseña (con toggle) → Button `size="lg"` "Iniciar Sesión".
6. Link "¿Olvidaste tu contraseña?" → `text-sm text-primary-600 hover:text-primary-700`.

---

## 8. Aplicación en Tailwind CSS v4

Los tokens se declaran en `src/styles/globals.css` dentro de `@theme` (configuración CSS-first de Tailwind v4, sin archivo de configuración JS).

Bloque `@theme` listo para pegar en `globals.css`:

```css
@theme {
  /* Fuente */
  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;

  /* Primario — Rojo Watts */
  --color-primary-50:  #fef2f2;
  --color-primary-100: #fee2e2;
  --color-primary-200: #fecaca;
  --color-primary-300: #fca5a5;
  --color-primary-400: #f87171;
  --color-primary-500: #ef4444;
  --color-primary-600: #dc2626;
  --color-primary-700: #b91c1c;
  --color-primary-800: #991b1b;
  --color-primary-900: #7f1d1d;

  /* Semánticos */
  --color-success-50:  #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-200: #bbf7d0;
  --color-success-500: #22c55e;
  --color-success-600: #16a34a;
  --color-success-700: #15803d;
  --color-success-800: #166534;
  --color-success-900: #14532d;

  --color-error-50:  #fef2f2;
  --color-error-100: #fee2e2;
  --color-error-200: #fecaca;
  --color-error-500: #ef4444;
  --color-error-600: #dc2626;
  --color-error-700: #b91c1c;
  --color-error-800: #991b1b;
  --color-error-900: #7f1d1d;

  /* Radios */
  --radius-card:  1.25rem;
  --radius-btn:   0.875rem;
  --radius-input: 0.875rem;

  /* Sombras */
  --shadow-card:  0 1px 4px rgba(0,0,0,.06), 0 4px 24px rgba(0,0,0,.04);
  --shadow-brand: 0 4px 16px rgba(220,38,38,.25);
}
```

En v4 las utilidades mapean automáticamente: `bg-primary-600`, `rounded-card`, `shadow-brand`, `shadow-card`, `rounded-btn`, `rounded-input`.

**Fondo base** (junto al bloque):

```css
body {
  background-color: #f8fafc;
  color: #111827;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior-y: contain;
}
```

> Descartar el `@media (prefers-color-scheme: dark)` actual de `globals.css`: la identidad de Portal Watts es light-only (`color-scheme: light`).

---

## 9. Assets de Marca

| Archivo (public/) | Dimensiones | Uso |
|---|---|---|
| `watts_logo_rojo.png` | 4250×1268 (horizontal) | Login (fondo blanco de la card) |
| `watts_logo_blanco.png` | 5041×1497 (horizontal) | Navbar — logo en blanco, directo sobre el gradiente rojo, sin chip |
| `icon-watts.png` | 192×192 (cuadrado) | Favicon / ícono de app |

> El logo horizontal se muestra a 120×120 en el login (recortado por `rounded-2xl`). Para el Navbar se usa la variante blanca a una altura menor (`h-6`/`h-7`) con `width` auto — al ser blanco no necesita el chip de fondo que sí requiere la variante roja para tener contraste.

**Deuda técnica:** `public/manifest.json` (PWA, RNF-06) usa `icon-watts.png` en 192×192 como único ícono. Falta agregar una versión en 512×512 para una pantalla de splash de mejor calidad al instalar en el celular — no bloqueante, la instalación funciona igual sin ella.

---

## 10. Checklist para el Maquetado

- [ ] Aplicar bloque `@theme` + fondo base en `globals.css` (quitar dark mode).
- [ ] Cargar Plus Jakarta Sans con `next/font/google` y vincular `--font-sans`.
- [ ] `Navbar.tsx`: header con gradiente 135deg, título, tabs por rol + drawer mobile + botón cerrar sesión.
- [ ] `login.tsx`: AuthShell (gradiente 140deg + textura + orbs) + card + logo 120×120 + Inputs + Button `lg` con `isLoading`.
- [ ] Usar `/watts_logo_rojo.png` (login), `/watts_logo_blanco.png` (Navbar) y `/icon-watts.png` (favicon) del directorio `public/`.
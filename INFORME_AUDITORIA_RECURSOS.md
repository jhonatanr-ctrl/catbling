# Informe de Auditoría de Recursos — Proyecto CatBling

**Fecha:** 03/08/2026
**Ruta auditada:** `C:\Users\LENOVO\OneDrive\Escritorio\programacion Addons\xampp\htdocs\catbling`
**Alcance:** Todas las carpetas y archivos del proyecto (excluye `.git` interno).
**Método:** Análisis de referencias textuales (`<img src>`, `url()`, `background-image`, `new Audio()`, `<source src>`, `href`, `fetch`, `new Image()`, rutas construidas con variables, `require`/`include`/`require_once` PHP, llamadas dinámicas a la API, contexto de ejecución por página).
**Restricción:** No se modificó ningún archivo. Este informe es la única salida.

---

## 1. Resumen ejecutivo

| Categoría | Cantidad | Descripción |
|---|---|---|
| Archivos totales (sin `.git`) | 1.054 | incluye HTML, CSS, JS, PHP, SQL, imágenes, audio, video |
| **Usados** (referencia exacta resuelta) | **~177** | 160 del script + 17 reclasificados por verificación manual |
| **No usados** (ninguna referencia textual) | **~297** | 314 del script − 17 reclasificados como usados |
| **Uso incierto** (solo colisión de nombre base) | **580** | copias con el mismo nombre que un archivo usado en otra carpeta |
| Referencias rotas (apuntan a archivos inexistentes) | 106 | se reconciliaron; quedan ~40 rotas reales (audio/imágenes faltantes) |

**Hallazgos principales:**
1. El proyecto duplica el mismo "lote de assets" en ~10 carpetas (`juegos/assets`, `juegos/resources/assets`, `juegos/resources/resources2`, `juegos/casinoroyale/resources/assets`, `juegos/memoria/resources/assets`, `juegos/ruleta/resources/assets`, `juegos/tragamonedasm/assets`, `juegos/tragamonedasm/resources/assets`, `tienda/resources/assets`, `preguntas/assets`, `resources/assets`). Solo una copia de cada archivo se usa realmente; el resto son copias huérfanas.
2. `juegos/resources/resources2/` (70 archivos) es una **carpeta huérfana completa**: ningún código la referencia por ruta exacta.
3. Hay **referencias rotas reales**: varios minijuegos apuntan a audios/imágenes que no existen (p. ej. `CASINO JACKPOT…mp3`, `lose.mp3`, `16-Bit Music – Coffee at Night.mp3`, `izquierda.png`, `derecha.png`, iconos del tutorial en subpáginas).
4. La API se consume de forma dinámica (`resources/api.js` + `apiRequest(...)`): esos `.php` se marcan como **usados**.

---

## 2. Metodología

1. Inventario de archivos por extensión y carpeta.
2. Extracción de todas las referencias a recursos desde:
   - HTML: `src`, `href`, `background`, `url()`, `<source>`, `poster`.
   - CSS: `url()` (resueltas contra la ubicación del `.css`).
   - JS: `src`, `href`, `new Audio()`, `new Image()`, `fetch`, `apiRequest`, rutas con concatencación/plantillas; **resueltas contra la URL de la página que carga el script** (el navegador resuelve rutas relativas contra `document.baseURI`).
   - PHP: `require`, `require_once`, `include`, `include_once` (resueltas contra la ubicación del `.php`).
   - SQL: rutas `'...'` de imágenes.
3. Normalización de rutas (resolución de `../` y `./`).
4. Clasificación:
   - **Usado:** existe referencia textual y el archivo existe en la ruta exacta.
   - **No usado:** no existe ninguna referencia al nombre base ni a la ruta.
   - **Incierto:** el nombre base coincide con un archivo usado, pero la ruta exacta de esta copia nunca se referencia → no se puede descartar un uso por ruta dinámica.
   - **Roto:** hay referencia, pero el archivo de destino no existe.
5. Verificación manual de casos dinámicos: endpoints de API, iconos del tutorial (`resources/tutorial.js`), listados físicos de `mp3/mp4`, y carpetas sospechosas.

---

## 3. Recursos actualmente utilizados (~177)

### 3.1 Páginas HTML (9)
- `principalpage.html`, `juegos/juegosprincipalpage.html`, `juegos/cartas retro/cartas retro.html`, `juegos/casinoroyale/casinoroyale.html`, `juegos/dados/dadosindex.html`, `juegos/memoria/memoria.html`, `juegos/ruleta/ruleta.html`, `juegos/tragamonedasm/tragamonedaindex.html`, `preguntas/preguntasinicialpage.html`, `tienda/tienda.html` — (10 páginas; todas enlazadas desde la navegación).

### 3.2 Recursos globales compartidos (`resources/`)
| Archivo | Tipo | Referenciado por |
|---|---|---|
| `resources/api.js` | JS | todas las páginas (cliente de la API) |
| `resources/coins.js` | JS | todas las páginas (contador de monedas) |
| `resources/config.js` | JS | todas las páginas (configuración, llamada `apiRequest('google_login.php')`) |
| `resources/guest.js` | JS | todas las páginas (sesión invitado) y `tests/auth-state.test.js` |
| `resources/help.js` | JS | 8+ páginas (modal de ayuda) |
| `resources/help.css` | CSS | 8+ páginas |
| `resources/script.js` | JS | página principal |
| `resources/style.css` | CSS | principal, juegos, etc. |
| `resources/stylesheetglobal.css` | CSS | todas las páginas |
| `resources/tutorial.js` | JS | todas las páginas (tutorial) |
| `resources/tutorial.css` | CSS | tutorial |

**`resources/assets/`:**
| Archivo | Uso |
|---|---|
| `1.png` … `6.png` | iconos del tutorial (ruta construida en `tutorial.js`); `4.png` se resuelve desde `principalpage.html`; el resto se intenta cargar desde subpáginas (ver rotas §5) |
| `bag.png`, `exit.png`, `image.jpg`, `juegos.png`, `optionsmenu.png`, `preguntas.png`, `ruleta.png`, `settings.png`, `tienda.png`, `yukocoins.png`, `yukonocoins.png` | menús de principal/global |
| `Casino poker playing cards suits icons… Free.mp4` | video de fondo (páginas de cartas/principal) |
| `sounds/Epic 8-bit Electro Gaming Music Mix…mp3`, `sounds/Kubbi - Up In My Jam…mp3` | música de fondo |

### 3.3 `juegos/` (portada de juegos)
- `juegos/juegosprincipalpage.html`
- `juegos/resources/script.js`, `juegos/resources/style.css`
- `juegos/resources/assets/optionsmenu.png`, `juegos/resources/assets/Casino Royale Gold 4k loop.mp4`
- `juegos/assets/` usados: `arrow-der.png`, `arrow-izq.png`, `botonnegro.png`, `botonrojo.png`, `botonverde.png`, `card-icon.png`, `casinoroyaleicon.png`, `diceicon.png`, `fichasicon.png`, `ruleta2.png`, `salida1.png`, `salida2.png`, `salida3.png`, `slotmachineicon.png`

### 3.4 `juegos/cartas retro/`
- `cartas retro.html`, `resources/script.js`, `resources/style.css`
- `resources/assets/Small Little Orange Lights _ 4K Relaxing Screensaver.mp4`
- Botones de salida: `juegos/assets/salida1.png` (via `../assets/`)

### 3.5 `juegos/casinoroyale/`
- `casinoroyale.html`, `resources/script.js`, `resources/style.css`
- `resources/assets/Bokeh Light Night Light Traffic - Free Effects Background Video.mp4`
- Comparte `juegos/dado-compartido/dado3d.js` + `dado3d.css`
- Botones de salida: `juegos/assets/salida1.png`

### 3.6 `juegos/dados/`
- `dadosindex.html`, `resources/script.js`, `resources/style.css`
- `resources/assets/Purple Bokeh Light Free Background Video.mp4`
- Comparte `juegos/dado-compartido/dado3d.js` + `dado3d.css`

### 3.7 `juegos/memoria/`
- `memoria.html`, `resources/script.js`, `resources/style.css`
- `resources/assets/` usados: `atras.png`, `bag.png`, `botonnegro.png`, `cereza-removebg-preview.png`, `coin.png`, `corona.png`, `diceicon.png`, `frentenoseve.png`, `moneybag.png`, `moscadorada.png`, `moscanormal.png`, `musa-removebg-preview.png`, `numero7.png`, `playcoinicon.png`, `tanque-removebg-preview.png`, `Small Orange Bokeh Blurred Effect…mp4`
- Botones de salida: `juegos/assets/salida1.png`
- Icono de ruleta del dado: `juegos/tragamonedasm/resources/assets/numero7.png`

### 3.8 `juegos/ruleta/`
- `ruleta.html`, `resources/script.js`, `resources/style.css`
- `resources/assets/4k Golden Dust Particles Falling…mp4`
- Botones: `juegos/assets/boton*.png` (via CSS), salida: `juegos/assets/salida1.png`

### 3.9 `juegos/tragamonedasm/`
- `tragamonedaindex.html`, `resources/script.js`, `resources/style.css`
- `assets/` usados: `Bokeh Light Red Orange Effect…mp4`, `botonrojo.png`, `cereza-removebg-preview.png`, `coin.png`, `corona.png`, `moneybag.png`, `moscadorada.png`, `moscanormal.png`, `numero7.png`, `salida1.png`, `slotmachineicon.png`

### 3.10 `preguntas/`
- `preguntasinicialpage.html`, `resources/script.js`, `resources/style.css`, `resources/questions.js`
- `assets/` usados: `acceptbutton.png`, `arrowder.png`, `arrowder1.png`, `arrowizq.png`, `botonazul.png`, `botondoradoo.png`, `botonmorado.png`, `botonnegro.png`, `botonrojo.png`, `botonverde.png`, `explicacion.png`, `optionsmenu.png`, `rejectbutton.png`, `reply-arrow.png`, `salida1.png`, `salida2.png`, `salida3.png`, `slotmachinequestionselecter.png`, `Particles gold event awards…mp4`, `sound/Density & Time - MAZE…mp3`, `dificultades/facil.png`, `dificultades/normal.png`, `dificultades/difícil.png`, `topics/englishtopic.png`, `topics/literaturetopic.png`, `topics/logitopic.png`, `topics/mathtopic.png`, `topics/physicstopic.png`, `topics/socials.png`

### 3.11 `tienda/`
- `tienda.html`, `resources/script.js`, `resources/style.css`
- `resources/assets/` usados: `ajuste.png`, `arrowdown.png`, `arrowup.png`, `cambiar.png`, `cintavertical.png`, `congelar.png`, `credito.png`, `descriprionbox.png`, `dorado.png`, `eliminar.png`, `escudo.png`, `exit.png`, `fondo.png`, `fondo1.png`, `ganancias.png`, `infinito.png`, `jackpot.png`, `parcial.png`, `pista.png`, `popular.png`, `preguntas.png`, `racha.png`, `retry.png`, `x2.png`, `x4.png`

### 3.12 Backend PHP (carpeta `api/`)
| Archivo | Cómo se usa |
|---|---|
| `api/db.php` | incluido por 11 scripts PHP |
| `api/register.php`, `login.php`, `forgot_password.php`, `reset_password.php` | llamados dinámicamente por `resources/api.js` |
| `api/get_config.php`, `update_config.php` | llamados dinámicamente por `resources/api.js` / `config.js` |
| `api/get_coins.php`, `update_coins.php` | llamados dinámicamente por `resources/api.js` |
| `api/EmailService.php`, `api/email_config.php` | `require_once`/`include` desde `forgot_password.php` |
| `api/tokens.json`, `api/reset_tokens.json` | leídos/escritos por 6 scripts PHP (recuperación de contraseña) |
| `logs/email_log.txt` | escrito en runtime por `forgot_password.php` |

---

## 4. Recursos NO utilizados (~297)

Criterio: **no existe ninguna referencia textual** (ni ruta exacta ni nombre base) en ningún archivo del proyecto.

### 4.1 Alta confianza de no uso

**a) Carpeta huérfana completa — `juegos/resources/resources2/` (70 archivos)**
Ningún código referencia esta carpeta. Sus archivos son copias duplicadas de assets usados en otras carpetas. Lista completa:

`0328(1).mp4`, `0328.mp4`, `2c34063309fd7e8442131f417f9177d8.png`, `6d5b7f06150ce0aa4841d439cbcab519.jpg`, `acceptbutton - copia.png`, `ajuste.png`, `arrowder.png`, `arrowdown.png`, `arrowizq.png`, `arrowup.png`, `atras.png`, `Bokeh Light Red Orange Effect - Free Effects Background Video (1).mp4`, `botonazul.png`, `botondoradoo.png`, `botonmorado.png`, `botonnegro.png`, `botonrojo.png`, `botonverde.png`, `btonazulclaro.png`, `cambiar.png`, `cereza-removebg-preview.png`, `cintavertical.png`, `coin.png`, `congelar.png`, `corona.png`, `credito.png`, `credito.webp`, `descriprionbox.png`, `diceicon.png`, `dorado.png`, `eliminar.png`, `escudo.png`, `fb628cde8fd3c6dc24a5889662b860b8.jpg`, `fichasicon.png`, `fondo.png`, `frentenoseve.png`, `ganancias.png`, `icon.png`, `iconpage.png`, `images-removebg-preview.png`, `inferiorpart.png`, `infinito.png`, `jackpot.png`, `juegos.jpg`, `lanzarbtn.png`, `moscadorada.png`, `moscanormal-removebg-preview.png`, `moscanormal.png`, `mosca_de_oro-removebg-preview-removebg-preview.png`, `musa-removebg-preview.png`, `numero7.png`, `número7-removebg-preview-removebg-preview.png`, `parcial.png`, `pista.png`, `playcoinicon.png`, `popular.png`, `racha.png`, `rejectbutton.png`, `reply-arrow.png`, `retry.png`, `ruleta.png`, `ruleta2.png`, `salida1.png`, `salida2.png`, `salida3.png`, `sdfgh.png`, `slotmachineicon.png`, `tanque-removebg-preview.png`, `x2.png`, `x4.png`

**b) Archivos de la "plantilla de assets" duplicada** (sin referencias de nombre base en todo el proyecto; aparecen copiados en las carpetas indicadas)

| Nombre base | Copias no usadas en |
|---|---|
| `0328.mp4` / `0328(1).mp4` | juegos/casinoroyale/resources/assets, juegos/memoria/resources/assets, juegos/resources/assets, juegos/ruleta/resources/assets, juegos/tragamonedasm/assets, juegos/tragamonedasm/resources/assets, tienda/resources/assets (y resources2) |
| `HIIT 2 x SE PACIENTE FUNK   [BRAZILIAN FUNK MASHUP].mp4` | juegos/casinoroyale, memoria, resources, ruleta, tragamonedasm/resources (5 copias) |
| `acceptbutton - copia.png`, `acceptbutton.jpg`, `rejectbutton.jpg` | en las carpetas de assets locales |
| `btonazulclaro.png`, `credito.webp`, `icon.png`, `iconpage.png` | en las carpetas de assets locales |
| `images-removebg-preview.png`, `inferiorpart.png`, `juegos.jpg`, `lanzarbtn.png` | en las carpetas de assets locales |
| `moscanormal-removebg-preview.png`, `mosca_de_oro-removebg-preview-removebg-preview.png` | en las carpetas de assets locales |
| `noc.png`, `nocx2.png`, `sdfgh.png`, `siguiente.png` | en las carpetas de assets locales |
| `número7-removebg-preview-removebg-preview.png` | en las carpetas de assets locales |
| `pixel-art-alphabet-book…360488-955.png` y `.jpg` | en las carpetas de assets locales |
| `school-supplies-pixel-art-icons-260nw-2584861739.webp` | en las carpetas de assets locales |
| `texting-quote-boxes-box-frame-260nw-1754338223.png` y `.webp` | en las carpetas de assets locales |
| `2c34063309fd7e8442131f417f9177d8.png`, `6d5b7f06150ce0aa4841d439cbcab519.jpg`, `9f773d9c5e767e2e4f2dcb818e111263.jpg`, `fb628cde8fd3c6dc24a5889662b860b8.jpg` | en las carpetas de assets locales |
| `four-interlocking-puzzle-pieces…jpg`, `great-britain-pixel-flag…jpg` | juegos/casinoroyale, memoria, ruleta, tragamonedasm/resources |
| `6fe44f4ddf161bab0eb4720024b9d8d7.jpg`, `7251c77ff05ddd1003da1793fc50ae3c.jpg`, `836caa8b954ec409e4b2e3d70a5d3be9.jpg`, `8e054aed7e9478440fb2c505c7c16b08.jpg` | tienda/resources/assets |

> "Carpetas de assets locales" = `juegos/casinoroyale/resources/assets`, `juegos/memoria/resources/assets`, `juegos/resources/assets`, `juegos/ruleta/resources/assets`, `juegos/tragamonedasm/assets`, `juegos/tragamonedasm/resources/assets`, `tienda/resources/assets`, `preguntas/assets`, `resources/assets`. En cada carpeta solo se usa la copia indicada en §3; las demás copias de estos nombres NO se usan.

**c) Archivos individuales sin referencia**

- Raíz: `script_check.js` (copia de depuración del módulo de preguntas; no referenciado).
- `preguntas/resources/script.js.tmp` (archivo temporal), `preguntas/resources/questions_backup_pilot_corrupted.js` (backup corrupto con texto mojibake).
- `tests/auth-state.test.js` (script de prueba de desarrollo para Node; no lo carga la aplicación).
- `preguntas/resources/assets/bag.png`, `preguntas/resources/assets/explicacion.png` (duplicados; la copia usada está en `preguntas/assets/` y `resources/assets/`).
- `resources/assets/google-icon.png` (icono de Google no usado; `config.js` intenta `google_login.php`, que no existe).
- `resources/assets/plantilla.png`, `plantilla2.png`, `preguntas.jpg`, `images-removebg-preview.png`, `lanzarbtn.png`, `sdfgh.png`.
- `juegos/assets/1slotmachineicon.png`, `card-icon.svg` (existe `card-icon.png` usado).
- `tienda/resources/assets/accesorios.png`, `plantilla.png`, `plantilla2.png`, `preguntas.jpg`, `ruletainicial-removebg-preview.png`, `tienda.jpg`.
- `preguntas/assets/` copias sueltas: `btonazulclaro.png`, `images-removebg-preview.png`, `lanzarbtn.png`, `moscanormal-removebg-preview.png`, `noc.png`, `nocx2.png`, `pixel-art-alphabet-book…png`, `sdfgh.png`, `siguiente.png`.

### 4.2 Confianza media de no uso (posible uso manual/externo)

| Archivo | Motivo |
|---|---|
| `api/historial.php` | sin referencias en HTML/JS/PHP |
| `api/inventario.php` | sin referencias (en `config.js` "inventario" es solo clave de `sessionStorage`) |
| `api/jugador.php` | sin referencias |
| `api/init.sql`, `api/db_schema.sql` | scripts SQL para crear BD; posible uso manual (phpMyAdmin). `db_schema.sql` además inserta imágenes `/assets/items/*.png` que no existen |

> Nota: `.gitattributes` y `.gitignore` son configuración de git, no recursos.

---

## 5. Archivos con uso incierto (580)

Criterio: el **nombre base** del archivo coincide con el de un archivo que sí se usa, pero la **ruta exacta** de esta copia no aparece en ningún código. Por prudencia (evitar falsos positivos) no se clasifican como eliminables; en la práctica, la mayoría son copias duplicadas que el código nunca carga (la referencia siempre resuelve a la copia usada de §3).

Agrupados por nombre base (se indica cada carpeta que contiene una copia sin referencia exacta):

`acceptbutton.png` → casinoroyale/resources/assets, memoria/resources/assets, juegos/resources/assets, ruleta/resources/assets, tragamonedasm/assets, tragamonedasm/resources/assets, resources/assets, tienda/resources/assets
`ajuste.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`arrowder.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, resources/assets, tienda/resources/assets
`arrow-der.png` → juegos/resources/assets
`arrowdown.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`arrowizq.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, resources/assets, tienda/resources/assets
`arrow-izq.png` → juegos/resources/assets
`arrowup.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`atras.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, tienda/resources/assets
`bag.png` → casinoroyale, juegos/resources, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, preguntas/resources/assets, tienda/resources/assets
`Bokeh Light Red Orange Effect - Free Effects Background Video (1).mp4` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/resources, tienda/resources/assets
`botonazul.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`botondoradoo.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`botonmorado.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`botonnegro.png` → casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`botonrojo.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/resources, tienda/resources/assets
`botonverde.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`cambiar.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`Casino poker playing cards…Free.mp4` → tienda/resources/assets
`cereza-removebg-preview.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/resources, preguntas/assets, resources/assets, tienda/resources/assets
`cintavertical.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets
`coin.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/resources, preguntas/assets, resources/assets, tienda/resources/assets
`congelar.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`corona.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/resources, preguntas/assets, resources/assets, tienda/resources/assets
`credito.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`Density & Time - MAZE…mp3` → casinoroyale/resources/assets/sound, memoria/resources/assets/sound, juegos/resources/assets/sound, ruleta/resources/assets/sound, tragamonedasm/resources/assets/sound, tienda/resources/assets/sound
`descriprionbox.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets
`diceicon.png` → casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets, tienda/resources/assets
`difícil.png` → casinoroyale/resources/assets/dificultades, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`dorado.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`eliminar.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`email_log.txt` → logs (sí se escribe en runtime por `forgot_password.php`; se considera usado)
`englishtopic.png` → casinoroyale/resources/assets/topics, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`escudo.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`explicacion.png` → preguntas/resources/assets
`facil.png` → casinoroyale/resources/assets/dificultades, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`fichasicon.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`fondo.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources
`frentenoseve.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`ganancias.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`infinito.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`jackpot.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`juegos.png` → tienda/resources/assets
`Kevin MacLeod - Itty Bitty 8 Bit…mp3` → tienda/resources/assets/sounds
`Kubbi - Up In My Jam…mp3` → tienda/resources/assets/sounds
`literaturetopic.png` → casinoroyale/resources/assets/topics, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`logitopic.png` → casinoroyale/resources/assets/topics, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`mathtopic.png` → casinoroyale/resources/assets/topics, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`moneybag.png` → juegos/assets, casinoroyale, juegos/resources, ruleta, tragamonedasm/resources, preguntas/assets, resources/assets, tienda/resources/assets
`moscadorada.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/resources, tienda/resources/assets
`moscanormal.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/resources, tienda/resources/assets
`musa-removebg-preview.png` → casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`normal.png` → casinoroyale/resources/assets/dificultades, memoria, juegos/resources, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`numero7.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/resources, tienda/resources/assets
`optionsmenu.png` → juegos/assets, casinoroyale, memoria, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`parcial.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`physicstopic.png` → casinoroyale/resources/assets/topics, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`pista.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`playcoinicon.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`popular.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`racha.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`rejectbutton.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, resources/assets, tienda/resources/assets
`reply-arrow.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, resources/assets, tienda/resources/assets
`retry.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`ruleta.png` → juegos/assets, casinoroyale, memoria, juegos/resources/resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`ruleta2.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`salida1.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/resources, tienda/resources/assets
`salida2.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`salida3.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`settings.png` → tienda/resources/assets
`slotmachineicon.png` → casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/resources, tienda/resources/assets
`slotmachinequestionselecter.png` → juegos/assets, casinoroyale, memoria, juegos/resources, ruleta, tragamonedasm/assets, tragamonedasm/resources, tienda/resources/assets
`socials.png` → casinoroyale/resources/assets/topics, memoria, juegos/resources, ruleta, tragamonedasm/resources, tienda/resources/assets
`tanque-removebg-preview.png` → juegos/assets, casinoroyale, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, tienda/resources/assets
`tienda.png` → tienda/resources/assets
`x2.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`x4.png` → juegos/assets, casinoroyale, memoria, juegos/resources, resources2, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, resources/assets
`yukocoins.png` → tienda/resources/assets
`yukonocoins.png` → juegos/assets, casinoroyale, memoria, juegos/resources, ruleta, tragamonedasm/assets, tragamonedasm/resources, preguntas/assets, tienda/resources/assets

> En las tablas anteriores, los nombres de carpeta se abrevian omitiendo el prefijo común `juegos/` (p. ej. `casinoroyale` = `juegos/casinoroyale/resources/assets`); `resources2` = `juegos/resources/resources2`; `resources/assets` = carpeta raíz `resources/assets`.

---

## 6. Referencias rotas (archivos referenciados que NO existen)

### 6.1 Audio y video inexistentes (404 en ejecución)
| Referencia | Archivo referenciante | Existe el destino |
|---|---|---|
| `./assets/CASINO JACKPOT - MEGAWIN - BIG WIN Sound Effect ( HD ) No Copyright (1).mp3` | `juegos/tragamonedasm/resources/script.js:215` | NO |
| `./assets/lose.mp3` | `juegos/tragamonedasm/resources/script.js:229` | NO |
| `../tragamonedasm/resources/assets/CASINO JACKPOT…mp3` | `juegos/dados/resources/script.js:328` | NO |
| `../tragamonedasm/resources/assets/lose.mp3` | `juegos/dados/resources/script.js:341` | NO |
| `./assets/16-Bit Music  - Coffee at Night.mp3` | `juegos/tragamonedasm/tragamonedaindex.html:22` | NO |
| `./assets/16 Bit Music  - Gamer Instincts.mp3` | `juegos/ruleta/ruleta.html:22` | NO |
| `./assets/Fun N64PS1 Music - Berrylife City.mp3` | `juegos/juegosprincipalpage.html:23` | NO |
| `./resources/assets/soundtrack/16-Bit Music  - We Must Battle NOW!.mp3` | `juegos/memoria/memoria.html:115` | NO |
| `./juegos/memoria/resources/assets/soundtrack/sounds effect/Botón-efecto de sonido (HD).mp3` | `resources/config.js:1128` | NO |
| `./resources/assets/Kevin MacLeod - Itty Bitty 8 Bit…mp3` | `tienda/tienda.html:19` | Parcial: el archivo existe en `tienda/resources/assets/sounds/…`, pero la ruta usada omite `sounds/` → 404 |

### 6.2 Imágenes inexistentes
| Referencia | Archivo referenciante |
|---|---|
| `./assets/izquierda.png`, `./assets/derecha.png` (con `onerror` que las oculta) | `juegos/tragamonedasm/tragamonedaindex.html:102-103` |
| `./resources/assets/guantes.png`, `gafas.png`, `amuleto.png`, `bolsa.png`, `aura.png` | `tienda/resources/script.js:160-196` (objetos de la tienda) |
| `/assets/items/hat_top.png`, `shirt_basic.png`, `pants_jeans.png`, `shoes_white.png`, `glasses_sun.png` | `api/db_schema.sql:211-215` (semillas de BD) |
| `resources/assets/image (1).png` (fallback del tutorial y de varias páginas) | `resources/tutorial.js:40` y páginas; el archivo existente es `resources/assets/image.jpg` |
| iconos del tutorial `1.png`–`6.png` en subpáginas | `tutorial.js` construye `prefix + 'resources/assets/' + icono`; solo `4.png` existe en la ruta resultante desde `principalpage.html`; desde las subpáginas la ruta resuelta no existe |

### 6.3 Endpoints/carpetas inexistentes
| Referencia | Origen | Detalle |
|---|---|---|
| `google_login.php` | `resources/config.js:1163` (`apiRequest('google_login.php')`) | el archivo no existe en `api/` (función de login con Google sin implementar) |
| `./balatro/balatro.html` | `juegos/juegosprincipalpage.html` (y `tutorial.js`) | la carpeta `balatro/` no existe (juego no implementado) |
| `/assets/…` en general | SQL | rutas de la BD apuntan a `/assets/` (raíz web), que no coincide con la estructura real |

### 6.4 Referencias que NO son rotas (reconciliadas)
- `./assets/topics/*.png`, `./assets/dificultades/*.png`, `./assets/salida*.png`, `./assets/rejectbutton.png`, `./assets/acceptbutton.png` → se resuelven contra la **página** `preguntas/preguntasinicialpage.html` → `preguntas/assets/…` (existen y se usan).
- `register.php`, `login.php`, `forgot_password.php`, `reset_password.php`, `update_config.php`, `update_coins.php` → endpoints dinámicos de `resources/api.js` → `api/*.php` (existen y se usan).
- `guest.js` (referido desde `tests/auth-state.test.js`) → `resources/guest.js` existe.
- URLs absolutas `/catbling/principalpage.html` y fuentes de Google (`fonts.googleapis.com`) → válidas.
- `4.png, 3.png, 1.png, 2.png, 6.png, image (1).png` → valores del mapa `ICONS` de `tutorial.js` (no son rutas; el manejo está descrito en §6.2).

---

## 7. Recomendaciones

1. **No eliminar por ahora** nada de la sección §5 (inciertos) sin verificar con la consola del navegador (pestaña Network) que esas rutas no se solicitan al ejecutar cada minijuego; la mayoría son duplicados muertos, pero la verificación es barata.
2. **Candidatos más seguros para limpiar** (alta confianza): carpeta `juegos/resources/resources2/` completa, `script_check.js`, `preguntas/resources/script.js.tmp`, `preguntas/resources/questions_backup_pilot_corrupted.js`, los duplicados de la "plantilla de assets" (§4.1b) y las imágenes hash `2c340633…`, `6d5b7f…`, etc.
3. **Corregir o decidir las referencias rotas** (§6): los audios de tragamonedas/dados/ruleta/memoria apuntan a archivos inexistentes (falta copiar los `mp3`, o se renombraron); `lose.mp3`/`CASINO JACKPOT…` están referenciados por 2 juegos.
4. **Sincronizar la tienda**: `tienda/resources/script.js` usa 5 imágenes de objetos (`guantes/gafas/amuleto/bolsa/aura`) que no existen → en la app se muestran rotas.
5. **Decidir el futuro de** `api/historial.php`, `api/inventario.php`, `api/jugador.php`, `api/init.sql`, `api/db_schema.sql`: no los usa el código actual; si son parte de un plan futuro, conservarlos documentándolos.
6. **Documento de referencia generado automáticamente**: los listados de este informe provienen del análisis estructurado en `audit_final.json` (script `audit_final.ps1`), reproducibles con `powershell -File audit_final.ps1`.

---

*Fin del informe. Ningún archivo del proyecto fue modificado.*

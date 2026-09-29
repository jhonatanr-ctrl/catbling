# Sistema de diseño de la tienda (Catbling)

| Archivo | Rol | ¿Se carga en la tienda? |
|---|---|---|
| `registry.js` | Elementos editables (id estable + selector), propiedades y breakpoints | Sí |
| `published.js` | Diseño publicado para todos los visitantes (opcional) | Sí |
| `engine.js` | Valida la config y genera una hoja `<style>` con `@media` por dispositivo | Sí |
| `editor.js` / `editor.css` | Interfaz visual (solo `tienda/editor.html`) | **No** |

- **Editar**: abrir `tienda/editor.html` desde un servidor HTTP (no `file://`).
- **Añadir un elemento editable**: una línea en `ELEMENTS` de `registry.js` (no renombrar ids existentes).
- **Añadir una propiedad**: entrada en `PROPS` (y, si es compuesta, su traducción en `declarations()` de `engine.js`).
- **Guardado**: `localStorage["cbDesign.v1"]` (solo el navegador de quien edita). Para publicarlo a todos:
  editor → *Más → Copiar para publicar* y pegar en `published.js`.
- Breakpoints (idénticos a los `@media` de `style.css`): escritorio ≥769px, tablet 481–768px, móvil ≤480px.

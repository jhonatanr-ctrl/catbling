// pp-config.js — Preguntas personalizadas: constantes y bandera de arranque.
// Los costes/recompensas de AQUÍ son sólo para MOSTRAR en pantalla; el servidor
// (RPC doc_iniciar_examen / doc_responder) es quien decide y cobra de verdad.
window.PP_ACTIVO = true;   // script.js difiere el overlay de nivel hasta que el usuario elige "generales"

window.PP_CONFIG = {
  FORMATOS: { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' },
  MAX_BYTES: 5 * 1024 * 1024,           // debe coincidir con DOC_MAX_FILE_BYTES del backend (el servidor vuelve a validar)
  BUCKET: 'documentos-catbling',
  PREGUNTAS: 15,
  TARIFAS: {                            // espejo de supabase/migrations/012 (_doc_coste / _doc_recompensa)
    facil:   { coste: 15, recompensa: 5,  penalizacion: 10 },
    normal:  { coste: 25, recompensa: 10, penalizacion: 10 },
    dificil: { coste: 30, recompensa: 15, penalizacion: 10 },
  },
  DIFICULTADES: [                       // MISMAS imágenes y rutas que el selector de preguntas generales (script.js)
    { id: 'facil',   labelKey: 'nivel_facil',   img: './assets/dificultades/facil.webp',   color: '#44ff88' },
    { id: 'normal',  labelKey: 'nivel_normal',  img: './assets/dificultades/normal.webp',  color: '#ffd700' },
    { id: 'dificil', labelKey: 'nivel_dificil', img: './assets/dificultades/difícil.webp', color: '#ff4444' },
  ],
};

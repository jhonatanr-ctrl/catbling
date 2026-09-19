/**
 * data-caballos.js
 * -----------------------------------------------------------------------
 * Pool de caballos disponibles en el juego. De aquí se seleccionan al
 * azar los 16 participantes de cada carrera (ver generarParticipantes()
 * en resources/participantes.js).
 *
 * Cada caballo es una ENTIDAD INDEPENDIENTE con un id propio. Ese id es
 * el único vínculo entre nombre, personalidad, historial, estadísticas
 * y sprites: nada se deduce por nombre de archivo ni por la posición
 * visual del caballo en la pista.
 *
 * Sprites: como el arte final (pixel-art / sprites reales) todavía no
 * existe, cada estado de sprite (spriteInicial / spriteCarreraN) apunta
 * a una CLAVE lógica (no a un archivo). El renderer (resources/sprites.js)
 * usa esa clave + el color del caballo para dibujar una silueta propia
 * mediante SVG. El día que existan sprites reales en PNG/GIF, basta con
 * cambiar el renderer para que cargue `spriteInicial` como <img src>:
 * el resto del sistema (identidad, ciclo de animación, etc.) no cambia.
 *
 * perfilHistorial define qué tipo de historial se generará para el
 * caballo (ver resources/historial.js) y también está correlacionado
 * (no determinado) con sus estadísticas internas, para que el
 * historial visible tenga coherencia con su comportamiento probable
 * sin garantizar nunca el resultado real de la carrera.
 * -----------------------------------------------------------------------
 */
window.CABALLOS_POOL = [
  // ---- Perfil: dominante (>50% de victorias) ----
  { id: 'horse_001', nombre: 'Relámpago del Alba', color: '#ffcc00',
    personalidad: 'Tiene una salida explosiva y rara vez baja el ritmo hasta cruzar la meta.',
    perfilHistorial: 'dominante',
    stats: { velocidadBase: 1.0018, aceleracion: 1.0180, estabilidad: 0.85, explosividadFinal: 0.65 } },
  { id: 'horse_002', nombre: 'Kaien Fuga', color: '#3aa1ff',
    personalidad: 'Corredor metódico: marca su propio ritmo y pocas veces se ve superado.',
    perfilHistorial: 'dominante',
    stats: { velocidadBase: 1.0016, aceleracion: 1.0075, estabilidad: 0.82, explosividadFinal: 0.55 } },
  { id: 'horse_003', nombre: 'Sol Naciente', color: '#ff7b1c',
    personalidad: 'Favorito habitual del público, muy pocas veces decepciona.',
    perfilHistorial: 'dominante',
    stats: { velocidadBase: 1.0021, aceleracion: 1.0120, estabilidad: 0.80, explosividadFinal: 0.60 } },
  { id: 'horse_004', nombre: 'Diamante Negro', color: '#2b2b3d',
    personalidad: 'Impone su presencia desde el arranque y administra la ventaja con calma.',
    perfilHistorial: 'dominante',
    stats: { velocidadBase: 1.0013, aceleracion: 1.0045, estabilidad: 0.88, explosividadFinal: 0.45 } },

  // ---- Perfil: ganador ocasional ----
  { id: 'horse_005', nombre: 'Luna Carmesí', color: '#c72c48',
    personalidad: 'Cuando encuentra su ritmo puede ganar cualquier carrera, pero no siempre lo logra.',
    perfilHistorial: 'ganador_ocasional',
    stats: { velocidadBase: 1.0005, aceleracion: 1.0150, estabilidad: 0.45, explosividadFinal: 0.70 } },
  { id: 'horse_006', nombre: 'Trueno Naranja', color: '#ff9900',
    personalidad: 'Explosivo en tramos cortos, aunque suele pagar caro sus arranques.',
    perfilHistorial: 'ganador_ocasional',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0225, estabilidad: 0.40, explosividadFinal: 0.75 } },
  { id: 'horse_007', nombre: 'Hikari Zenkai', color: '#f4e04d',
    personalidad: 'Capaz de sorprender con un cierre feroz cuando menos se lo espera.',
    perfilHistorial: 'ganador_ocasional',
    stats: { velocidadBase: 1.0003, aceleracion: 1.0090, estabilidad: 0.48, explosividadFinal: 0.72 } },
  { id: 'horse_008', nombre: 'Vendaval Criollo', color: '#7a4b2c',
    personalidad: 'Alterna carreras brillantes con actuaciones muy discretas.',
    perfilHistorial: 'ganador_ocasional',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0060, estabilidad: 0.42, explosividadFinal: 0.60 } },

  // ---- Perfil: suele terminar entre los primeros 5 ----
  { id: 'horse_009', nombre: 'Sable de Plata', color: '#c9c9d9',
    personalidad: 'Constante y rara vez termina fuera de los primeros puestos.',
    perfilHistorial: 'top5_frecuente',
    stats: { velocidadBase: 1.0005, aceleracion: 1.0000, estabilidad: 0.72, explosividadFinal: 0.50 } },
  { id: 'horse_010', nombre: 'Zafiro Andino', color: '#2f6fb3',
    personalidad: 'Regular como un reloj: siempre pelea el pelotón de punta.',
    perfilHistorial: 'top5_frecuente',
    stats: { velocidadBase: 1.0003, aceleracion: 0.9970, estabilidad: 0.75, explosividadFinal: 0.45 } },
  { id: 'horse_011', nombre: 'Corcel del Ande', color: '#8a8f5c',
    personalidad: 'No suele ganar, pero casi siempre está cerca de los líderes.',
    perfilHistorial: 'top5_frecuente',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0030, estabilidad: 0.70, explosividadFinal: 0.48 } },
  { id: 'horse_012', nombre: 'Nube de Fuego', color: '#e8734a',
    personalidad: 'Corredor sólido, casi nunca se queda fuera de los puestos de avanzada.',
    perfilHistorial: 'top5_frecuente',
    stats: { velocidadBase: 1.0003, aceleracion: 1.0015, estabilidad: 0.68, explosividadFinal: 0.52 } },

  // ---- Perfil: rara vez termina entre los primeros 5 ----
  { id: 'horse_013', nombre: 'Sombra Veloz', color: '#4a4a4a',
    personalidad: 'Suele quedarse en la mitad de la carrera, con destellos ocasionales.',
    perfilHistorial: 'top5_raro',
    stats: { velocidadBase: 0.9989, aceleracion: 0.9925, estabilidad: 0.45, explosividadFinal: 0.35 } },
  { id: 'horse_014', nombre: 'Neblina Gris', color: '#9aa0a6',
    personalidad: 'Corre parejo pero le cuesta llegar entre los mejores.',
    perfilHistorial: 'top5_raro',
    stats: { velocidadBase: 0.9987, aceleracion: 0.9910, estabilidad: 0.50, explosividadFinal: 0.30 } },
  { id: 'horse_015', nombre: 'Espuela de Bronce', color: '#a97142',
    personalidad: 'Trabajador, aunque el pelotón de punta se le suele escapar.',
    perfilHistorial: 'top5_raro',
    stats: { velocidadBase: 0.9989, aceleracion: 0.9955, estabilidad: 0.48, explosividadFinal: 0.33 } },
  { id: 'horse_016', nombre: 'Furia Costeña', color: '#3b8c86',
    personalidad: 'Necesita una carrera perfecta para asomarse a los primeros puestos.',
    perfilHistorial: 'top5_raro',
    stats: { velocidadBase: 0.9984, aceleracion: 0.9895, estabilidad: 0.46, explosividadFinal: 0.32 } },

  // ---- Perfil: muy inconsistente ----
  { id: 'horse_017', nombre: 'Tormenta Azabache', color: '#1c1c28',
    personalidad: 'Un día parece imparable y al siguiente se queda muy atrás; nunca se sabe cuál saldrá.',
    perfilHistorial: 'inconsistente',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0075, estabilidad: 0.18, explosividadFinal: 0.55 } },
  { id: 'horse_018', nombre: 'Marejada Brava', color: '#1f5f8b',
    personalidad: 'Sus resultados van de un extremo a otro sin patrón claro.',
    perfilHistorial: 'inconsistente',
    stats: { velocidadBase: 0.9997, aceleracion: 1.0030, estabilidad: 0.16, explosividadFinal: 0.50 } },
  { id: 'horse_019', nombre: 'Ola Salvaje', color: '#2e86ab',
    personalidad: 'Puede pelear la punta o desaparecer del mapa en la misma temporada.',
    perfilHistorial: 'inconsistente',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0000, estabilidad: 0.20, explosividadFinal: 0.52 } },
  { id: 'horse_020', nombre: 'Centella Roja', color: '#d4322c',
    personalidad: 'Temperamental: sus carreras son una caja de sorpresas.',
    perfilHistorial: 'inconsistente',
    stats: { velocidadBase: 1.0003, aceleracion: 1.0045, estabilidad: 0.17, explosividadFinal: 0.58 } },

  // ---- Perfil: posiciones intermedias ----
  { id: 'horse_021', nombre: 'Viento Salvaje', color: '#5c8a4a',
    personalidad: 'Corredor discreto que casi siempre termina en la mitad del pelotón.',
    perfilHistorial: 'medio',
    stats: { velocidadBase: 0.9995, aceleracion: 0.9970, estabilidad: 0.58, explosividadFinal: 0.30 } },
  { id: 'horse_022', nombre: 'Yuzuki no Kaze', color: '#c9a4d1',
    personalidad: 'Ni sobresale ni decepciona: un competidor parejo y predecible.',
    perfilHistorial: 'medio',
    stats: { velocidadBase: 0.9995, aceleracion: 0.9955, estabilidad: 0.60, explosividadFinal: 0.28 } },
  { id: 'horse_023', nombre: 'Tambor Salvaje', color: '#8b5e3c',
    personalidad: 'Se mantiene siempre en un cómodo término medio.',
    perfilHistorial: 'medio',
    stats: { velocidadBase: 0.9992, aceleracion: 0.9940, estabilidad: 0.55, explosividadFinal: 0.27 } },
  { id: 'horse_024', nombre: 'Alba Dorada', color: '#e0b84c',
    personalidad: 'Corre sin sobresaltos, casi siempre lejos tanto de la punta como del fondo.',
    perfilHistorial: 'medio',
    stats: { velocidadBase: 0.9995, aceleracion: 0.9985, estabilidad: 0.57, explosividadFinal: 0.29 } },

  // ---- Perfil: resultados prácticamente impredecibles ----
  { id: 'horse_025', nombre: 'Kaze Hayai', color: '#6fd6c9',
    personalidad: 'Ningún historial parece explicar del todo lo que va a hacer hoy.',
    perfilHistorial: 'impredecible',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0000, estabilidad: 0.10, explosividadFinal: 0.50 } },
  { id: 'horse_026', nombre: 'Furia Escarlata', color: '#b5233b',
    personalidad: 'Un completo enigma: cualquier resultado es posible.',
    perfilHistorial: 'impredecible',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0015, estabilidad: 0.09, explosividadFinal: 0.48 } },
  { id: 'horse_027', nombre: 'Ame no Ryuu', color: '#4f6d7a',
    personalidad: 'Su comportamiento cambia carrera a carrera sin razón aparente.',
    perfilHistorial: 'impredecible',
    stats: { velocidadBase: 0.9997, aceleracion: 0.9985, estabilidad: 0.11, explosividadFinal: 0.47 } },
  { id: 'horse_028', nombre: 'Fuego Pampero', color: '#d9622b',
    personalidad: 'Los expertos ya no intentan predecir sus carreras.',
    perfilHistorial: 'impredecible',
    stats: { velocidadBase: 1.0000, aceleracion: 1.0030, estabilidad: 0.10, explosividadFinal: 0.52 } },

  // ---- Variedad adicional (mezcla de perfiles ya definidos, para ampliar el pool) ----
  { id: 'horse_029', nombre: 'Estrella del Sur', color: '#f0c419',
    personalidad: 'Casi siempre presente en la pelea final, aunque no siempre gana.',
    perfilHistorial: 'top5_frecuente',
    stats: { velocidadBase: 1.0005, aceleracion: 1.0015, estabilidad: 0.71, explosividadFinal: 0.54 } },
  { id: 'horse_030', nombre: 'Kurotsuki', color: '#3c3c3c',
    personalidad: 'Frío y calculador: administra sus fuerzas como pocos.',
    perfilHistorial: 'dominante',
    stats: { velocidadBase: 1.0016, aceleracion: 1.0060, estabilidad: 0.83, explosividadFinal: 0.50 } },
  { id: 'horse_031', nombre: 'Rayo de Kioto', color: '#e63946',
    personalidad: 'Explosivo pero irregular; cuando arranca bien es muy difícil de alcanzar.',
    perfilHistorial: 'ganador_ocasional',
    stats: { velocidadBase: 1.0003, aceleracion: 1.0195, estabilidad: 0.43, explosividadFinal: 0.73 } },
  { id: 'horse_032', nombre: 'Sultana Veloz', color: '#9b5de5',
    personalidad: 'Le cuesta despegar, pero cuando lo hace ya casi nadie la frena.',
    perfilHistorial: 'top5_raro',
    stats: { velocidadBase: 0.9987, aceleracion: 0.9940, estabilidad: 0.49, explosividadFinal: 0.34 } }
];

// Vincular sprites por ID (nunca se deduce por nombre ni por posición).
window.CABALLOS_POOL.forEach(function (c) {
  c.spriteInicial = c.id + '_idle';
  c.spriteCarrera1 = c.id + '_run1';
  c.spriteCarrera2 = c.id + '_run2';
  c.spriteCarrera3 = c.id + '_run3'; // opcional, usado en la secuencia de animación
});

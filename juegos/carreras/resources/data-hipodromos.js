/**
 * data-hipodromos.js
 * -----------------------------------------------------------------------
 * Estructura de datos ÚNICA y CENTRALIZADA de los hipódromos disponibles.
 * Para agregar, quitar o modificar un hipódromo basta con editar este
 * array: ningún otro archivo debe tener nombres, distancias, climas,
 * etc. escritos "a mano".
 *
 * Campos:
 *  id                 identificador único
 *  nombre             nombre del hipódromo
 *  descripcion        texto breve tipo "ficha previa de carrera"
 *  imagen             ruta de la imagen de la pista
 *  distanciaMetros    distancia de la carrera
 *  clima              clima del día de carrera
 *  terreno            tipo de terreno
 *  condicion          condición del terreno
 *  duracionMs         duración de la animación de la carrera (provisional: 75000 = 1:15)
 *  video              ruta del vídeo de fondo de esta pista
 *  participantes      cantidad de participantes (siempre 16 según el diseño actual)
 * -----------------------------------------------------------------------
 */
window.HIPODROMOS = [
  {
    id: 'sakura',
    nombre: 'Hipódromo Sakura',
    descripcion: 'Una pista clásica rodeada de cerezos, célebre por sus llegadas ajustadas.',
    imagen: './resources/assets/tracks/sakura.jpg',
    distanciaMetros: 1800,
    clima: 'Soleado',
    terreno: 'Césped',
    condicion: 'Buen estado',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  },
  {
    id: 'altiplano',
    nombre: 'Hipódromo del Altiplano',
    descripcion: 'Pista de altura donde el aire fino premia a los caballos más resistentes.',
    imagen: './resources/assets/tracks/altiplano.jpg',
    distanciaMetros: 2200,
    clima: 'Ventoso',
    terreno: 'Tierra',
    condicion: 'Ligero',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  },
  {
    id: 'medianoche',
    nombre: 'Circuito Medianoche',
    descripcion: 'Carreras nocturnas bajo reflectores, famosas por sus finales explosivos.',
    imagen: './resources/assets/tracks/medianoche.jpg',
    distanciaMetros: 1600,
    clima: 'Despejado (noche)',
    terreno: 'Sintético',
    condicion: 'Rápido',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  },
  {
    id: 'costa-brava',
    nombre: 'Hipódromo Costa Brava',
    descripcion: 'Pista costera con brisa constante y un tramo final junto al mar.',
    imagen: './resources/assets/tracks/costa-brava.jpg',
    distanciaMetros: 2000,
    clima: 'Nublado',
    terreno: 'Césped',
    condicion: 'Blando',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  },
  {
    id: 'valle-rojo',
    nombre: 'Valle Rojo',
    descripcion: 'Tierras áridas y una recta final larga que castiga a los caballos irregulares.',
    imagen: './resources/assets/tracks/valle-rojo.jpg',
    distanciaMetros: 2400,
    clima: 'Caluroso',
    terreno: 'Tierra',
    condicion: 'Firme',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  },
  {
    id: 'bosque-plateado',
    nombre: 'Bosque Plateado',
    descripcion: 'Trazado sinuoso entre árboles centenarios, exige caballos muy estables.',
    imagen: './resources/assets/tracks/bosque-plateado.jpg',
    distanciaMetros: 1900,
    clima: 'Neblina ligera',
    terreno: 'Césped',
    condicion: 'Pesado',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  },
  {
    id: 'gran-cascada',
    nombre: 'Gran Cascada',
    descripcion: 'Pista panorámica junto a una cascada, escenario de remontadas históricas.',
    imagen: './resources/assets/tracks/gran-cascada.jpg',
    distanciaMetros: 2100,
    clima: 'Lluvia ligera',
    terreno: 'Tierra',
    condicion: 'Fangoso',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  },
  {
    id: 'estrella-dorada',
    nombre: 'Hipódromo Estrella Dorada',
    descripcion: 'El hipódromo más prestigioso del circuito, cuna de los grandes favoritos.',
    imagen: './resources/assets/tracks/estrella-dorada.jpg',
    distanciaMetros: 2000,
    clima: 'Soleado',
    terreno: 'Césped',
    condicion: 'Óptimo',
    duracionMs: window.CARRERA_CONFIG.DURACION_CARRERA_MS_DEFAULT,
    video: './resources/assets/video/medianoche.mp4',
    participantes: 16
  }
];

// Nunca más de MAX_HIPODROMOS (recorte defensivo si alguien agrega de más)
if (window.HIPODROMOS.length > window.CARRERA_CONFIG.MAX_HIPODROMOS) {
  window.HIPODROMOS = window.HIPODROMOS.slice(0, window.CARRERA_CONFIG.MAX_HIPODROMOS);
}

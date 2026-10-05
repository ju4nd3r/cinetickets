import { PrismaClient, HallFormat, SeatType, FoodCategory, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Deterministic PRNG (Mulberry32)
export function createRng(initialSeed: number) {
  let s = initialSeed;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED_NUMBER = 42;

export async function runSeed(seedVal: number = SEED_NUMBER) {
  const rng = createRng(seedVal);

  console.log(`Starting reproducible seed with seed=${seedVal}...`);

  // 1. Limpieza de datos previa para idempotencia total
  await prisma.orderFood.deleteMany();
  await prisma.orderSeat.deleteMany();
  await prisma.order.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.hall.deleteMany();
  await prisma.cinema.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.user.deleteMany();

  // 2. Ticket Types
  const ticketTypes = [
    { id: 'adult', label: 'Adulto', discountPct: 0 },
    { id: 'child', label: 'Niño', discountPct: 30 },
    { id: 'senior', label: 'Senior (60+)', discountPct: 25 },
    { id: 'student', label: 'Estudiante', discountPct: 15 },
  ];

  for (const tt of ticketTypes) {
    await prisma.ticketType.create({ data: tt });
  }

  // 3. Demo User
  const demoUser = await prisma.user.create({
    data: {
      name: 'Usuario Demo',
      email: 'demo@cinetickets.test',
      phone: '+54 11 5555-0123',
    },
  });

  // 4. Movies (12 películas detalladas con datos realistas e inventados)
  const moviesData = [
    {
      title: 'Sombras del Pasado',
      originalTitle: 'Echoes of the Past',
      director: 'Alejandro Rossi',
      cast: ['Mateo Morales', 'Lucía Fernandez', 'Esteban Bianchi'],
      synopsis:
        'Un detective retirado en Buenos Aires debe enfrentar el caso sin resolver que arruinó su carrera cuando un nuevo mensaje críptico aparece.',
      genres: ['Thriller', 'Misterio', 'Crimen'],
      durationMin: 124,
      rating: 'PG-13',
      language: 'Español',
      subtitles: ['Inglés', 'Portugués'],
      releaseDate: new Date('2026-03-15'),
      posterUrl:
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 8.4,
      country: 'Argentina',
      year: 2026,
    },
    {
      title: 'Horizonte Estelar',
      originalTitle: 'Stellar Horizon',
      director: 'Elena Krum',
      cast: ['Marcus Vance', 'Sarah Jenkins', 'Tariq Al-Mansoor'],
      synopsis:
        'La primera tripulación humana a bordo del crucero interestelar Aethelgard descubre un fenómeno cósmico que distorsiona el flujo temporal.',
      genres: ['Ciencia Ficción', 'Aventura'],
      durationMin: 152,
      rating: 'PG-13',
      language: 'Inglés',
      subtitles: ['Español'],
      releaseDate: new Date('2026-04-10'),
      posterUrl:
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 8.9,
      country: 'Estados Unidos',
      year: 2026,
    },
    {
      title: 'El Último Reino de Cristal',
      originalTitle: 'The Last Crystal Kingdom',
      director: 'Mireille Laurent',
      cast: ['Sophie Valois', 'Julien Moreau', 'Camille Dupont'],
      synopsis:
        'En un mundo cubierto de hielo eterno, una joven cartógrafa encuentra las ruinas de una civilización que dominaba el calor geotérmico.',
      genres: ['Fantasía', 'Aventura'],
      durationMin: 135,
      rating: 'PG',
      language: 'Francés',
      subtitles: ['Español', 'Inglés'],
      releaseDate: new Date('2026-02-20'),
      posterUrl:
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 7.9,
      country: 'Francia',
      year: 2026,
    },
    {
      title: 'Código Rojo: Asedio',
      originalTitle: 'Protocol Red: Siege',
      director: 'David Chen',
      cast: ['Alex Mercer', 'Daniel Craig', 'Karin Lindqvist'],
      synopsis:
        'Un equipo táctico cibernético debe infiltrarse en una estación militar submarina secuestrada por una inteligencia artificial autónoma.',
      genres: ['Acción', 'Suspense'],
      durationMin: 118,
      rating: 'R',
      language: 'Inglés',
      subtitles: ['Español'],
      releaseDate: new Date('2026-05-01'),
      posterUrl:
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 7.6,
      country: 'Reino Unido',
      year: 2026,
    },
    {
      title: 'Melodía Incompleta',
      originalTitle: 'Unfinished Sonata',
      director: 'Clara Mendez',
      cast: ['Valeria Gomez', 'Bruno Silva', 'Raquel Paz'],
      synopsis:
        'Dos pianistas virtuosos compiten por una beca internacional en Madrid mientras una amistad prohibida florece al ritmo de Chopin.',
      genres: ['Drama', 'Música', 'Romance'],
      durationMin: 110,
      rating: 'PG-13',
      language: 'Español',
      subtitles: ['Inglés'],
      releaseDate: new Date('2026-01-25'),
      posterUrl:
        'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 8.1,
      country: 'España',
      year: 2026,
    },
    {
      title: 'Aventuras en Isla Volcán',
      originalTitle: 'Tiki & The Volcano Spirits',
      director: 'Kenji Takahashi',
      cast: ['Hana Sato', 'Ren Tanaka', 'Yuki Ito'],
      synopsis:
        'Una simpática criatura guardiana y su joven amigo recorren una isla paradisíaca para despertar a los cuatro espíritus guardianes.',
      genres: ['Animación', 'Familiar', 'Aventura'],
      durationMin: 98,
      rating: 'G',
      language: 'Japonés',
      subtitles: ['Español', 'Inglés'],
      releaseDate: new Date('2026-06-12'),
      posterUrl:
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 8.7,
      country: 'Japón',
      year: 2026,
    },
    {
      title: 'La Mansión de la Niebla',
      originalTitle: 'Whispering Fog',
      director: 'Guillermo Varela',
      cast: ['Javier Barria', 'Ines Domecq', 'Hernan Carrizo'],
      synopsis:
        'Una familia hereda una casona en los fiordos patagónicos, descubriendo que la niebla que rodea el valle oculta figuras del pasado.',
      genres: ['Terror', 'Misterio'],
      durationMin: 105,
      rating: 'R',
      language: 'Español',
      subtitles: ['Inglés'],
      releaseDate: new Date('2026-07-04'),
      posterUrl:
        'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 7.3,
      country: 'Chile',
      year: 2026,
    },
    {
      title: 'Velocidad Urbana: Derrape',
      originalTitle: 'Neon Drift: Tokyo Nights',
      director: 'Hiroshi Ogawa',
      cast: ['Daiki Miura', 'Chloe Bennett', 'Kenzo Hayashi'],
      synopsis:
        'En las autopistas iluminadas por neón de Tokio, corredores clandestinos utilizan bólidos híbridos en una competencia de alto calibre.',
      genres: ['Acción', 'Crimen'],
      durationMin: 122,
      rating: 'PG-13',
      language: 'Japonés / Inglés',
      subtitles: ['Español'],
      releaseDate: new Date('2026-08-14'),
      posterUrl:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 7.7,
      country: 'Japón',
      year: 2026,
    },
    {
      title: 'Vidas Cruzadas en Milán',
      originalTitle: 'Strade di Milano',
      director: 'Matteo Bellini',
      cast: ['Giulia Romano', 'Marco Ferri', 'Alessandra Conti'],
      synopsis:
        'Durante la semana de la moda en Milán, las historias entrelazadas de un sastre veterano, una modelo novata y un fotógrafo convergen.',
      genres: ['Drama', 'Comedia'],
      durationMin: 115,
      rating: 'PG-13',
      language: 'Italiano',
      subtitles: ['Español'],
      releaseDate: new Date('2026-09-02'),
      posterUrl:
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 8.0,
      country: 'Italia',
      year: 2026,
    },
    {
      title: 'El Enigma cuántico',
      originalTitle: 'Quantum Paradox',
      director: 'Samantha Wright',
      cast: ['Edward Norton Jr.', 'Grace Hopper', 'Liam Neeson'],
      synopsis:
        'Un laboratorio secreto en Ginebra logra crear partículas entrelazadas con el futuro, provocando paradojas que amenazan el presente.',
      genres: ['Ciencia Ficción', 'Thriller'],
      durationMin: 140,
      rating: 'PG-13',
      language: 'Inglés',
      subtitles: ['Español', 'Francés'],
      releaseDate: new Date('2026-04-28'),
      posterUrl:
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 8.6,
      country: 'Estados Unidos',
      year: 2026,
    },
    {
      title: 'Risas en el Paraíso',
      originalTitle: 'Trouble in Bahamas',
      director: 'Paul King',
      cast: ['Jack Black', 'Emma Stone', 'Taika Waititi'],
      synopsis:
        'Un crucero de bodas se desvía a una isla desierta donde dos familias que no se soportan deben convivir para ser rescatadas.',
      genres: ['Comedia'],
      durationMin: 95,
      rating: 'PG',
      language: 'Inglés',
      subtitles: ['Español'],
      releaseDate: new Date('2026-06-30'),
      posterUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 7.2,
      country: 'Estados Unidos',
      year: 2026,
    },
    {
      title: 'Crónicas del Amazonas',
      originalTitle: 'Amazonia: The Hidden Rivers',
      director: 'Marina Silva',
      cast: ['Tiago Ramos', 'Aura Guajajara'],
      synopsis:
        'Un documental narrativo que se adentra en zonas inexploradas de la selva amazónica registrando especies nunca antes filmadas.',
      genres: ['Documental', 'Aventura'],
      durationMin: 102,
      rating: 'G',
      language: 'Portugués',
      subtitles: ['Español', 'Inglés'],
      releaseDate: new Date('2026-03-01'),
      posterUrl:
        'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&auto=format&fit=crop&q=80',
      trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      score: 8.8,
      country: 'Brasil',
      year: 2026,
    },
  ];

  const createdMovies = [];
  for (const movie of moviesData) {
    const created = await prisma.movie.create({ data: movie });
    createdMovies.push(created);
  }

  // 5. Cinemas & Halls & Seats (3 Cines, 2 a 3 salas cada uno)
  const cinemasData = [
    {
      name: 'CineTickets Grand Plaza',
      address: 'Av. Libertador 4500',
      city: 'Buenos Aires',
      timezone: 'America/Argentina/Buenos_Aires',
      amenities: [
        'IMAX Láser',
        'Sonido Dolby Atmos',
        'Estacionamiento Gratis',
        'Sala VIP con Carta de Vinos',
        'Acceso Adaptado',
      ],
      halls: [
        { name: 'Sala 1 - IMAX Grand', format: HallFormat.IMAX, rows: 8, cols: 12 },
        { name: 'Sala 2 - Confort VIP', format: HallFormat.VIP, rows: 6, cols: 8 },
        { name: 'Sala 3 - Digital 3D', format: HallFormat.THREE_D, rows: 7, cols: 10 },
      ],
    },
    {
      name: 'CineTickets Cineplex Sur',
      address: 'Ruta Panamericana Km 50',
      city: 'Pilar',
      timezone: 'America/Argentina/Buenos_Aires',
      amenities: ['Proyección 4K Láser', 'Candy Bar Premium', 'Acceso Adaptado'],
      halls: [
        { name: 'Sala 1 - Premium 2D', format: HallFormat.TWO_D, rows: 8, cols: 10 },
        { name: 'Sala 2 - Atmos 3D', format: HallFormat.THREE_D, rows: 7, cols: 10 },
      ],
    },
    {
      name: 'CineTickets Recoleta Mall',
      address: 'Vicente López 2050',
      city: 'Buenos Aires',
      timezone: 'America/Argentina/Buenos_Aires',
      amenities: ['Butacas Reclinables', 'Sala VIP', 'Subterráneo Cercano', 'Cafetería Gourmet'],
      halls: [
        { name: 'Sala 1 - Gold Class VIP', format: HallFormat.VIP, rows: 5, cols: 8 },
        { name: 'Sala 2 - Megapantalla 2D', format: HallFormat.TWO_D, rows: 9, cols: 12 },
        { name: 'Sala 3 - RealD 3D', format: HallFormat.THREE_D, rows: 7, cols: 10 },
      ],
    },
  ];

  const createdHallsWithSeats = [];

  for (const cData of cinemasData) {
    const { halls, ...cinProps } = cData;
    const cinema = await prisma.cinema.create({ data: cinProps });

    for (const hData of halls) {
      const hall = await prisma.hall.create({
        data: {
          cinemaId: cinema.id,
          name: hData.name,
          format: hData.format,
          rows: hData.rows,
          cols: hData.cols,
        },
      });

      const seatsInHall = [];
      const rowLetters = 'ABCDEFGHIJKLMN';

      for (let r = 0; r < hData.rows; r++) {
        const rowLetter = rowLetters[r];
        for (let c = 1; c <= hData.cols; c++) {
          let seatType: SeatType = SeatType.standard;

          // Primera fila: accesibles en los extremos
          if (r === 0 && (c === 1 || c === hData.cols)) {
            seatType = SeatType.accessible;
          }
          // Salas VIP son todas VIP, o últimas 2 filas en salas normales son VIP
          else if (hData.format === HallFormat.VIP || r >= hData.rows - 2) {
            seatType = SeatType.vip;
          }

          const seat = await prisma.seat.create({
            data: {
              hallId: hall.id,
              row: rowLetter,
              number: c,
              type: seatType,
              x: c - 1,
              y: r,
            },
          });
          seatsInHall.push(seat);
        }
      }

      createdHallsWithSeats.push({ hall, seats: seatsInHall, cinema });
    }
  }

  // 6. Food Items (16 productos de comida y bebida con tamaños)
  const foodCatalog = [
    {
      name: 'Combo Pareja Mega',
      description: 'Balde de palomitas grandes dulces o saladas + 2 gaseosas 32oz + 1 chocolate',
      category: FoodCategory.combo,
      priceCents: 150000,
      imageUrl:
        'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=600&auto=format&fit=crop&q=80',
      sizes: ['Mediano', 'Grande'],
      available: true,
    },
    {
      name: 'Combo Individual Clásico',
      description: 'Palomitas medianas + 1 gaseosa 22oz',
      category: FoodCategory.combo,
      priceCents: 95000,
      imageUrl:
        'https://images.unsplash.com/photo-1572177191856-3cde618dee1f?w=600&auto=format&fit=crop&q=80',
      sizes: ['Chico', 'Mediano', 'Grande'],
      available: true,
    },
    {
      name: 'Combo Nachos Supreme',
      description: 'Nachos crocantes con queso cheddar caliente, jalapeños y gaseosa grande',
      category: FoodCategory.combo,
      priceCents: 110000,
      imageUrl:
        'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&auto=format&fit=crop&q=80',
      sizes: ['Mediano', 'Grande'],
      available: true,
    },
    {
      name: 'Combo Infantil Kids Pack',
      description: 'Palomitas chicas + gaseosa chica o jugo + golosina sorpresa coleccionable',
      category: FoodCategory.combo,
      priceCents: 85000,
      imageUrl:
        'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
      sizes: ['Chico'],
      available: true,
    },
    {
      name: 'Palomitas Mantequilla Clásica',
      description: 'Tradicionales palomitas con deliciosa mantequilla derretida',
      category: FoodCategory.popcorn,
      priceCents: 65000,
      imageUrl:
        'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=600&auto=format&fit=crop&q=80',
      sizes: ['Chico', 'Mediano', 'Grande', 'Balde'],
      available: true,
    },
    {
      name: 'Palomitas Acarameladas',
      description: 'Palomitas de maíz crocantes cubiertas de dulce caramelo artesanal',
      category: FoodCategory.popcorn,
      priceCents: 75000,
      imageUrl:
        'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&auto=format&fit=crop&q=80',
      sizes: ['Chico', 'Mediano', 'Grande', 'Balde'],
      available: true,
    },
    {
      name: 'Palomitas Mixtas Especiales',
      description: 'Mitad saladas con mantequilla y mitad acarameladas en el mismo balde',
      category: FoodCategory.popcorn,
      priceCents: 80000,
      imageUrl:
        'https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=600&auto=format&fit=crop&q=80',
      sizes: ['Grande', 'Balde'],
      available: true,
    },
    {
      name: 'Gaseosa Coca-Cola',
      description: 'Coca-Cola fría servida con hielo',
      category: FoodCategory.drink,
      priceCents: 45000,
      imageUrl:
        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
      sizes: ['Chico (16oz)', 'Mediano (22oz)', 'Grande (32oz)'],
      available: true,
    },
    {
      name: 'Gaseosa Coca-Cola Zero',
      description: 'Coca-Cola Zero azúcar helada',
      category: FoodCategory.drink,
      priceCents: 45000,
      imageUrl:
        'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80',
      sizes: ['Chico (16oz)', 'Mediano (22oz)', 'Grande (32oz)'],
      available: true,
    },
    {
      name: 'Gaseosa Sprite Lima-Limón',
      description: 'Sprite refrescante con burbujas y toque cítrico',
      category: FoodCategory.drink,
      priceCents: 45000,
      imageUrl:
        'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&auto=format&fit=crop&q=80',
      sizes: ['Chico (16oz)', 'Mediano (22oz)', 'Grande (32oz)'],
      available: true,
    },
    {
      name: 'Agua Mineral de Manantial',
      description: 'Agua mineral natural sin gas o con gas',
      category: FoodCategory.drink,
      priceCents: 35000,
      imageUrl:
        'https://images.unsplash.com/photo-1559839914-ba2ae9876274?w=600&auto=format&fit=crop&q=80',
      sizes: ['500ml'],
      available: true,
    },
    {
      name: 'Café Espresso Gourmet',
      description: 'Café de grano recién molido tostado italiano',
      category: FoodCategory.drink,
      priceCents: 40000,
      imageUrl:
        'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
      sizes: ['Simple', 'Doble'],
      available: true,
    },
    {
      name: 'Chocolates M&M Crispy',
      description: 'Bolsa para compartir de chocolates M&M crocantes',
      category: FoodCategory.candy,
      priceCents: 38000,
      imageUrl:
        'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=600&auto=format&fit=crop&q=80',
      sizes: ['Bolsa 120g', 'Bolsa 200g'],
      available: true,
    },
    {
      name: 'Gomitas Ácidas Sour Patch',
      description: 'Gomitas masticables con sabor a frutas y cubierta ácida',
      category: FoodCategory.candy,
      priceCents: 32000,
      imageUrl:
        'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=600&auto=format&fit=crop&q=80',
      sizes: ['Bolsa 150g'],
      available: true,
    },
    {
      name: 'Tableta de Chocolate Suizo con Almendras',
      description: 'Fino chocolate con leche suizo relleno de almendras tostadas',
      category: FoodCategory.candy,
      priceCents: 42000,
      imageUrl:
        'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80',
      sizes: ['100g'],
      available: true,
    },
    {
      name: 'Hot Dog Clásico con Salsas',
      description: 'Salchicha de primera calidad en pan suave con aderezos y mostaza dijon',
      category: FoodCategory.combo,
      priceCents: 60000,
      imageUrl:
        'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?w=600&auto=format&fit=crop&q=80',
      sizes: ['Regular', 'Gigante'],
      available: true,
    },
  ];

  for (const item of foodCatalog) {
    await prisma.foodItem.create({ data: item });
  }

  // 7. Showtimes (4 a 6 funciones por película por día durante 7 días)
  // Base date fija para total determinismo
  const baseDate = new Date('2026-10-06T12:00:00Z');
  const showtimesCreated = [];

  // Horarios típicos de proyección en minutos desde el inicio del día (14:00, 16:30, 19:00, 21:30, 23:45)
  const dailySlotsHours = [14, 16, 18, 20, 22];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);

    for (const movie of createdMovies) {
      // 4 a 5 funciones por película en ese día repartidas entre salas
      const slotsCount = 4 + Math.floor(rng() * 2); // 4 o 5

      for (let s = 0; s < slotsCount; s++) {
        const hallIdx = Math.floor(rng() * createdHallsWithSeats.length);
        const selectedHallObj = createdHallsWithSeats[hallIdx];
        const hour = dailySlotsHours[s % dailySlotsHours.length];
        const minute = Math.floor(rng() * 3) * 15; // 0, 15 o 30 min

        const startsAt = new Date(currentDay);
        startsAt.setUTCHours(hour, minute, 0, 0);

        // Precios en centavos según el formato
        let priceStandard = 450000; // $4500.00
        let priceVip = 650000; // $6500.00
        let priceAccessible = 350000; // $3500.00

        if (selectedHallObj.hall.format === HallFormat.IMAX) {
          priceStandard = 600000;
          priceVip = 850000;
          priceAccessible = 500000;
        } else if (selectedHallObj.hall.format === HallFormat.THREE_D) {
          priceStandard = 520000;
          priceVip = 720000;
          priceAccessible = 420000;
        } else if (selectedHallObj.hall.format === HallFormat.VIP) {
          priceStandard = 800000;
          priceVip = 950000;
          priceAccessible = 650000;
        }

        const showtime = await prisma.showtime.create({
          data: {
            movieId: movie.id,
            hallId: selectedHallObj.hall.id,
            startsAt,
            language: movie.language === 'Español' ? 'Original' : 'Subtitulada',
            format: selectedHallObj.hall.format,
            priceStandardCents: priceStandard,
            priceVipCents: priceVip,
            priceAccessibleCents: priceAccessible,
          },
        });

        // 8. Ocupación aleatoria pero reproducible de asientos para cada función (10% a 25% de asientos ocupados)
        const seats = selectedHallObj.seats;
        const occupancyRate = 0.1 + rng() * 0.15;
        const occupiedSeatsCount = Math.floor(seats.length * occupancyRate);

        // Barajamos asientos pseudoaleatoriamente
        const shuffledSeats = [...seats].sort(() => rng() - 0.5);
        const occupiedSeats = shuffledSeats.slice(0, occupiedSeatsCount);

        if (occupiedSeats.length > 0) {
          const fakeOrder = await prisma.order.create({
            data: {
              userId: demoUser.id,
              showtimeId: showtime.id,
              status: OrderStatus.CONFIRMED,
              subtotalCents: occupiedSeatsCount * priceStandard,
              feesCents: Math.round(occupiedSeatsCount * priceStandard * 0.05),
              totalCents: Math.round(occupiedSeatsCount * priceStandard * 1.05),
              holdExpiresAt: startsAt,
              idempotencyKey: `seed-order-${showtime.id}`,
              qrCode: `TICKET-${showtime.id}-DEMO`,
            },
          });

          for (const seat of occupiedSeats) {
            await prisma.orderSeat.create({
              data: {
                orderId: fakeOrder.id,
                showtimeId: showtime.id,
                seatId: seat.id,
                ticketTypeId: 'adult',
                priceCents: priceStandard,
              },
            });
          }
        }

        showtimesCreated.push(showtime);
      }
    }
  }

  console.log(`Seed complete!`);
  console.log(`Created:`);
  console.log(`- ${createdMovies.length} movies`);
  console.log(`- ${cinemasData.length} cinemas`);
  console.log(`- ${createdHallsWithSeats.length} halls with all seat layouts`);
  console.log(`- ${foodCatalog.length} food items`);
  console.log(`- ${showtimesCreated.length} showtimes generated over 7 days`);
  console.log(`- Demo user: ${demoUser.email}`);
}

// Ejecución directa si se invoca desde CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

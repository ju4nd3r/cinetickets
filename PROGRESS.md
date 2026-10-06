# Progreso del Proyecto: CineTickets

## Estado General

- **Fase Actual:** Fase 4 (Holds, Órdenes y Pago)
- **Repositorio objetivo:** `https://github.com/ju4nd3r/cinetickets`
- **Estado CI:** Fase 2 en verde en main

---

## Plan de Fases

### Fase 0: Base y Configuración Inicial

- [x] Confirmar usuario de GitHub y nombre de repositorio con el usuario (`ju4nd3r/cinetickets`, público).
- [x] Inicializar monorepo pnpm (`pnpm-workspace.yaml`, `package.json` raíz).
- [x] Configuración compartida de TypeScript, ESLint y Prettier.
- [x] Esqueleto de `packages/shared`.
- [x] Esqueleto de `apps/api` (Fastify + `/health` + `/api/v1/health` + OpenAPI Swagger en `/docs`).
- [x] Esqueleto de `apps/mobile` (Expo + Expo Router + Jest).
- [x] Configuración Docker (`docker-compose.yml`, Dockerfile API multi-stage con usuario no root y healthchecks, `docker-compose.test.yml`, `.env.example`, `.dockerignore`).
- [x] Inicializar Git, configurar `.gitignore`, crear repositorio en GitHub y enlazar `origin`.
- [x] Pipeline CI en GitHub Actions (`.github/workflows/ci.yml`).
- [x] Verificación de aceptación: `docker compose up --build` responde en `/api/v1/health`, CI configurado y pruebas unitarias/funcionales pasando.

### Fase 1: Contrato Compartido y Modelo de Datos

- [x] Esquemas Zod y tipos TypeScript en `packages/shared` (películas, cines, salas, asientos, funciones, comida, órdenes, pagos).
- [x] `schema.prisma` completo con relaciones e índices únicos (`UNIQUE(showtimeId, seatId)`).
- [x] Migraciones iniciales de Prisma (`20261005221553_init_models`).
- [x] Script de seed reproducible e idempotente (`seed = 42`, 12 películas completas, 3 cines, 8 salas, 388 funciones en 7 días, 16 productos de comida, usuario demo).
- [x] Pruebas unitarias de esquemas Zod en `shared` y determinismo del seed.
- [x] Verificación de aceptación: Base de datos poblada de forma consistente tras `docker compose up` y pruebas funcionales en verde.

### Fase 2: Dominio y Casos de Uso (Arquitectura Limpia)

- [x] Capa `domain` pura (entidades, reglas de precio en centavos, cargo de servicio 5%, descuentos por tipo de ticket, reglas de asientos máx 10, máquina de estados de orden).
- [x] Capa `application` (casos de uso: búsqueda, funciones, mapa de asientos, holds, órdenes, pago, consulta).
- [x] Puertos e interfaces (`MovieRepository`, `ShowtimeRepository`, `SeatHoldStore`, `OrderRepository`, `PaymentGateway`, `Clock`).
- [x] Dobles en memoria y FakeClock para pruebas unitarias.
- [x] Pruebas unitarias completas con Vitest (cobertura alcanzada: 96.3% en Stmts/Lines, 90.15% en Branches, 100% en Funcs, superando el umbral de 85%).

### Fase 3: API de Catálogo

- [x] Implementación de repositorios de infraestructura con Prisma.
- [x] Rutas HTTP en Fastify: `/movies`, `/movies/:id`, `/movies/:id/showtimes`, `/showtimes/:id/seats`, `/food`, `/ticket-types`.
- [x] Documentación OpenAPI Swagger en `/docs`.
- [x] Pruebas funcionales contra PostgreSQL y Redis reales (pruebas 1, 2, 3, 11).

### Fase 4: Holds, Órdenes y Pago

- [ ] Hold temporal atómico de asientos en Redis con TTL de 8 minutos (`SET key val NX EX 480`).
- [ ] Endpoint `/showtimes/:id/holds` y `DELETE /holds/:id`.
- [ ] Endpoint `POST /orders` con `Idempotency-Key` y máquina de estados.
- [ ] Endpoint `POST /orders/:id/pay` con pasarela simulada determinística (`0000`, `1111`) y generación de código QR.
- [ ] Endpoints `GET /orders` y `GET /orders/:id`.
- [ ] Pruebas funcionales de concurrencia, expiración, idempotencia y pagos (pruebas 4 a 10).

### Fase 5: App Móvil - Cartelera y Detalle

- [ ] Configuración de `ApiClient` tipado con validación Zod y manejo de errores.
- [ ] Configuración de TanStack Query.
- [ ] Pantalla de cartelera (búsqueda, filtros por género, formato, cine).
- [ ] Pantalla de detalle de película (metadatos completos, tráiler, ficha técnica).
- [ ] Lista de funciones agrupadas por cine con formato y precios visibles.
- [ ] Pruebas unitarias de componentes y hooks.

### Fase 6: App Móvil - Selección de Asientos y Snacks

- [ ] Componente `SeatMap` interactivo y optimizado con tipos de asiento (libre, ocupado, seleccionado, VIP, accesible).
- [ ] Store de selección en Zustand (límite 10, hold con temporizador visible).
- [ ] Asignación de tipos de entrada por asiento con descuentos calculados.
- [ ] Pantalla de selección de comida y bebidas con tamaños y cantidades.
- [ ] Pruebas unitarias de stores y componentes.

### Fase 7: App Móvil - Checkout y Mis Entradas

- [ ] Formulario de comprador con React Hook Form + Zod.
- [ ] Desglose detallado de precios (entradas, comida, cargo de servicio 5%, total).
- [ ] Pasarela de pago simulada y manejo de estados (`SEAT_UNAVAILABLE`, `HOLD_EXPIRED`, `PAYMENT_DECLINED`).
- [ ] Pantalla de confirmación con código QR (`react-native-qrcode-svg`).
- [ ] Pantalla "Mis Entradas" con pestañas Próximas y Pasadas.
- [ ] Pruebas unitarias y de integración de la UI.

### Fase 8: Pruebas E2E, Accesibilidad y Entrega

- [ ] Flujos E2E con Maestro (flujo completo, pago rechazado, asiento ocupado, expiración).
- [ ] Soporte de modo oscuro, accesibilidad (labels, roles) y textos en español.
- [ ] Documentación completa en `README.md` (arquitectura, setup local, Docker, URLs por plataforma, ejecución de tests y EAS Build).
- [ ] Verificación final de CI en GitHub Actions y entrega del enlace del repositorio.

---

## Registro de Decisiones y Cambios

- _Inicio del proyecto_: Creación del plan detallado en `PROGRESS.md` conforme al prompt.
- _Fase 3 (API de Catálogo)_: Implementación de repositorios Prisma (`PrismaMovieRepository`, `PrismaShowtimeRepository`, `PrismaCatalogRepository`), endpoints Fastify documentados con OpenAPI en `/docs`, fallback seguro de variables de entorno de prueba para Vitest, y validación funcional contra PostgreSQL 16 y Redis 7 reales.

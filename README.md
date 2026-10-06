# CineTickets 🎬🍿

Sistema completo para la reserva y compra de entradas de cine en tiempo real, compuesto por una **aplicación móvil multiplataforma (Android e iOS con React Native y Expo Router)** y un **backend dockerizado de alto rendimiento (Node.js 20, Fastify, Prisma, PostgreSQL 16 y Redis 7)** en un único monorepo (`pnpm workspaces`).

---

## 🌟 Características Principales

1. **Cartelera Dinámica:** Exploración de películas con búsqueda en vivo y filtros combinables por género, formato (`2D`, `3D`, `IMAX`, `VIP`) y cine.
2. **Ficha Técnica Detallada:** Información completa por película: título original, director, reparto, sinopsis, duración, clasificación, idioma, subtítulos, tráiler interactivo, puntuación y país/año.
3. **Funciones y Precios:** Selección de fechas (7 días) y horarios agrupados por complejo cinematográfico con formatos y precios base visibles por tipo de asiento.
4. **Mapa de Sala Interactivo:** Visualización de pantalla, pasillos y filas con estados en tiempo real (libre, ocupado, seleccionado, VIP, accesible). Límite de hasta 10 asientos por compra.
5. **Precios y Descuentos por Asiento:** Asignación individual del tipo de entrada por persona:
   - **Adulto:** Tarifa base (0% desc.)
   - **Niño:** 30% de descuento
   - **Senior (60+):** 25% de descuento
   - **Estudiante:** 15% de descuento
6. **Catálogo de Dulcería (Snacks y Bebidas):** Selección de combos, palomitas, bebidas y dulces con tamaños y cantidades, o salto directo a pago.
7. **Resumen y Checkout Transaccional:**
   - Desglose detallado: entradas con descuento, snacks, cargo por servicio (5% sobre entradas) y total en enteros (centavos).
   - Formulario de comprador validado con React Hook Form + Zod.
   - Pasarela de pago simulada y determinística con tarjetas de prueba.
8. **Boleto Digital con Código QR:** Confirmación con código QR (`react-native-qrcode-svg`) y consulta de órdenes en "Mis Entradas" (pestañas de funciones próximas y pasadas).

---

## 🏗️ Arquitectura del Sistema

El proyecto sigue una estricta **Arquitectura Limpia (Clean Architecture)** desacoplada y orientada a puertos y adaptadores:

```
cinetickets/
├── .github/workflows/ci.yml       # Integración continua en GitHub Actions
├── apps/
│   ├── api/                       # Backend Fastify + Prisma + Redis
│   │   ├── src/
│   │   │   ├── domain/            # TypeScript puro: reglas de precios, asientos, máquina de estados
│   │   │   ├── application/       # Casos de uso e interfaces (puertos)
│   │   │   ├── infrastructure/    # Implementaciones: Prisma, Redis, pasarela simulada, reloj
│   │   │   └── http/              # Rutas Fastify, validación Zod, documentación OpenAPI
│   │   ├── prisma/                # schema.prisma, migraciones y seed.ts
│   │   ├── tests/                 # Pruebas unitarias (Vitest) y funcionales (PostgreSQL + Redis)
│   │   └── Dockerfile             # Multi-stage production image (node:20-alpine)
│   └── mobile/                    # App móvil React Native + Expo Router
│       ├── app/                   # Rutas de Expo Router (Cartelera, Detalle, Reserva, Checkout, etc.)
│       ├── src/
│       │   ├── api/               # ApiClient centralizado tipado con Zod
│       │   └── features/          # Componentes, hooks y Zustand stores
│       ├── __tests__/             # Pruebas unitarias y de integración (Jest + RNTL)
│       └── .maestro/              # Flujos de pruebas E2E con Maestro
├── packages/
│   └── shared/                    # Contrato común: tipos TS, esquemas Zod y constantes
├── docker-compose.yml             # Entorno principal (API + PostgreSQL + Redis)
├── docker-compose.test.yml        # Servicios efímeros para pruebas funcionales
├── pnpm-workspace.yaml            # Monorepo workspaces
├── PROGRESS.md                    # Registro exhaustivo de fases y decisiones
└── README.md
```

### Reglas Críticas del Sistema de Ticketing

- **Hold temporal atómico de asientos:** Implementado en Redis con TTL de 8 minutos (`SET key value NX EX 480`). La app muestra un contador regresivo (`HoldTimer`).
- **Garantía anti-doble reserva:** Hold atómico + restricción única en base de datos `UNIQUE(showtimeId, seatId)` + validación al ejecutar el pago. Conflicto → `409 SEAT_UNAVAILABLE`.
- **Idempotencia estricta:** `POST /orders` y `POST /orders/:id/pay` exigen la cabecera `Idempotency-Key`. La repetición de una clave devuelve la misma respuesta sin duplicar cargos ni órdenes.
- **Máquina de estados de orden:** Transiciones controladas: `DRAFT → SEATS_HELD → PAYMENT_PENDING → CONFIRMED | EXPIRED | FAILED | CANCELLED`.
- **Manejo monetario:** Todo el dinero se almacena y procesa exclusivamente en **enteros (centavos)** para evitar errores de redondeo de punto flotante.
- **Fuente de verdad:** El cálculo de precios final se realiza en el servidor.
- **Códigos de error estables:** `SEAT_UNAVAILABLE`, `HOLD_EXPIRED`, `PAYMENT_DECLINED`, `VALIDATION_ERROR`, `NOT_FOUND`.

---

## 🧪 Pasarela de Pago Simulada Determinística

Para facilitar pruebas automatizadas y demostraciones:

- **Tarjeta terminada en `0000`:** Rechazo simulado por banco (`PAYMENT_DECLINED` / HTTP 402).
- **Tarjeta terminada en `1111`:** Error de red / pasarela simulado (HTTP 502).
- **Cualquier otra tarjeta:** Pago aprobado exitosamente con generación de código QR (`CT-QR-...`).

_(La pantalla de Checkout en la app móvil incluye botones de relleno rápido para probar ambos escenarios al instante)._

---

## 🚀 Puesta en Marcha Rápida (Docker)

El backend completo (**API Fastify + PostgreSQL 16 + Redis 7**) se inicializa en cualquier máquina con Docker sin requerir herramientas adicionales. Al arrancar, el contenedor ejecuta migraciones de Prisma, puebla la base de datos con el seed reproducible y habilita los endpoints:

```bash
# 1. Clonar el repositorio
git clone https://github.com/ju4nd3r/cinetickets.git
cd cinetickets

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar contenedores
docker compose up --build
```

- **Health Check:** `http://localhost:3000/api/v1/health`
- **Documentación Swagger / OpenAPI:** `http://localhost:3000/docs`

### Datos de Prueba Reproducibles (Seed = 42)

- **12 películas completas** con imágenes, ficha técnica, tráilers y clasificaciones.
- **3 complejos de cine** con salas 2D, 3D, IMAX y VIP.
- **388 funciones programadas** a lo largo de los próximos 7 días con ocupación realista reproducible.
- **16 productos de dulcería** con categorías y tamaños.
- **Usuario demo:** `demo@cinetickets.test`

---

## 📱 Ejecución de la App Móvil (Expo)

La aplicación móvil se ejecuta en desarrollo mediante Expo SDK 51:

```bash
# Instalar dependencias en la raíz
pnpm install

# Iniciar Expo
cd apps/mobile
pnpm start
```

### URLs de Conexión según la Plataforma (`EXPO_PUBLIC_API_URL`):

- **Android Emulator:** `http://10.0.2.2:3000`
- **iOS Simulator:** `http://localhost:3000`
- **Dispositivo Físico:** `http://<IP_DE_TU_PC_EN_LA_RED_LOCAL>:3000` (asegúrate de que el dispositivo esté en la misma red Wi-Fi).

### Compilación Nativa (EAS Build)

El proyecto está preparado para EAS Build:

```bash
# Instalar EAS CLI
pnpm add -g eas-cli

# Iniciar sesión y configurar build nativo para Android / iOS
eas login
eas build:configure
eas build --platform all
```

---

## 🧪 Pruebas Automatizadas y Calidad

El monorepo cuenta con una suite integral de pruebas unitarias, funcionales y de extremo a extremo:

### 1. Formato, Linter y Tipos

```bash
# Verificación estricta de tipos TypeScript en todo el monorepo
pnpm typecheck

# Linter ESLint (cero 'any' permitido)
pnpm lint

# Formato Prettier
pnpm format:check
```

### 2. Pruebas Unitarias y Cobertura

```bash
# Todas las pruebas unitarias (Backend, Shared y Mobile)
pnpm test

# Cobertura unitaria en backend (Vitest - supera umbral de 85%):
pnpm --filter @cinetickets/api test:coverage

# Cobertura unitaria en móvil (Jest - supera umbral de 70%, alcanzando 85%):
pnpm --filter @cinetickets/mobile test:coverage
```

### 3. Pruebas Funcionales con PostgreSQL y Redis Reales

```bash
# Levantar servicios de prueba efímeros en Docker
docker compose -f docker-compose.test.yml up -d

# Ejecutar pruebas funcionales del API
pnpm test:functional

# Apagar servicios de prueba
docker compose -f docker-compose.test.yml down
```

### 4. Pruebas E2E Móviles con Maestro

Ubicadas en `apps/mobile/.maestro/`:

- `happy-path.yaml`: Flujo completo desde exploración de cartelera, selección de asientos, dulcería, checkout, confirmación QR y validación en "Mis Entradas".
- `payment-declined.yaml`: Validación de rechazo determinístico con tarjeta `0000`.

```bash
# Ejecutar suite con Maestro CLI
maestro test apps/mobile/.maestro/all-flows.yaml
```

---

## 🛡️ Pipeline CI en GitHub Actions

Cada pull request y commit a la rama `main` ejecuta automáticamente:

1. `Lint & Typecheck`: ESLint y `tsc --noEmit` en todos los paquetes.
2. `Unit Tests & Coverage`: Vitest y Jest con verificación de umbrales.
3. `Functional Tests`: Levantamiento de contenedores de prueba PostgreSQL y Redis en runner de GitHub y ejecución de suite funcional.
4. `Docker Build API`: Construcción multi-stage de la imagen Docker de producción.

Repositorio público en GitHub: [https://github.com/ju4nd3r/cinetickets](https://github.com/ju4nd3r/cinetickets)

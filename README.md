# CineTickets 🎬🍿

CineTickets es una solución completa y moderna para la venta y reserva de tickets de cine, compuesta por una aplicación móvil multiplataforma (Android e iOS con React Native y Expo Router) y un backend de alto rendimiento (Fastify, Prisma, PostgreSQL y Redis), organizados en un único repositorio (monorepo).

## Stack Tecnológico

- **Lenguaje:** TypeScript en todo el monorepo.
- **Monorepo:** pnpm workspaces.
- **Backend:** Node.js 20, Fastify, Prisma ORM, PostgreSQL 16, Redis 7. Documentación OpenAPI Swagger en `/docs`.
- **App Móvil:** React Native, Expo SDK, Expo Router, TanStack Query, Zustand, React Hook Form + Zod, react-native-svg, react-native-qrcode-svg.
- **Contrato Compartido:** Esquemas Zod y tipos compartidos en `packages/shared`.
- **Contenedores:** Docker y Docker Compose con healthchecks multi-servicio.
- **Pruebas:** Vitest (backend y shared), Jest + React Native Testing Library (app móvil), Supertest/Fastify Inject con PostgreSQL y Redis reales (funcionales), Maestro (E2E móvil).
- **CI/CD:** GitHub Actions.

## Estructura del Monorepo

```
cinetickets/
├── .github/workflows/ci.yml    # Pipeline de integración continua
├── apps/
│   ├── mobile/                 # App móvil Expo Router
│   └── api/                    # Backend Fastify + Prisma
├── packages/
│   └── shared/                 # Esquemas Zod, tipos y contratos
├── docker-compose.yml          # Entorno de producción / desarrollo
├── docker-compose.test.yml     # Entorno efímero para pruebas funcionales
├── .env.example                # Variables de entorno de ejemplo
├── pnpm-workspace.yaml         # Configuración del monorepo pnpm
├── PROGRESS.md                 # Registro de fases y decisiones
└── README.md
```

## Requisitos Previos

- [Node.js](https://nodejs.org/) v20 o superior
- [pnpm](https://pnpm.io/) v9 o superior
- [Docker](https://www.docker.com/) y Docker Compose

## Puesta en Marcha Rápida (Backend Dockerizado)

Para levantar el backend junto con PostgreSQL y Redis automáticamente:

```bash
# 1. Clonar el repositorio
git clone https://github.com/ju4nd3r/cinetickets.git
cd cinetickets

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Iniciar servicios con Docker Compose
docker compose up --build
```

- **API Health:** [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **Documentación Swagger / OpenAPI:** [http://localhost:3000/docs](http://localhost:3000/docs)

## Ejecutar la App Móvil (Expo)

La app móvil se ejecuta en tu máquina local o en tu dispositivo mediante Expo:

```bash
# Instalar dependencias
pnpm install

# Iniciar la app móvil
cd apps/mobile
pnpm start
```

### URLs de API según la plataforma:

- **Android Emulator:** `http://10.0.2.2:3000`
- **iOS Simulator:** `http://localhost:3000`
- **Dispositivo Físico:** `http://<TU_IP_LOCAL>:3000` (asegúrate de que el teléfono y el PC estén en la misma red Wi-Fi).

## Ejecución de Pruebas y Calidad

```bash
# Verificación de tipos TypeScript
pnpm typecheck

# Linter y formato
pnpm lint
pnpm format:check

# Pruebas unitarias
pnpm test

# Pruebas funcionales (requiere docker-compose.test.yml levantado)
docker compose -f docker-compose.test.yml up -d
pnpm test:functional
docker compose -f docker-compose.test.yml down

# Pruebas E2E móviles con Maestro
pnpm test:e2e
```

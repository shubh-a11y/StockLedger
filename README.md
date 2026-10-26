# StockLedger

A full-stack inventory ledger starter for the Shop Inventory Ledger assignment.

## Architecture
- `apps/api`: Express + TypeScript REST API, authentication, authorization, business logic, tests
- `apps/web`: React + Vite + TypeScript frontend
- PostgreSQL is the source of truth.
- Stock is derived from `StockMovement` records; there is intentionally no editable `Product.stock` field.

## Prerequisites
- Node.js 22+
- npm 10+
- Docker Desktop (or a local PostgreSQL 16+ server)

## Quick start
1. Copy `.env.example` to `.env` and replace the development secrets.
2. Start PostgreSQL: `docker compose up -d db`
3. Install dependencies: `npm install`
4. Generate Prisma client: `npm run db:generate`
5. Apply migrations: `npm run db:migrate`
6. Seed demo data: `npm run db:seed`
7. Start API and frontend: `npm run dev`

The exact commands may be refined as the API and UI are implemented. Do not use the demo credentials in production.

## Design decisions
- Products store metadata only; current stock is computed as the sum of signed movements.
- The server derives movement direction from the movement type. Clients submit positive quantities only.
- Every stock-changing operation is handled in a database transaction.
- Sale requests lock the product row before calculating available stock and inserting the movement. This serializes competing sales for the same product.
- Owner/staff authorization is enforced by backend middleware and route/service checks; hiding UI controls is not authorization.
- Movement records should not be edited or deleted through normal application flows. Corrections are made by adding a compensating adjustment.

## Planned API
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/products`
- `POST /api/products` (owner)
- `GET /api/products/:id`
- `PATCH /api/products/:id` (owner)
- `GET /api/products/:id/movements`
- `GET /api/movements` (owner; staff access can be narrowed)
- `POST /api/movements/purchase` (owner)
- `POST /api/movements/sale` (owner or staff)
- `POST /api/movements/return` (owner or staff)
- `POST /api/movements/adjustment` (owner)
- `GET /api/reports/low-stock`
- `GET /api/reports/stock.csv` (optional)

## Tests to implement
1. Purchase increases calculated stock.
2. Sale decreases calculated stock.
3. Sale exceeding available stock is rejected.
4. Return increases calculated stock.
5. Invalid quantity is rejected.
6. Staff is forbidden from owner-only operations.
7. Two concurrent sales cannot both sell the final unit.
8. A failed operation leaves no partial movement.

## Security notes
- Never commit `.env`.
- Use HTTP-only, secure cookies in production.
- Use a strong `JWT_SECRET`; rotate demo credentials before deployment.
- Do not expose password hashes or internal error traces in API responses.

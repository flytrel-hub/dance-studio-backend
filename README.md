# Dance Studio Backend

NestJS API для управления танцевальной студией.

## Технологии

- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- JWT авторизация
- Swagger API

## Быстрый запуск

```bash
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Swagger: http://localhost:3000/api/docs

## Тестовые данные

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@studio.ru | password123 |
| Тренер | ivanov@studio.ru | password123 |
| Клиент | alexandrova@studio.ru | password123 |

## Docker

```bash
docker compose up -d
```

## Деплой на Railway

1. Создай проект на [railway.app](https://railway.app)
2. Подключи репозиторий
3. Добавь PostgreSQL базу (New → Database → PostgreSQL)
4. Добавь переменные окружения:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | (автоматически от Railway) |
| `JWT_SECRET` | секретный_ключ |
| `JWT_REFRESH_SECRET` | секретный_ключ_обновления |
| `JWT_EXPIRATION` | 15m |
| `JWT_REFRESH_EXPIRATION` | 7d |
| `CORS_ORIGINS` | URL_фронтенда |
| `PORT` | 3000 |

5. Railway автоматически соберёт и запустит приложение

## API Endpoints

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/profile
PUT    /api/auth/avatar

GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id

GET    /api/trainers
POST   /api/trainers
PUT    /api/trainers/:id
DELETE /api/trainers/:id

GET    /api/groups
POST   /api/groups
PUT    /api/groups/:id
DELETE /api/groups/:id
POST   /api/groups/:id/members
DELETE /api/groups/:id/members/:clientId

GET    /api/lessons
GET    /api/lessons/schedule
POST   /api/lessons
PUT    /api/lessons/:id
DELETE /api/lessons/:id
POST   /api/lessons/:id/book
POST   /api/lessons/:id/cancel

GET    /api/attendance/lesson/:lessonId
POST   /api/attendance/lesson/:lessonId
GET    /api/attendance
GET    /api/attendance/stats

GET    /api/subscriptions
POST   /api/subscriptions
PUT    /api/subscriptions/:id
POST   /api/subscriptions/:id/freeze
POST   /api/subscriptions/:id/unfreeze
DELETE /api/subscriptions/:id
POST   /api/subscriptions/request
POST   /api/subscriptions/:id/approve
POST   /api/subscriptions/:id/reject

GET    /api/payments
GET    /api/payments/recent
GET    /api/payments/stats
POST   /api/payments
DELETE /api/payments/:id

GET    /api/reports/overview
GET    /api/reports/attendance/groups
GET    /api/reports/attendance/trainers
GET    /api/reports/revenue
GET    /api/reports/subscriptions/distribution

GET    /api/dashboard
```

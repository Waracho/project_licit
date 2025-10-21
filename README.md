# LicitAgil

> Sistema de **licitaciones** con verificación automática de PDFs, revisión por niveles y chat asíncrono entre postores (**BIDDER**) y personal interno (**WORKER**).

## Revisar rama "presentation" para estado actual del proyecto
---

## Tabla de contenido
- [Resumen](#resumen)
- [Tecnologías usadas](#tecnologías-usadas)
- [Requisitos](#requisitos)
- [Configuración de entorno](#configuración-de-entorno)
  - [Frontend (`frontend/.env`)](#frontend_env)
  - [Backend (`origin/.env`)](#origin_env)
- [Ejecución con Docker](#ejecución-con-docker)
- [Pruebas (Cypress)](#pruebas-cypress)
- [Solución de problemas (FAQ)](#solución-de-problemas-faq)

---

## Resumen

**LicitAgil** gestiona el ciclo de vida de una licitación:

- **Carga y verificación automática de PDFs** de licitaciones (archivo principal por solicitud).
- **Flujo de revisión por niveles**: WORKERs pueden **aprobar (+1)** o **rechazar**; se muestra estado, categoría y nivel actual/requerido.
- **Descarga segura** con **URLs prefirmadas** (S3–compatible).
- **Filtros y búsqueda** por código y rangos de fecha; ordenamiento en cliente.
- **Autenticación y rutas protegidas por rol** (`ADMIN`, `BIDDER`, `WORKER`) con `RequireRole` y `AuthedLayout`.
- **Chat asíncrono**:
  - El **BIDDER** abre un chat; el backend asigna un **WORKER** al azar (o el WORKER puede iniciar chat con un BIDDER específico).
  - BIDDER: **botón flotante** persistente con contador de mensajes no leídos.
  - WORKER: **pantalla dedicada** de chat (lista a la izquierda, conversación a la derecha).
  - Contadores de no leídos por participante, previsualización del último mensaje y *polling* ligero.
- **Seed** de roles/departamentos en el arranque (IDs de rol **dinámicas**; el front resuelve el `rolId` de BIDDER consultando `/roles`).

---

## Tecnologías usadas

### Frontend — **Vite + React (TypeScript)**
SPA con `react-router-dom` y hooks (`useState`, `useEffect`, `useMemo`).  
Layouts y rutas privadas por rol (`AuthedLayout`, `RequireRole`).  
CSS simple; descarga de PDFs mediante presigned URL.

### Backend — **FastAPI + MongoDB**
API asíncrona (Uvicorn/FastAPI) con **Pydantic** para modelos/validación.  
MongoDB (driver async) para usuarios, roles, departamentos, licitaciones, **chats** y **mensajes**.  
Semillado inicial (roles/departamentos) al arrancar. Integración S3 para **presigned GET**.

### Pruebas de software — **Cypress**
Pruebas E2E de los flujos principales: login, navegación por rol, listado/revisión de licitaciones y chat.  
Ejecución interactiva (`cy:open`) o headless (`cy:run`) lista para CI.

## Requisitos

- **Docker Desktop** (para ejecución recomendada)  
- (Dev sin Docker) Python 3.11+ y Node 18+

Puertos por defecto:
- Frontend: **8080** (o 5173 en Vite dev)
- Backend: **8000**

---

## Configuración de entorno

### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:8000
```

### Origin (`project_licit/.env`)

```ini
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB=miapp

AWS_REGION=us...
S3_BUCKET=pp...
AWS_ACCESS_KEY_ID=AKI...
AWS_SECRET_ACCESS_KEY=eUm...
```

## Ejecución con docker

Para la ejecución estándar
```ini
docker compose up --build
```

Para borrar las bases de datos creadas

```ini
docker compose down -v
```
### Revisión
- Frontend: http://localhost:8080
- Mongo Express: http://localhost:8081/

## Solución de problemas (FAQ)

500 en /roles
- Asegúrate de que el response_model use key: string (no Literal rígido) y proyecta campos mínimos en el find.

CORS
- Incluye el origen del front (http://localhost:8080 / http://localhost:5173) en CORS_ORIGINS.

Signup (crear cuenta)
- El front resuelve el rolId de BIDDER consultando /roles antes de crear usuario.
- Si falla, verifica que el router de /roles esté montado y que el seed haya corrido.

Descarga de PDFs (presigned GET)
- Configura variables S3 correctamente y verifica conectividad con tu endpoint S3/MinIO.

Chat no conecta
- Verifica que el router /chats/* esté incluido en app.main.
- Asegura que exista al menos un usuario WORKER semillado.
- En /chats/start, se reutiliza chat abierto por bidderUserId (+ tenderRequestId si aplica); no se exige el mismo workerUserId.
- Errores de validación con fechas (createdAt)
Define createdAt/lastMessageAt como datetime en Pydantic (FastAPI serializa a ISO automáticamente).

## Pruebas (Cypress)
- En la rama dev_testing se ejecutan pruebas E2E con Cypress para el flujo completo.
- Comando sugerido:
```ini
npx cypress run --e2e
npx cypress open

```



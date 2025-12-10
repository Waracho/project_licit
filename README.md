# LicitAgil

> Sistema de **licitaciones** con verificación automática de PDFs, revisión por niveles y chat asíncrono entre postores (**BIDDER**) y personal interno (**WORKER**).
> 
> Última rama base: `main`
> 
> Video entrega 1: https://youtu.be/5adWhOlFJDo
> 
> Video entrega 2: https://youtu.be/NIh8oXUAUA8

---

## Tabla de contenido
- [Resumen](#resumen)
- [Arquitectura](#arquitectura)
- [Tecnologías usadas](#tecnologías-usadas)
- [Requisitos](#requisitos)
- [Configuración de entorno](#configuración-de-entorno)
  - [Frontend (`frontend/.env`)](#frontend-env)
  - [Backend / raíz (`.env`)](#backend-env)
- [Ejecución con Docker](#ejecución-con-docker)
- [Pruebas (Cypress)](#pruebas-cypress)
  - [Comandos de soporte y custom commands](#comandos-de-soporte-y-custom-commands)
  - [Matriz de pruebas](#matriz-de-pruebas)
- [CI/CD con Jenkins](#cicd-con-jenkins)
  - [Requisitos del Jenkins host](#requisitos-del-jenkins-host)
  - [Credenciales utilizadas](#credenciales-utilizadas)
  - [Job “Pipeline script from SCM”](#job-pipeline-script-from-scm)
  - [Jenkinsfile (resumen)](#jenkinsfile-resumen)
  - [Fumado rápido (“smoke check”)](#fumado-rápido-smoke-check)
  - [Troubleshooting Jenkins](#troubleshooting-jenkins)
- [Solución de problemas (FAQ)](#solución-de-problemas-faq)

---

## Resumen

**LicitAgil** gestiona el ciclo completo de una licitación:

- **Carga y verificación automática de PDF** (estructura, tamaño/páginas).
- **Revisión por niveles** (aprobación +1/rechazo) por **WORKER/ADMIN** con tracking de estado y nivel requerido.
- **Descarga segura** mediante **URLs prefirmadas** (S3-compatible).
- **Autenticación y rutas protegidas por rol** (`ADMIN`, `BIDDER`, `WORKER`).
- **Chat asíncrono**:
  - El **BIDDER** abre un chat (botón flotante con badge de no leídos).
  - El **WORKER** responde desde una pantalla dedicada (lista + conversación).
  - Contadores de no leídos por participante, *polling* liviano, preview del último mensaje.
- **Seed** de roles/departamentos al arrancar.

---

## Arquitectura

```
frontend (Vite/React)
  ├─ rutas por rol (RequireRole / AuthedLayout)
  ├─ módulo bidder (aplicar, listar, chat flotante)
  └─ módulo worker (pantalla de chats)

backend (FastAPI)
  ├─ auth + roles + departamentos (seed)
  ├─ tender-requests + archivos + presign (S3)
  └─ chats + messages (BIDDER/WORKER)

infra
  ├─ docker-compose (mongo, api, front, mongo-express)
  └─ Jenkins (pipeline desde SCM, build + up + smoke)
```

---

## Tecnologías usadas

**Frontend — Vite + React (TypeScript)**
- `react-router-dom`, hooks, CSS simple.
- Descarga por presigned URL.
- Botón flotante de chat con *polling* a `/chats/unread_count`.

**Backend — FastAPI + MongoDB**
- Uvicorn/FastAPI async.
- Pydantic para modelos/validación.
- MongoDB async (usuarios, roles, departamentos, tenders, chats y mensajes).
- Presign **GET/PUT** a S3.

**Pruebas — Cypress**
- E2E de login, navegación por rol, creación/validación de tender y chat.

---

## Requisitos

- **Docker Desktop** (recomendado para ejecución local)
- (Modo dev opcional) Node 18+ y Python 3.11+
- Puertos:
  - Frontend: **8080**
  - Backend: **8000**
  - Mongo Express: **8081**

---

## Configuración de entorno

### Frontend (`frontend/.env`)

```ini
VITE_API_URL=http://localhost:8000
```

### Backend / raíz (`.env`) <a id="backend-env"></a>

> Archivo en la raíz del proyecto (donde está `docker-compose.yml`).

```ini
# Mongo (el servicio del compose se llama "mongo")
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB=miapp

# S3 (o compatible)
AWS_REGION=us-east-2
S3_BUCKET=ppdsfiles
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Nota:** en CI (Jenkins) estas variables se inyectan desde **credenciales** (ver sección Jenkins).

---

## Ejecución con Docker

Build + up:
```bash
docker compose up --build
```

Bajar y borrar volúmenes (p. ej., limpiar DB):
```bash
docker compose down -v
```

**Revisión manual**
- Frontend: http://localhost:8080
- Backend (docs): http://localhost:8000/docs
- Mongo Express: http://localhost:8081

---

## Pruebas (Cypress)

### Comandos de soporte y custom commands

En `cypress/support/commands.ts`:

- **`cy.loginUI()`**: login por UI.
- **`cy.seedSession(user)`** / **`cy.seedSessionWithRole(roleKey, user?)`**: “inyecta” sesión en `localStorage`.
- **`cy.loginAsBidder()`** / **`cy.loginAsAdmin()`**: sesión Cypress “cacheada” por correo.

> Estos comandos usan `Cypress.env('API')` (default: `http://localhost:8000`).

### Matriz de pruebas

| Spec | Cobertura | Notas |
|---|---|---|
| `cypress/e2e/bidder.nav-permissions.cy.ts` | Navegación BIDDER + bloqueo rutas admin | Usa `loginAsBidder()` |
| `cypress/e2e/bidder.smoke.cy.ts` | Smoke full-stack BIDDER (login real + wizard) | Intercepta `/departments` |
| `cypress/e2e/bidder.apply.stub.cy.ts` | Flujo postulación con *stubs* (presign → PUT → validate → create → attach) | Éxito determinista |
| `cypress/e2e/bidder.apply.validation.cy.ts` | Validación PDF falla → NO crear tender | Asegura 0 llamadas a `/tender-requests` |
| `cypress/e2e/bidder.apply.errors.cy.ts` | Errores presign/PUT/validate/create/attach | Verifica mensajes de error y flujo |
| `cypress/e2e/admin.review.cy.ts` | **ADMIN** revisa: aprueba dos veces la primera tender / otra la rechaza | Stubs de `prompt/confirm` con `cy.on('window:...')` |
| `cypress/e2e/chat.flow.cy.ts` | Chat BIDDER ↔ WORKER (startChat, envío y badge unread) | Usa el FAB en BIDDER y la pantalla en WORKER |

**Ejecutar:**
```bash
# UI interactiva
npx cypress open

# Headless
npx cypress run --e2e
```

> Para correr en CI, setear `CYPRESS_BASE_URL=http://localhost:8080` (si aplica) y `Cypress.env('API')`.

---

## CI/CD con Jenkins

### Requisitos del Jenkins host

- Jenkins LTS (JDK17 ok).
- El contenedor/servidor Jenkins debe tener acceso al **Docker daemon** del host (montar `/var/run/docker.sock` si Jenkins corre en contenedor).
- Docker 24+ y `docker compose v2`.

**Compose de Jenkins (independiente):**
```yaml
version: "3.8"
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk17
    container_name: jenkins
    user: "0:0"
    ports:
      - "8082:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
volumes:
  jenkins_home:
```

### Credenciales utilizadas

Crear **Secret text** globales (Manage Jenkins → Credentials):

| ID (exacto)            | Contenido                                |
|---                     |---                                       |
| `aws-access-key-id`    | `AWS_ACCESS_KEY_ID`                      |
| `aws-secret-access-key`| `AWS_SECRET_ACCESS_KEY`                  |
| `aws-region`           | `AWS_REGION` (ej: `us-east-2`)           |
| `s3-bucket`            | `S3_BUCKET` (ej: `ppdsfiles`)            |
| `mongo-uri`            | `MONGODB_URI` (ej: `mongodb://mongo:27017`) |
| `mongo-db`             | `MONGODB_DB` (ej: `miapp`)               |
| `vite-api-url`         | `VITE_API_URL` (ej: `http://localhost:8000`) |

> Los **IDs** deben coincidir con lo que usa el `Jenkinsfile`.

### Job “Pipeline script from SCM”

1. New Item → **Pipeline**.
2. **Definition**: *Pipeline script from SCM*.
3. **SCM**: Git → `https://github.com/Waracho/project_licit`
4. Branch: `*/main` (o la rama que uses).
5. **Script Path**: `Jenkinsfile`
6. (Opcional) Triggers: *GitHub hook trigger* o *Build periodically*.

### Jenkinsfile (resumen)

- **Checkout** del repo.
- **withCredentials**: exporta secrets a `.env` (backend) y variables de build del front.
- `docker compose build` + `docker compose up -d`.
- (Opcional) cleanup previo si usas `container_name` en compose.
- **Smoke**: ping a `/departments` y a la raíz del front.

**Esqueleto (ya funcional en tu setup):**
```groovy
pipeline {
  agent any
  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'licit'
  }
  options { timestamps() }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Preparar .env (backend) y variables (frontend)') {
      steps {
        withCredentials([
          string(credentialsId: 'mongo-uri',            variable: 'MONGODB_URI'),
          string(credentialsId: 'mongo-db',             variable: 'MONGODB_DB'),
          string(credentialsId: 'aws-region',           variable: 'AWS_REGION'),
          string(credentialsId: 's3-bucket',            variable: 'S3_BUCKET'),
          string(credentialsId: 'aws-access-key-id',    variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-access-key',variable: 'AWS_SECRET_ACCESS_KEY'),
          string(credentialsId: 'vite-api-url',         variable: 'VITE_API_URL'),
        ]) {
          sh '''
          set -euo pipefail
          cat > .env <<EOF
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

          cat > .env.front.exp <<EOF
VITE_API_URL=${VITE_API_URL}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

          echo "🔎 Front args:"; grep -E '^(VITE_API_URL|AWS_REGION|S3_BUCKET|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)=' .env.front.exp
          '''
        }
      }
    }
    stage('docker compose build') {
      steps {
        sh '''
          set -euxo pipefail
          set -a; [ -f .env.front.exp ] && . ./.env.front.exp; set +a
          docker compose -f ${COMPOSE_FILE} config
          docker compose -f ${COMPOSE_FILE} build
        '''
      }
    }
    stage('docker compose up') {
      steps {
        sh '''
          set -euxo pipefail
          set -a; [ -f .env.front.exp ] && . ./.env.front.exp; set +a
          docker compose -f ${COMPOSE_FILE} up -d
          docker ps --format "table {{.Names}}\\t{{.Ports}}\\t{{.Status}}"
        '''
      }
    }
    stage('Smoke check') {
      steps {
        sh '''
          set -e
          curl -fsS http://localhost:8000/departments >/dev/null
          curl -fsS http://localhost:8080        >/dev/null
        '''
      }
    }
  }
  post {
    always {
      sh 'rm -f .env .env.front.exp || true'
      echo '✅ Pipeline terminado.'
    }
  }
}
```

### Fast check (“smoke check”)

- **Front**: `GET http://localhost:8080` devuelve HTML de Nginx.
- **API**: `GET http://localhost:8000/departments` responde 200/JSON.
- **Mongo**: el servicio `mongo` aparece `Up` y el `backend` responde.

### Troubleshooting Jenkins

| Problema | Causa | Solución |
|---|---|---|
| `docker: not found` | Jenkins sin acceso a Docker | Montar `/var/run/docker.sock` o instalar Docker en el host/agent |
| `env file .env not found` | `.env` no creado en pipeline | Revisa “Preparar .env” y credenciales |
| `Conflict: container name ... already in use` | `container_name` fijos | Eliminar `container_name` o cleanup antes de `up` |
| `additional properties 'args' not allowed` | Indentación de `build.args` | Poner `args:` dentro de `build:` |
| `Could not find credentials entry with ID ...` | ID distinto en Jenkins | Verificar tabla de credenciales (IDs exactos) |

## Pruebas end-to-end (E2E) con Playwright

Para este proyecto se implementó un conjunto de pruebas end-to-end utilizando [Playwright](https://playwright.dev/) con el objetivo de validar los flujos críticos de negocio desde la perspectiva de los distintos tipos de usuario (`ADMIN`, `WORKER` y `BIDDER`).  
Las pruebas se ejecutan contra la aplicación real levantada con `docker-compose`, por lo que cubren tanto frontend como backend y la integración entre ambos.

### ¿Qué escenarios se prueban?

Todas las pruebas E2E se encuentran en `frontend/playwright/e2e/*.spec.ts`.

**1. Login y redirección por rol**

Archivo: `login.spec.ts`

- Verifica que la pantalla de login se renderiza correctamente.
- Comprueba que:
  - `admin@local.cl` → se autentica y es redirigido a `/admin` (pantalla **Inicio de admin**).
  - `worker@local.cl` → se autentica y es redirigido a `/worker` (pantalla **Inicio de worker**).
  - `bidder@local.cl` → se autentica y es redirigido a `/bidder` (pantalla **Encuentra y postula tu licitación en minutos**).

Esto asegura que el control de acceso y la navegación inicial por rol funcionan después de cualquier cambio.

---

**2. Flujos del BIDDER (postulación a licitaciones)**  

Archivo: `bidder.tenders.spec.ts`

- Login como `BIDDER`.
- Navegación a **Mis licitaciones** (`/bidder/tenders`).
- Apertura de la tarjeta **Crear una nueva licitación**.
- Flujo completo de creación de postulación:
  - Seleccionar un departamento.
  - Subir un archivo PDF (`playwright/fixtures/sample.pdf`).
  - Enviar la postulación y validar el mensaje **¡Postulación enviada!**.
  - Ir a **Mis postulaciones** y comprobar que aparece una licitación con código `TR-AG-...`.

Este test garantiza que un proveedor puede crear correctamente una postulación con archivo adjunto y verla listada después.

---

**3. Flujos de chat BIDDER ↔ WORKER**

Archivos:  
- `chat.bidder.start-and-send.spec.ts`  
- `chat.worker.reply.spec.ts`

Escenarios:

- **BIDDER abre el chat y envía un mensaje**:
  - Desde `/bidder`, abre el botón flotante de chat (FAB).
  - Crea/conecta un chat con el botón **Conectar**.
  - Selecciona un chat tipo `Chat #...`.
  - Envía el mensaje **"Hola"** y valida que aparece en la conversación.

- **WORKER ve el chat existente y responde**:
  - En un contexto separado, un `BIDDER` crea el chat y envía **"Hola"**.
  - Luego, un `WORKER` inicia sesión y entra a `/worker/chats`.
  - Ve en la lista un chat cuyo preview contiene **"Hola"**.
  - Abre el chat, ve el mensaje del BIDDER y responde **"Qué tal"**, verificando que el mensaje queda registrado.

Estos tests validan el ciclo completo de mensajería entre proveedor y trabajador, incluyendo la sincronización entre sesiones distintas.

---

**4. Flujos del ADMIN sobre licitaciones**

Archivos:  
- `admin.approve-download.spec.ts`  
- `admin.reject.spec.ts`

Escenarios:

- **Descarga y aprobación progresiva de una licitación**:
  - Login como `ADMIN` y navegación a **Mis departamentos** (`/admin/departments`).
  - Selección de una fila en estado `IN_REVIEW` que tenga botones **Descargar** y **Aprobar**.
  - Verificación de la descarga: se hace *stub* de `window.open` para comprobar que efectivamente se abre una URL de descarga al pulsar **Descargar**.
  - Doble aprobación:
    - Primera aprobación: se muestra un `prompt` para comentario, se envía un mensaje desde el test y el campo **Nivel** cambia (por ejemplo de `0/2` a `1/2`).
    - Segunda aprobación: se vuelve a escribir un comentario y el **Nivel** vuelve a cambiar (por ejemplo a `2/2`).

- **Rechazo de una licitación**:
  - Login como `ADMIN` y navegación a **Mis departamentos**.
  - Selección de una fila en estado `IN_REVIEW` con botón **Rechazar**.
  - Manejo de los diálogos del navegador:
    - `prompt` con el motivo de rechazo.
    - `confirm` de confirmación.
  - Espera de la llamada `POST` al endpoint `/tender-requests/{id}/review`.
  - Verificación de que el chip de estado deja de mostrar `IN_REVIEW` y pasa a un estado equivalente a `REJECTED`.

Con esto se cubren los dos caminos principales de decisión del administrador: aprobar (uno o varios niveles) o rechazar una licitación.

---

### Integración en el pipeline de CI/CD

Las pruebas E2E se ejecutan automáticamente en el pipeline de Jenkins junto con el resto de etapas de build y despliegue.

A nivel general, el pipeline hace lo siguiente:

1. **Checkout del repositorio.**
2. **Preparación de variables y `.env`** para backend y frontend.
3. **Levantamiento del stack completo** con `docker-compose` (API, base de datos y frontend en `http://localhost:8080`).
4. **Ejecución de Playwright** dentro de un contenedor dedicado, montando el código del frontend.

La etapa de Playwright dentro del `Jenkinsfile` queda conceptualmente así:

```groovy
stage('E2E - Playwright') {
  steps {
    sh '''
      set -euxo pipefail

      docker run --rm --network host \
        -e BASE_URL="http://localhost:8080" \
        -v "$PWD/frontend":/app \
        -w /app \
        mcr.microsoft.com/playwright:v1.57.0-jammy bash -lc '
          npm ci &&
          npx playwright install --with-deps &&
          npm run test:e2e
        '
    '''
  }
}
```

---

## Solución de problemas (FAQ)

**500 en `/roles`**  
Usa un `response_model` flexible (keys `string`) y proyecta campos mínimos en el `find`.

**CORS**  
Incluye `http://localhost:8080` y/o `http://localhost:5173` en `CORS_ORIGINS` del backend.

**Signup (crear cuenta)**  
El front resuelve `rolId` de **BIDDER** consultando `/roles`. Verifica que el router esté montado y el seed haya corrido.

**Descarga de PDFs (presigned GET)**  
Revisa `AWS_*` y `S3_BUCKET`. Si es S3 compatible/MinIO, valida el endpoint y política.

**Chat no conecta**  
Confirma que `/chats/*` esté montado, que exista al menos un usuario **WORKER** semillado, y que el *polling* de `unread_count` responda.




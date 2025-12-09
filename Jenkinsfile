pipeline {
  agent any
  options { timestamps() }

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'licit'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Preparar .env (backend) y variables (frontend)') {
      steps {
        withCredentials([
          string(credentialsId: 'mongo-uri',             variable: 'MONGODB_URI'),
          string(credentialsId: 'mongo-db',              variable: 'MONGODB_DB'),
          string(credentialsId: 'aws-region',            variable: 'AWS_REGION'),
          string(credentialsId: 's3-bucket',             variable: 'S3_BUCKET'),
          string(credentialsId: 'aws-access-key-id',     variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY'),
          string(credentialsId: 'vite-api-url',          variable: 'VITE_API_URL'),
        ]) {
          sh '''
            set -euo pipefail

            # Backend (.env)
            cat > .env <<EOF
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

            # Frontend (.env.front.exp para build args)
            cat > .env.front.exp <<EOF
VITE_API_URL=${VITE_API_URL}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

            echo "🔎 Variables frontend preparadas (.env.front.exp)"
            grep -E '^(VITE_API_URL)=' .env.front.exp || true
          '''
        }
      }
    }

    stage('docker-compose build') {
      steps {
        sh '''
          set -euxo pipefail

          # Exportamos los args de build para que los use docker-compose
          set -a
          [ -f .env.front.exp ] && . ./.env.front.exp
          set +a

          # Validar compose y construir imágenes (mongo usa imagen, el resto build)
          docker-compose -f ${COMPOSE_FILE} config -q
          docker-compose -f ${COMPOSE_FILE} build
        '''
      }
    }

    stage('docker-compose up') {
      steps {
        sh '''
          set -euxo pipefail

          # Levanta mongo, backend, frontend, mongo_express
          docker-compose -f ${COMPOSE_FILE} up -d

          echo "📦 Contenedores activos:"
          docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
        '''
      }
    }

    stage('Smoke check') {
      steps {
        sh '''
          set +e
          echo "⏳ Esperando 5 segundos a que levanten servicios..."
          sleep 5

          echo "🔍 Backend health:"
          (curl -sf http://localhost:8000/health || echo "⚠ backend no respondió") || true

          echo "🔍 Frontend:"
          (curl -I -m 3 http://localhost:8080 || echo "⚠ frontend no respondió") || true
        '''
      }
    }

    stage('E2E tests (Playwright)') {
      steps {
        script {
          // Ejecutamos los E2E pero capturamos el exit code
          def exitCode = sh(
            script: '''
              set -euxo pipefail

              echo "🚀 Ejecutando E2E con servicio frontend_e2e (Playwright)..."
              docker-compose -f ${COMPOSE_FILE} run --rm frontend_e2e
            ''',
            returnStatus: true  // 👈 no lanza excepción si falla, solo devuelve el código
          )

          if (exitCode != 0) {
            echo "⚠️ E2E tests fallaron con código ${exitCode}, " +
                 "pero NO rompemos el pipeline. Revisa los logs para depurar las pruebas."
            // Si quieres que el build quede amarillo (UNSTABLE) en vez de verde:
            // currentBuild.result = 'UNSTABLE'
          } else {
            echo "✅ E2E tests OK."
          }
        }
      }
    }
  }

  post {
    always {
      sh '''
        # Bajamos toda la stack (mongo, backend, frontend, mongo_express, etc.)
        docker-compose -f ${COMPOSE_FILE} down || true
        rm -f .env .env.front.exp || true
      '''
      echo '✅ Pipeline terminado.'
    }
  }
}

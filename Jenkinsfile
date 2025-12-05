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

            # Backend
            cat > .env <<EOF
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

            # Frontend (exp)
            cat > .env.front.exp <<EOF
VITE_API_URL=${VITE_API_URL}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

            echo "🔎 Front args:"
            grep -E '^(VITE_API_URL|AWS_REGION|S3_BUCKET|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)=' .env.front.exp || true
          '''
        }
      }
    }

    stage('docker compose build') {
      steps {
        sh '''
          set -euxo pipefail
          set -a; [ -f .env.front.exp ] && . ./.env.front.exp; set +a

          docker compose -f ${COMPOSE_FILE} config 1>/dev/null
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
          docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
        '''
      }
    }

    stage('Smoke check') {
      steps {
        sh '''
          set +e
          sleep 5

          echo "🔍 Backend health:"
          (curl -sf http://localhost:8000/health || echo "⚠ backend no respondió") || true

          echo "🔍 Frontend:"
          (curl -I -m 3 http://localhost:8080 || echo "⚠ frontend no respondió") || true
        '''
      }
    }

    // 📦 NUEVO: stage para pruebas E2E con Selenium
    stage('E2E tests (Selenium)') {
      steps {
        // Ajusta el directorio si tus tests están en otro lado (por ejemplo backend/)
        dir('frontend') {
          sh '''
            set -euxo pipefail

            # Instalar dependencias del proyecto donde viven los tests Selenium
            # (si usas Java/Maven, cambia esto por "mvn test", etc.)
            npm ci

            # Ejecutar el conjunto de pruebas de Selenium
            # Asegúrate de tener un script tipo "test:selenium" en package.json
            npm run test:selenium
          '''
        }
      }
    }
  }

  post {
    always {
      // Bajar el stack de docker y limpiar archivos temporales
      sh '''
        docker compose -f ${COMPOSE_FILE} down || true
        rm -f .env .env.front.exp || true
      '''
      echo '✅ Pipeline terminado.'
    }
  }
}

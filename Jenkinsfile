pipeline {
  agent any
  options { timestamps() }
  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    COMPOSE_PROJECT_NAME = 'licit'
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Preparar .env (backend) y variables (frontend)') {
      steps {
        withCredentials([
          string(credentialsId: 'mongo-uri',              variable: 'MONGODB_URI'),
          string(credentialsId: 'mongo-db',               variable: 'MONGODB_DB'),
          string(credentialsId: 'aws-region',             variable: 'AWS_REGION'),
          string(credentialsId: 's3-bucket',              variable: 'S3_BUCKET'),
          string(credentialsId: 'aws-access-key-id',      variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-access-key',  variable: 'AWS_SECRET_ACCESS_KEY'),
          string(credentialsId: 'vite-api-url',           variable: 'VITE_API_URL'),
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

            echo "🔎 Front args:"; grep -E '^(VITE_API_URL|AWS_REGION|S3_BUCKET|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)=' .env.front.exp || true
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
          (curl -sf http://localhost:8000/health || echo "⚠ backend no respondió") || true
          (curl -I -m 3 http://localhost:8080       || echo "⚠ frontend no respondió") || true
        '''
      }
    }

    // 🔥 Nuevo stage de E2E
    stage('E2E tests (Playwright)') {
      steps {
        dir('frontend') {
          sh '''
            set -euxo pipefail
            npm ci
            npx playwright install --with-deps
            npx playwright test
          '''
        }
      }
    }
  }

  post {
    success {
      // Slack: OK
      slackSend channel: '#licit-ci', message: "✅ Build + E2E OK: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    }
    failure {
      // Slack: falla
      slackSend channel: '#licit-ci', message: "❌ Pipeline falló: ${env.JOB_NAME} #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Ver detalles>)"
    }
    always {
      // Bajar containers y limpiar archivos
      sh '''
        docker compose -f ${COMPOSE_FILE} down || true
        rm -f .env .env.front.exp || true
      '''
      echo '✅ Pipeline terminado (cleanup hecho).'
    }
  }
}

pipeline {
  agent any
  options { timestamps() }
  environment {
    DOCKER_BUILDKIT = '1'
    COMPOSE_DOCKER_CLI_BUILD = '1'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Preparar .env (backend) y variables (frontend)') {
      steps {
        withCredentials([
          string(credentialsId: 'aws-access-key-id',       variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-access-key',  variable: 'AWS_SECRET_ACCESS_KEY'),
          string(credentialsId: 'aws-region',             variable: 'AWS_REGION'),
          string(credentialsId: 's3-bucket',              variable: 'S3_BUCKET'),
          string(credentialsId: 'mongo-uri',              variable: 'MONGODB_URI'),
          string(credentialsId: 'mongo-db',               variable: 'MONGODB_DB'),
          string(credentialsId: 'vite-api-url',           variable: 'VITE_API_URL')
        ]) {
          sh '''
            set -euo pipefail

            # .env para backend (compose lo usa via env_file)
            cat > .env <<EOF
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF

            # Exportar variables que usará el build del frontend como build args
            export VITE_API_URL=${VITE_API_URL}
            export AWS_REGION=${AWS_REGION}
            export S3_BUCKET=${S3_BUCKET}
            export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
            export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

            # Guardarlas para el próximo step (mismo pod/agent)
            printenv | grep -E '^(VITE_API_URL|AWS_REGION|S3_BUCKET|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)=' > .env.front.exp
          '''
        }
      }
    }

    stage('docker compose build') {
      steps {
        sh '''
          set -euxo pipefail
          set -a
          [ -f .env.front.exp ] && . ./.env.front.exp || true
          set +a

          docker --version
          docker compose version

          docker compose -f docker-compose.yml config
          docker compose -f docker-compose.yml build --pull
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

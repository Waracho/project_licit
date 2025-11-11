pipeline {
  agent any

  options { timestamps() }

  environment {
    // Carpetas, etc. si quieres
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
          string(credentialsId: 'mongodb-uri',  variable: 'MONGODB_URI'),
          string(credentialsId: 'mongodb-db',   variable: 'MONGODB_DB'),
          string(credentialsId: 'aws-region',   variable: 'AWS_REGION'),
          string(credentialsId: 's3-bucket',    variable: 'S3_BUCKET'),
          string(credentialsId: 'aws-access-key-id',     variable: 'AWS_ACCESS_KEY_ID'),
          string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY'),
          string(credentialsId: 'vite-api-url', variable: 'VITE_API_URL')
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

            # Export para los build-args del frontend
            cat > .env.front.exp <<EOF
VITE_API_URL=${VITE_API_URL}
AWS_REGION=${AWS_REGION}
S3_BUCKET=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
EOF
          '''
        }
      }
    }

    stage('docker compose build') {
      steps {
        sh '''
          set -euxo pipefail
          set -a; [ -f .env.front.exp ] && . ./.env.front.exp; set +a

          docker compose version
          docker compose -f docker-compose.yml config
          docker compose -f docker-compose.yml build --pull
        '''
      }
    }

    stage('docker compose up') {
      steps {
        sh '''
          set -euxo pipefail
          set -a; [ -f .env.front.exp ] && . ./.env.front.exp; set +a

          docker compose -f docker-compose.yml up -d --remove-orphans
          docker compose -f docker-compose.yml ps
        '''
        echo 'Front  → http://localhost:8080'
        echo 'API    → http://localhost:8000'
        echo 'MongoE → http://localhost:8081'
      }
    }
  }

  post {
    always {
      sh 'rm -f .env .env.front.exp || true'
      echo '✅ Pipeline terminado.'
    }
    // Si prefieres apagar al final de cada build, descomenta esto:
    // success {
    //   sh 'docker compose -f docker-compose.yml down'
    // }
  }
}

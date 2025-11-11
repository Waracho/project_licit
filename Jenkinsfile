// Jenkinsfile — build de imágenes con tu docker-compose.yml
pipeline {
  agent any

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Docker Compose - Build') {
      steps {
        // Verificación rápida
        sh 'docker --version'
        sh 'docker compose version || docker-compose --version'

        // (Opcional) Mostrar config renderizada
        sh 'docker compose -f docker-compose.yml config'

        // Build de tus servicios (mongo no construye, backend/frontend sí)
        sh 'docker compose -f docker-compose.yml build --pull'
      }
    }
  }

  post {
    always {
      echo '✅ Build finalizado (docker compose build).'
    }
  }
}
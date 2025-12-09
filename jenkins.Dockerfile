FROM jenkins/jenkins:lts-jdk17

USER root

# Instalamos Docker CLI y docker-compose dentro del contenedor Jenkins
RUN apt-get update && \
    apt-get install -y docker.io docker-compose && \
    rm -rf /var/lib/apt/lists/*

USER jenkins

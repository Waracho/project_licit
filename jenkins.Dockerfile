FROM jenkins/jenkins:lts-jdk17

USER root

# Instalar Docker CLI dentro del contenedor Jenkins
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

USER jenkins

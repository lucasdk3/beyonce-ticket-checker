FROM node:22-slim

# Instala bibliotecas necessárias para o Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    xdg-utils \
    xvfb \
    xauth \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir /app

COPY . /app

# Cria diretório de trabalho
WORKDIR /app

# Copia arquivos e instala dependências
RUN npm install -g npm && \
    npm install

ENV PATH /app/node_modules/.bin:$PATH

CMD xvfb-run --auto-servernum --server-args='-screen 0 1024x768x24' npm start
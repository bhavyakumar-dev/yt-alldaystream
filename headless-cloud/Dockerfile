FROM node:20-bullseye-slim

# Install system dependencies, Chromium, FFmpeg, and Xvfb
RUN apt-get update && apt-get install -y \
    ffmpeg \
    xvfb \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon-x11-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV DISPLAY=:99

CMD Xvfb :99 -screen 0 1920x1080x24 -ac & node stream_headless.js

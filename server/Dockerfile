FROM node:18

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    default-jdk \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 8080
CMD ["npm", "run", "start"]
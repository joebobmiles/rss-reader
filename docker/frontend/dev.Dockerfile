FROM node:18-alpine

WORKDIR /app

COPY packages/frontend/package.json ./
RUN npm install

ENTRYPOINT [ "npm", "run", "dev" ]
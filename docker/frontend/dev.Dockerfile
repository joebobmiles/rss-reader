FROM node:18-alpine

WORKDIR /srv/hullabaloo

COPY packages/frontend/package.json ./
RUN npm install

ENTRYPOINT [ "npm", "run", "dev" ]
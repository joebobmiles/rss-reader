FROM node:16-alpine3.13

WORKDIR /srv/hullabaloo

COPY package.json ./
RUN npm install

ENTRYPOINT [ "npm", "run", "dev" ]
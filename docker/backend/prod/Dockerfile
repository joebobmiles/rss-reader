FROM node:16-alpine3.13

ARG PORT=30000
ENV PORT=${PORT}
EXPOSE ${PORT}

WORKDIR /srv/hullabaloo

COPY package.json package-lock.json ./

RUN npm clean-install

COPY ./src ./

ENTRYPOINT [ "node", "index.js" ]
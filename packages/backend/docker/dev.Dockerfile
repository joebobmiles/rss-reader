FROM node:16-alpine3.13

ARG PORT=30000
ENV PORT=${PORT}
EXPOSE ${PORT}

WORKDIR /srv/hullabaloo

ENTRYPOINT [ "npm", "run", "develop" ]
FROM node:18-alpine

ARG PORT=30000
ENV PORT=${PORT}
EXPOSE ${PORT}

WORKDIR /app

ENTRYPOINT [ "npm", "run", "develop" ]
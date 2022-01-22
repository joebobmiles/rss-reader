FROM nginx:1.21.5-alpine

COPY ./nginx.conf /etc/nginx/nginx.conf

WORKDIR /usr/share/nginx/html
COPY ./src/frontend ./
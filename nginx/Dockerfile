FROM nginx:1.27-alpine
RUN apk add --no-cache bash gettext
WORKDIR /etc/nginx/templates
COPY app.conf.template /etc/nginx/templates/app.conf.template
COPY fallback.conf /etc/nginx/templates/fallback.conf
COPY start.sh /start.sh
COPY reload-watch.sh /reload-watch.sh
RUN chmod +x /start.sh /reload-watch.sh
CMD ["/start.sh"]

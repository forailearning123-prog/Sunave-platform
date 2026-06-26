FROM busybox:1.36
WORKDIR /www
COPY apps/api/public/ /www/
EXPOSE 8080
CMD ["httpd", "-f", "-p", "8080", "-h", "/www"]

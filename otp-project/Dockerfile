FROM eclipse-temurin:21-jre
WORKDIR /opt/otp
COPY otp.jar ./otp.jar
RUN ls -lh otp.jar \
 && sha256sum otp.jar \
 && jar tf otp.jar | head -20
RUN set -eux; \
    ls -lh /opt/otp; \
    stat -c '%s bytes' otp.jar; \
    sha256sum otp.jar; \
    file otp.jar || true; \
    head -c 100 otp.jar | od -An -tx1 -v
COPY otp-data ./otp-data
ENV PORT=8080
ENV JAVA_OPTS="-Xmx700m"
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar otp.jar --load --serve --port $PORT otp-data"]

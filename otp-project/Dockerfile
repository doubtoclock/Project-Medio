FROM eclipse-temurin:25-jre AS downloader
WORKDIR /opt/otp
RUN curl -fsSLo otp.jar https://repo1.maven.org/maven2/org/opentripplanner/otp-shaded/2.8.1/otp-shaded-2.8.1.jar

FROM eclipse-temurin:25-jre
WORKDIR /opt/otp
COPY --from=downloader /opt/otp/otp.jar ./otp.jar
COPY otp-data ./otp-data
ENV PORT=8080
ENV JAVA_OPTS="-Xmx4G"
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar otp.jar --load otp-data --serve --port $PORT"]

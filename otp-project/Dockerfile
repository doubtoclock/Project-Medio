FROM eclipse-temurin:21-jre
WORKDIR /opt/otp
COPY otp.jar ./otp.jar
COPY otp-data ./otp-data
ENV PORT=8080
ENV JAVA_OPTS="-Xmx350m"
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar otp.jar --load otp-data --serve --port $PORT"]

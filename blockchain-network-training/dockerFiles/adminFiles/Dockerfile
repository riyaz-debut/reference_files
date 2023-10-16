FROM golang:1.18.2-alpine as development
# Add a work directory
WORKDIR /admin_app

RUN apk update && \
    apk add libressl-dev && \
    apk add gcc && \
    apk add make && \
    apk add curl git pkgconfig 

    
# Cache and install dependencies integra-nock-sdk/go.mod
COPY integra-nock-sdk .
# COPY integra-nock-sdk/go.mod integra-nock-sdk/go.sum ./
RUN go mod download
# Install Reflex for development
# RUN go install github.com/cespare/reflex@latest
# Expose port
EXPOSE 5000
# Start app
# CMD reflex -g '*.go' go run . --start-service
CMD ["go run ."]
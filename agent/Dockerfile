FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/mcips-agent .

FROM alpine:3.20 AS runner
WORKDIR /app
RUN adduser -D -H mcips
COPY --from=build /out/mcips-agent /app/mcips-agent
RUN mkdir -p /app/runtime/artifacts && chown -R mcips:mcips /app
USER mcips
EXPOSE 4100
CMD ["/app/mcips-agent"]

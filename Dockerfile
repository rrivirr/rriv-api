FROM denoland/deno:2.9.6 AS builder

ENV DENO_DIR=/deno-dir

WORKDIR /app

COPY deno.json deno.lock package.json* ./

RUN deno ci --skip-types --prod

COPY . .

RUN deno task prisma generate 

RUN deno compile \
    --output server \
    --preload src/shims.ts \
    --no-check --bundle --minify --allow-net --allow-env --allow-read --allow-sys --allow-ffi \
    src/server.ts

FROM gcr.io/distroless/cc-debian13:nonroot

COPY --from=builder --chown=nonroot /app/server ./server

ENTRYPOINT ["./server"]

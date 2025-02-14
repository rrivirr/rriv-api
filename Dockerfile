FROM denoland/deno

EXPOSE 8000

WORKDIR /app

ADD . /app

RUN deno install --entrypoint src/server.ts

RUN deno task postinstall

RUN deno task prisma migrate deploy

RUN deno task start

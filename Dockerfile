FROM denoland/deno

EXPOSE 3006

WORKDIR /app

COPY . /app

RUN apt-get update -y && apt-get install -y openssl && apt-get install -y ca-certificates

RUN deno task prisma generate 

RUN deno install --entrypoint src/server.ts

CMD "deno", "task", "start"]

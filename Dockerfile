FROM denoland/deno

EXPOSE 3006

WORKDIR /app

COPY . /app

COPY ./ca-certificate.crt /app/ca-certificate.crt

RUN apt-get update -y && apt-get install -y openssl

RUN deno task prisma generate 

RUN deno install --entrypoint src/server.ts

CMD "deno", "task", "start"]

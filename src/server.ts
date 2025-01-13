import app from "./app.ts";

const port = Deno.env.get("NODE_PORT") || 3006;

app.listen(port, () => {
  console.log(`running on port ${port}`);
});

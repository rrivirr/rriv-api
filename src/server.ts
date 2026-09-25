import app from "./app.ts";
import config from "./infra/get-config.ts";

const port = config.NODE_PORT || 3006;

app.listen(port, () => {
  console.log(`running on port ${port}`);
});

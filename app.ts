// @deno-types="npm:@types/express@4"
import express, { Request, Response } from "npm:express";
// @ts-types="generated/index.d.ts"
import { PrismaClient } from "generated/index.js";

const app = express();

app.get("/", async (req: Request, res: Response) => {
  return res.json({});
});

export default app;

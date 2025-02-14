// @deno-types="npm:@types/express@5"
import express from "npm:express";
import { SerialNumberDeviceDto } from "../types/device.types.ts";
import { IdDto } from "../types/generic.types.ts";

export const getExpressRouter = () => express.Router();

export const isId = (body: SerialNumberDeviceDto | IdDto): body is IdDto =>
  "id" in body;

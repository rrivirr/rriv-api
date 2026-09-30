// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { assertAdmin } from "../../service/auth.service.ts";
import * as adminService from "../../service/admin.service.ts";
import { grantAdminSchema } from "./schema.ts";
import { idSchema } from "../generic/generic.schema.ts";

export const listAdmins = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  res.json(await adminService.listAdmins());
};

export const grantAdmin = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  const body = grantAdminSchema.parse(req.body);
  const { account, created } = await adminService.grantAdmin({
    email: body.email,
    grantedBy: req.accountId,
  });
  res.status(created ? 201 : 200).json(account);
};

export const revokeAdmin = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  const params = idSchema.parse(req.params);
  await adminService.revokeAdmin({ accountId: params.id });
  res.status(204).json();
};

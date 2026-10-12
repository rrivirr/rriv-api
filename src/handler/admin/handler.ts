// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { assertAdmin } from "../../service/auth.service.ts";
import * as adminService from "../../service/admin.service.ts";
import { grantRoleSchema, revokeRoleParamsSchema } from "./schema.ts";

export const listRoles = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  res.json(await adminService.listRoleHolders());
};

export const grantRole = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  const body = grantRoleSchema.parse(req.body);
  const { account, created } = await adminService.grantRole({
    ...body,
    grantedBy: req.accountId,
  });
  res.status(created ? 201 : 200).json(account);
};

export const revokeRole = async (req: Request, res: Response) => {
  await assertAdmin(req.accountId);
  const params = revokeRoleParamsSchema.parse(req.params);
  await adminService.revokeRole({ accountId: params.id, role: params.role });
  res.status(204).json();
};

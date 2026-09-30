// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { notificationQuerySchema } from "./schema.ts";
import { idSchema } from "../generic/generic.schema.ts";
import * as notificationService from "../../service/notification.service.ts";

export const listNotifications = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const query = notificationQuerySchema.parse(req.query);
  res.json(
    await notificationService.listNotifications(accountId, {
      unreadOnly: query.unread === "true",
      limit: query.limit,
      offset: query.offset,
    }),
  );
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const params = idSchema.parse(req.params);
  await notificationService.markRead(accountId, params.id);
  res.json();
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  await notificationService.markAllRead(accountId);
  res.json();
};

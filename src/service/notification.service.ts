import prisma from "../infra/prisma.ts";

export const createNotification = async (input: {
  accountId: string;
  type: string;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
}) => {
  await prisma.notification.create({
    data: {
      accountId: input.accountId,
      type: input.type,
      title: input.title,
      ...(input.body && { body: input.body }),
      ...(input.resourceType && { resourceType: input.resourceType }),
      ...(input.resourceId && { resourceId: input.resourceId }),
    },
  });
};

export const listNotifications = async (
  accountId: string,
  filters: { unreadOnly: boolean; limit: number; offset: number },
) => {
  const where = {
    accountId,
    ...(filters.unreadOnly && { readAt: null }),
  };

  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.limit,
      skip: filters.offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { accountId, readAt: null } }),
  ]);

  return { items, total, unread };
};

export const markRead = async (accountId: string, id: string) => {
  await prisma.notification.updateMany({
    where: { id, accountId, readAt: null },
    data: { readAt: new Date() },
  });
};

export const markAllRead = async (accountId: string) => {
  await prisma.notification.updateMany({
    where: { accountId, readAt: null },
    data: { readAt: new Date() },
  });
};

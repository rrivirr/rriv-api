import { OpenFgaClient, WriteRequestWritesOnDuplicate } from "npm:@openfga/sdk";
import prisma from "../src/infra/prisma.ts";

(async () => {
  try {
    const openFga = new OpenFgaClient({
      apiUrl: "openfga_url",
      storeId: "store_id",
      authorizationModelId: "model_id",
    });

    const superAdmin = "df8c04eb-49d6-437c-b128-0890903bc74c"; // id of account to make super admin
    const SYSTEM = "system:rriv";

    await openFga.write(
      {
        writes: [
          {
            user: `user:${superAdmin}`,
            relation: "admin",
            object: SYSTEM,
          },
        ],
      },
      {
        conflict: { onDuplicateWrites: WriteRequestWritesOnDuplicate.Ignore },
      },
    );

    const devices = await prisma.device.findMany({
      where: {
        archivedAt: null,
        Bind: { some: { unboundAt: null, archivedAt: null } },
      },
      include: {
        Bind: { select: { accountId: true } },
        DeviceContext: {
          where: {
            endedAt: null,
            archivedAt: null,
            Context: { endedAt: null, archivedAt: null },
          },
          select: { contextId: true },
        },
      },
    });
    console.log(devices);
    for (const device of devices) {
      const deviceId = device.id;
      const contextId = device.DeviceContext[0].contextId;
      const accountId = device.Bind[0].accountId;

      const r = await openFga.write(
        {
          writes: [
            {
              user: `user:${accountId}`,
              relation: "owner",
              object: `device:${deviceId}`,
            },
            {
              user: `user:${accountId}`,
              relation: "owner",
              object: `context:${contextId}`,
            },
            {
              user: `context:${contextId}`,
              relation: "context",
              object: `device:${deviceId}`,
            },
            {
              user: SYSTEM,
              relation: "system",
              object: `context:${contextId}`,
            },
            { user: SYSTEM, relation: "system", object: `device:${deviceId}` },
          ],
        },
        {
          conflict: { onDuplicateWrites: WriteRequestWritesOnDuplicate.Ignore },
        },
      );
      console.log("writes:", r);
    }
    const contextIds = devices.map((d) => d.DeviceContext[0].contextId);
    const contexts = await prisma.context.findMany({
      where: { id: { notIn: contextIds }, endedAt: null, archivedAt: null },
      omit: { accountId: false },
    });
    for (const context of contexts) {
      const contextId = context.id;
      const accountId = context.accountId;

      const r = await openFga.write(
        {
          writes: [
            {
              user: SYSTEM,
              relation: "system",
              object: `context:${contextId}`,
            },
            {
              user: `user:${accountId}`,
              relation: "owner",
              object: `context:${contextId}`,
            },
          ],
        },
        {
          conflict: { onDuplicateWrites: WriteRequestWritesOnDuplicate.Ignore },
        },
      );
      console.log("writes:", r);
    }
  } catch (error) {
    console.log(error);
  }
})();

import grpc from "npm:@grpc/grpc-js";
import applicationPb from "@chirpstack/chirpstack-api/api/application_pb.js";
import tenantPb from "@chirpstack/chirpstack-api/api/tenant_pb.js";
import deviceProfilePb from "@chirpstack/chirpstack-api/api/device_profile_pb.js";
import deviceGrpc from "@chirpstack/chirpstack-api/api/device_grpc_pb.js";
import applicationGrpc from "@chirpstack/chirpstack-api/api/application_grpc_pb.js";
import tenantGrpc from "@chirpstack/chirpstack-api/api/tenant_grpc_pb.js";
import deviceProfileGrpc from "@chirpstack/chirpstack-api/api/device_profile_grpc_pb.js";
import { HttpException } from "../utils/http-exception.ts";

export const getChirpstackConnection = () => {
  const server = Deno.env.get("CHIRPSTACK_API_URL")!;
  const apiToken = Deno.env.get("CHIRPSTACK_API_KEY")!;
  const credentials = grpc.credentials.createSsl();

  const deviceService = new deviceGrpc.DeviceServiceClient(
    server,
    credentials,
  );

  const applicationService = new applicationGrpc.ApplicationServiceClient(
    server,
    credentials,
  );

  const deviceProfileService = new deviceProfileGrpc
    .DeviceProfileServiceClient(
    server,
    credentials,
  );

  const tenantService = new tenantGrpc.TenantServiceClient(server, credentials);

  const metadata = new grpc.Metadata();
  metadata.set("authorization", "Bearer " + apiToken);

  const getTenantId = async () => {
    const listTenantRequest = new tenantPb.ListTenantsRequest();
    listTenantRequest.setLimit(1);

    const listTenant = () =>
      new Promise<tenantPb.TenantListItem.AsObject[] | undefined>(
        (resolve, reject) => {
          tenantService.list(listTenantRequest, metadata, (err, resp) => {
            if (err) {
              reject(err);
            }

            resolve(resp?.toObject().resultList);
          });
        },
      );

    const tenants = await listTenant();

    if (!tenants || !tenants.length) {
      throw new HttpException(500, "no chirpstack tenants found");
    }

    return tenants[0].id;
  };

  const getApplications = async () => {
    const tenantId = await getTenantId();
    const listApplicationsRequest = new applicationPb.ListApplicationsRequest();
    listApplicationsRequest.setLimit(12); // pagination not needed for now
    listApplicationsRequest.setTenantId(tenantId);

    const listApplications = () =>
      new Promise<applicationPb.ApplicationListItem.AsObject[] | undefined>(
        (resolve, reject) => {
          applicationService.list(
            listApplicationsRequest,
            metadata,
            (err, resp) => {
              if (err) {
                reject(err);
              }

              resolve(resp?.toObject().resultList);
            },
          );
        },
      );

    const applications = await listApplications();
    if (!applications || !applications.length) {
      throw new HttpException(500, "no chirpstack applications found");
    }
    return applications;
  };

  const getDeviceProfile = async () => {
    const tenantId = await getTenantId();
    const listDeviceProfileRequest = new deviceProfilePb
      .ListDeviceProfilesRequest();
    listDeviceProfileRequest.setLimit(1);
    listDeviceProfileRequest.setTenantId(tenantId);
    listDeviceProfileRequest.setSearch("rriv");

    const listDeviceProfiles = () =>
      new Promise<deviceProfilePb.DeviceProfileListItem.AsObject[] | undefined>(
        (resolve, reject) => {
          deviceProfileService.list(
            listDeviceProfileRequest,
            metadata,
            (err, resp) => {
              if (err) {
                reject(err);
              }

              resolve(resp?.toObject().resultList);
            },
          );
        },
      );

    const deviceProfiles = await listDeviceProfiles();
    if (!deviceProfiles || !deviceProfiles.length) {
      throw new HttpException(500, "no chirpstack applications found");
    }
    return deviceProfiles[0];
  };

  const closeConnection = () => {
    deviceService.close();
    applicationService.close();
    deviceProfileService.close();
    tenantService.close();
  };

  return {
    metadata,
    deviceService,
    applicationService,
    deviceProfileService,
    getDeviceProfile,
    getApplications,
    closeConnection,
  };
};

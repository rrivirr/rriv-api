import ContextRouter from "./context.router.ts";
import DeviceRouter from "./device.router.ts";
import DeviceContextRouter from "./device-context.router.ts";
import SensorRouter from "./sensor.router.ts";
import DataloggerRouter from "./datalogger.router.ts";
import ConfigSnapshotRouter from "./config-snapshot.router.ts";

export default [
  ContextRouter,
  DeviceRouter,
  DeviceContextRouter,
  SensorRouter,
  DataloggerRouter,
  ConfigSnapshotRouter,
];

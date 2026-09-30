export const ACTIVE_CONFIG_SNAPSHOT_NAME = "active";

/**
 *   device_active — the lazily-created "active" snapshot of a device context
 *   saved         — a user-named archive (PUT/POST /configSnapshot/save)
 *   library       — a snapshot backing a system library config version
 */
export const CONFIG_SNAPSHOT_KIND = {
  DEVICE_ACTIVE: "device_active",
  SAVED: "saved",
  LIBRARY: "library",
} as const;

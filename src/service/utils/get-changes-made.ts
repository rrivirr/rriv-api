// deno-lint-ignore-file no-explicit-any
export const getConfigChangesMade = (
  body: { previousConfig: any; currentConfig: any },
) => {
  const { previousConfig, currentConfig } = body;

  const changeMade: { [key: string]: any } = {};

  const previousConfigKeys = Object.keys(previousConfig);
  const currentConfigKeys = Object.keys(currentConfig);

  for (const previousConfigKey of previousConfigKeys) {
    const previousConfigValue = previousConfig[previousConfigKey];
    const currentConfigValue = currentConfig[previousConfigKey];

    if (currentConfigValue === undefined) {
      changeMade[previousConfigKey] = "removed";
    } else {
      changeMade[previousConfigKey] =
        `from ${previousConfigValue} to ${currentConfigValue}`;
    }
  }

  for (const currentConfigKey of currentConfigKeys) {
    const previousConfigValue = previousConfig[currentConfigKey];
    const currentConfigValue = currentConfig[currentConfigKey];

    if (previousConfigValue === undefined) {
      changeMade[currentConfigKey] = `added and set to ${currentConfigValue}`;
    }
  }

  return changeMade;
};

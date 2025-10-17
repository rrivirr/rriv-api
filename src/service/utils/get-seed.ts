export const getSeed = (serialNumber: string) => {
  let hash = 1779033703 ^ serialNumber.length;
  for (let i = 0; i < serialNumber.length; i++) {
    hash = Math.imul(hash ^ serialNumber.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  const seed = (hash ^= hash >>> 16) >>> 0;
  return seed;
};

export function setNestedMap(
  map: Map<any, any>,
  keys: any[],
  value: any
): Map<any, any> {
  let currentMap = map;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!currentMap.has(keys[i])) {
      currentMap.set(keys[i], new Map());
    }
    currentMap = currentMap.get(keys[i]);
  }
  currentMap.set(keys[keys.length - 1], value);
  return currentMap;
}

import { setNestedMap } from "../src/utils/map";

describe("Test map", () => {
  it("Test set nested map", () => {
    let map = new Map<string, Map<string, Map<string, number>>>();
    setNestedMap(map, ["a", "b", "c"], 1);
    expect(map.get("a").get("b").get("c")).toBe(1);
  });

  it("Test override and delete item in nested map", () => {
    let map = new Map<string, Map<string, Map<string, number>>>();
    setNestedMap(map, ["a", "b", "c"], 1);
    setNestedMap(map, ["a", "b", "d"], 1);
    expect(map.get("a").get("b").get("c")).toBe(1);

    // override
    setNestedMap(map, ["a", "b", "c"], 2);
    expect(map.get("a").get("b").get("c")).toBe(2);

    // delete d item
    let currentMap = map.get("a");
    let nextCurrentMap = currentMap.get("b");
    nextCurrentMap.delete("d");
    expect(map.get("a").get("b").get("d")).toBe(undefined);
  });
});

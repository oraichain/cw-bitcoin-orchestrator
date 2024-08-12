import { setNestedMap } from "../src/utils/map";

describe("Test map", () => {
  it("Test setNestedMap", () => {
    let map = new Map<string, Map<string, Map<string, number>>>();
    setNestedMap(map, ["a", "b", "c"], 1);
    expect(map.get("a").get("b").get("c")).toBe(1);
  });
});

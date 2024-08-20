import { commitmentBytes } from "@oraichain/bitcoin-bridge-wasm-sdk";
import { convertSdkDestToWasmDest } from "../src/utils/dest";

describe("Test dest", () => {
  it("Test dest commitment bytes", () => {
    const encodedDest = commitmentBytes(
      convertSdkDestToWasmDest({
        ibc: {
          memo: "",
          receiver: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
          sender: "orai1rchnkdpsxzhquu63y6r4j4t57pnc9w8ehdhedx",
          source_channel: "channel-0",
          source_port: "transfer",
          timeout_timestamp: 1724004281050000000,
        },
      })
    );
    expect(Buffer.from(encodedDest).toString("hex")).toBe(
      "ba916e67c2fcabc218b17fb29cec87c3dda02f860eb9abd1d7a1fd6173bd6a40"
    );

    let encodedAddress = commitmentBytes(
      convertSdkDestToWasmDest({
        address: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
      })
    );
    expect(Buffer.from(encodedAddress).toString("hex")).toBe(
      "6f7261693165686d6871636e38657266336467617672636136397a6770347274786a356b716774636e7964"
    );
  });
});

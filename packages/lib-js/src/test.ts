import { generateDepositAddress } from ".";

const main = async () => {
  const result = await generateDepositAddress({
    dest: {
      address: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
    },
    relayers: ["http://127.0.0.1:8000"],
    network: "testnet",
  });
  console.log(result);
};

main();

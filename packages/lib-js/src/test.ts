import { generateDepositAddress } from ".";

const main = async () => {
  const result = await generateDepositAddress({
    dest: {
      address: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
    },
    relayers: ["http://64.226.94.132:8000"],
    network: "bitcoin",
  });
  console.log(result);
};

main();

import { generateDepositAddress } from ".";

const main = async () => {
  const result = await generateDepositAddress({
    dest: {
      address: "orai1yzmjgpr08u7d9n9qqhvux9ckfgq32z77c04lkg",
    },
    relayers: ["http://127.0.0.1:8000"],
    network: "bitcoin",
  });
  console.log(result);
};

main();

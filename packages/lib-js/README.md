<div align="center">
  
  <h1><code>bitcoin-bridge-lib-js</code></h1>

<strong>A JavaScript library for accepting Bitcoin deposits with Interchain Deposits to any <a
  href="https://www.ibcprotocol.dev">IBC-enabled blockchain,</a> powered by <a
  href="https://orai.io">Oraichain</a>.</strong>

</div>

## Installation

```
npm install @oraichain/bitcoin-bridge-lib-js
```

## Oraichain Deposits

```typescript
import { generateDepositAddress } from "nomic-bitcoin";

let depositInfo = await generateDepositAddress({
  relayers: ["https://relayer.nomic-testnet.mappum.io:8443"],
  dest: {
    address: <orai-address>
  }
});

console.log(depositInfo);
/*
{
  code: 0,
  bitcoinAddress: "tb1q7cdyvlhtjtgyw8nal7gfprftlrxdz8qj0ld2fy2lc26q5yaxtm9sun4n24",
}
*/
```

## Interchain Deposits

```typescript
import { generateDepositAddress } from "nomic-bitcoin";

let depositInfo = await generateDepositAddress({
  relayers: ["https://relayer.nomic-testnet.mappum.io:8443"],
  dest: {
    ibc: {
      memo: "",
      receiver: "orai1ehmhqcn8erf3dgavrca69zgp4rtxj5kqgtcnyd",
      sender: "orai1rchnkdpsxzhquu63y6r4j4t57pnc9w8ehdhedx",
      source_channel: "channel-6", // Oraichain should have the src-channel to the destination chain
      source_port: "transfer",
      timeout_timestamp: 1725059744308000000,
    },
  },
});

console.log(depositInfo);
/*
{
  code: 0,
  bitcoinAddress: "tb1q7cdyvlhtjtgyw8nal7gfprftlrxdz8qj0ld2fy2lc26q5yaxtm9sun4n24",
}
*/
```

### Capacity limit

The bridge currently has a capacity limit, which is the maximum amount of BTC that can be held in the bridge at any given time. When the capacity limit is reached, relayers will reject newly-broadcasted deposit addresses.

If the bridge is over capacity, the response code in `depositInfo` will be `2`.

```typescript
let depositInfo = await generateDepositAddress(opts);
if (depositInfo.code === 2) {
  console.error(`Capacity limit reached`);
}
```

Partner chains should communicate clearly to the user that a deposit address could not be safely generated because the bridge is currently over capacity.

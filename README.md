# Oraichain Bitcoin Bridge SDK

```bash
# build code:
cwtools build ../bitcoin-bridge-cw/contracts/cw-bitcoin -o packages/contracts-build/data
# build schema
cwtools build ../bitcoin-bridge-cw/contracts/cw-bitcoin -s
# gen code:
cwtools gents ../bitcoin-bridge-cw/contracts/cw-bitcoin -o packages/contracts-sdk/src
# gen doc:
yarn docs

# patch a package:
yarn patch-package @cosmjs/cosmwasm-stargate
```

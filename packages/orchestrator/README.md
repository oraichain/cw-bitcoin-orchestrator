## Node setup guide

This guide will walk you through setting up a validator bitcoin ibc node for the **Bitcoin Bridge IBC**.

If you need any help getting your node running, please pull requests for asking.

### Requirements

- &gt;= 4GB RAM
- &gt;= 100GB of storage
- Linux or macOS _(Windows support coming soon)_

### 1. Install Bitcoin Bridge Orchestrator Binary

Here, we use node v18.18.0. If you don't have node, please do these step:

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
nvm install v18.18.0
nvm use v18.18.0
```

Install orchestrator:

```
npm install -g @oraichain/bitcoin-bridge-orchestrator
```

### 2. Set up your env

```
# you can check the description of each fields on packages/orchestrator/.env.example
PORT=8000
NODE_ENV=development # development, production, push this development if you want to trigger blocks (not needed)
ENCRYPTED_MNEMONIC= # if you want to use encrypted mnemonic, please fill this field
MNEMONIC= # if you want to use mnemonic, please fill this field, mnemonic will have priority over encrypted mnemonic
BTC_RPC_HOST=http://127.0.0.1
BTC_RPC_PORT=8332
BTC_RPC_USERNAME=satoshi
BTC_RPC_PASSWORD=nakamoto
BTC_NETWORK=mainnet ## testnet or mainnet
COSMOS_RPC_URL=http://127.0.0.1:26657
LIGHT_CLIENT_BITCOIN_ADDRESS=orai1rdykz2uuepxhkarar8ql5ajj5j37pq8h8d4zarvgx2s8pg0af37qucldna
APP_BITCOIN_ADDRESS=orai12sxqkgsystjgd9faa48ghv3zmkfqc6qu05uy20mvv730vlzkpvls5zqxuz
STORAGE_DIR_NAME=.oraibtc-relayer
DUCKDB_DIR_NAME=watched_scripts.duckdb

## Default deposit configure
DEPOSIT_BUFFER=43200

## Default signer configure
MAX_WITHDRAWAL_RATE=0.1
SIGSET_CHANGE_RATE=0.1
MIN_BLOCKS_PER_CHECKPOINT=0
LEGITIMATE_CHECKPOINT_INTERVAL=86400
```

### 3. Request to be validator

Please send us your validator's information to be added on whitelist validators.

### 4. Run signer server

Running this will enhance the security of Bitcoin Bridge. The more validators are running the signer server, the more security the system has.

Check whether you are eligible validator:

```
bitcoin-bridge-orchestrator check --env $ENV_PATH
```

Register validator on smart contract if you are eligible native validator:

```
bitcoin-bridge-orchestrator register --env $ENV_PATH
```

Run your signer node:

```
bitcoin-bridge-orchestrator signer --env $ENV_PATH
```

### 5. Run relayer server (Optional)

Relayer nodes carry data between the Bitcoin blockchain and the Bitcoin Bridge IBC. Running this will enhance the efficiency, performance of Bitcoin Bridge.

#### i. Sync a Bitcoin node

Download Bitcoin Core: https://bitcoin.org/en/download

Run it with:

```
bitcoind -server -rpcuser=satoshi -rpcpassword=nakamoto
```

(The RPC server only listens on localhost, so the user and password are not critically important.)

**NOTE:** To save on disk space, you may want to configure your Bitcoin node to prune block storage. For instance, add `-prune=5000` to only keep a maximum of 5000 MB of blocks. You may also want to use the `-daemon` option to keep the node running in the background.

#### ii. Run relayer server

```
bitcoin-bridge-orchestrator relayer --env $ENV_PATH
```

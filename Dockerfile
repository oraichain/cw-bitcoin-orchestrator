FROM node:20.15-bullseye

RUN apt-get update && \
  apt-get install -y build-essential libc-dev && \
  apt-get clean

RUN npm install -g node-gyp tsx

WORKDIR /app

COPY package.json yarn.lock lerna.json nx.json tsconfig.json .yarnrc.yml ./

COPY packages/orchestrator/package.json /app/packages/orchestrator/package.json

COPY packages/contracts-build/package.json /app/packages/contracts-build/package.json

COPY packages/contracts-sdk/package.json /app/packages/contracts-sdk/package.json

COPY packages/lib-js/package.json /app/packages/lib-js/package.json

COPY packages/wasm-sdk/package.json /app/packages/wasm-sdk/package.json

COPY patches /app/patches

COPY . .

COPY .yarn ./.yarn

COPY .nx ./.nx

RUN corepack enable

RUN yarn install

RUN yarn postinstall

RUN yarn build

ENTRYPOINT ["tsx", "packages/orchestrator/src/index.ts"]

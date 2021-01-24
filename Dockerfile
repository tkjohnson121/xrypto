FROM node:12

ENV NODE_PATH src
ENV NODE_ENV production

WORKDIR /xrypto

RUN npm install global yarn
RUN yarn global add typescript

COPY package.json .

RUN yarn install

COPY . ./

RUN yarn build


ENTRYPOINT ["node", "dist/index.js"]
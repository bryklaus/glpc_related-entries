FROM node:14

WORKDIR /app

COPY package*.json .

RUN npm install

RUN npm install -g envsub

COPY . .

ARG OJS_BASE_URI
ARG OJS_SECTION_IDS
ARG DEBUG_MODE=false
ARG BLOCK_CLASS_NAME
ARG BLOCK_CLASS_TARGET
ARG BLOCK_TITLE

RUN envsub -d --syntax handlebars ./src/static/js/crossRefBlock.js
RUN envsub -d --syntax handlebars ./src/static/js/relatedEntries.js

CMD ["node", "./src/index.js"]

EXPOSE 3000

FROM node:24 AS build

ARG COMMIT_HASH
ARG BUILD_TIME

RUN mkdir /athena
RUN chown node:node /athena

# Install pnpm
RUN npm install -g pnpm@10.19.0

USER node

# Install dependencies before copying over any other files
COPY --chown=node:node package.json pnpm-workspace.yaml pnpm-lock.yaml /athena
RUN mkdir /athena/backend
COPY --chown=node:node backend/package.json /athena/backend
RUN mkdir /athena/shared
COPY --chown=node:node shared/package.json /athena/shared

WORKDIR /athena
RUN CI=true pnpm install

COPY --chown=node:node . /athena

# Build backend
WORKDIR /athena/backend
RUN pnpm run build

# Only keep prod dependencies
WORKDIR /athena
RUN CI=true pnpm install --prod

# Add version info
RUN echo "${COMMIT_HASH}" > /athena/.commit-hash
RUN echo "${BUILD_TIME}" > /athena/.build-time

# --- Main image ---

FROM node:24-alpine AS main

RUN npm install -g pnpm@10.19.0

USER node
COPY --from=build --chown=node:node /athena /zeppelin

WORKDIR /athena

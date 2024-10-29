# Use the standard Node.js image instead of Alpine
FROM node:22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
# Install libc6-dev for compatibility
RUN apt-get update && apt-get install -y libc6-dev
# Set working directory
WORKDIR /app
RUN pnpm install turbo --global
COPY . .

# Generate a partial monorepo with a pruned lockfile for a target workspace.
# Assuming "web" is the name entered in the project's package.json: { name: "web" }
RUN turbo prune --scope=transcoding --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=transcoding...

FROM base AS runner
WORKDIR /app

# Fix the command to start the application
CMD ["pnpm", "start"]
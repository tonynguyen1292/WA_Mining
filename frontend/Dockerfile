# Build the static production bundle.
#
# Node 24, matching .nvmrc, package.json's engines field, CI, and
# netlify.toml's NODE_VERSION. This image was left on node:20 when
# WMDP2-69 pinned everywhere else to 24, which meant it ran npm 10
# against a lockfile written by npm 11 -- the 2026-07-18 incident,
# still live in the production Docker build.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve it with nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

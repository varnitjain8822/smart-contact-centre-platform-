FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# prod profile: Caddy serves the static build (docker/Caddyfile is mounted by compose)
FROM caddy:2.11-alpine AS static
COPY --from=build /app/dist /srv

# dev profile (default target): vite preview with the /api proxy
FROM build AS preview
EXPOSE 5173
ENV API_URL=http://api:4000
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]

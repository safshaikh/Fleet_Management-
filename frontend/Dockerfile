# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Copy built React files
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: serve index.html for all routes (React Router SPA support)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost/ping || exit 1

CMD ["nginx", "-g", "daemon off;"]

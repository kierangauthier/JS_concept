FROM node:25-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build configs : Vite + TypeScript + Tailwind/PostCSS + shadcn/ui.
# Sans tailwind.config.ts ni postcss.config.js, Tailwind utilise sa config
# par défaut (qui ne scanne rien) et purge TOUTES les classes du bundle final
# → bundle CSS de 2 KB au lieu de ~100 KB. App rendue sans aucun style.
COPY index.html vite.config.ts tsconfig*.json ./
COPY tailwind.config.ts postcss.config.js components.json ./

COPY public ./public/
COPY src ./src/
RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

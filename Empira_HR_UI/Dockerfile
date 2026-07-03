FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://127.0.0.1:8000/
ARG VITE_WS_NOTIFICATIONS_URL=

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_WS_NOTIFICATIONS_URL=${VITE_WS_NOTIFICATIONS_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx vite build

FROM nginx:1.27-alpine AS runtime

ENV PORT=8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null

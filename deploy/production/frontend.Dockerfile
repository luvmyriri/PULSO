FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_RECAPTCHA_SITE_KEY
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL="" VITE_RECAPTCHA_LOCAL_TEST=false \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    NODE_OPTIONS=--max-old-space-size=3072
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/production/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

# Imagen única para web y worker (CL-CRM-03 §1). Se construye en GitHub Actions, no en el VPS.
FROM node:22-alpine AS dependencias
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS compilacion
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS ejecucion
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S crm && adduser -S crm -G crm
COPY --from=compilacion --chown=crm:crm /app/.next/standalone ./
COPY --from=compilacion --chown=crm:crm /app/.next/static ./.next/static
COPY --from=compilacion --chown=crm:crm /app/public ./public
USER crm
EXPOSE 3000
CMD ["node", "server.js"]

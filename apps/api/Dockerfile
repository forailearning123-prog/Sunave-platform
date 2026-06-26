FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/core/package.json ./packages/core/package.json
RUN npm ci
COPY . .
WORKDIR /app/apps/api
EXPOSE 8080
CMD ["npm", "start"]

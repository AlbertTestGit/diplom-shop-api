FROM node:18.16-alpine as build
WORKDIR /srv
COPY . .
RUN npm ci && npm run build && npm ci --omit=dev

FROM node:18.16-alpine
WORKDIR /srv
COPY ./uploads ./uploads
COPY --from=build /srv/node_modules ./node_modules
COPY --from=build /srv/dist ./dist
CMD node dist/main.js

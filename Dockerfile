# Stage 1: build the Angular application
# Uses a Node LTS image to run the Angular CLI build.
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first so Docker can cache the npm install layer
# and skip it on subsequent builds when only source files change.
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source and build for production.
COPY . .
RUN npm run build

# Stage 2: serve the static output with nginx
# The final image contains only the compiled assets and nginx -- no Node,
# no source code, no devDependencies. This keeps the image small and secure.
FROM nginx:1.27-alpine

# Copy the compiled Angular output.
# Angular 21 with @angular/build outputs to dist/<project-name>/browser/.
COPY --from=builder /app/dist/angular-tutorial/browser /usr/share/nginx/html

# Replace the default nginx config with our custom one that handles
# deep-link routing (redirect all paths to index.html) and the /api proxy.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

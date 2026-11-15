# Setup and first run

This guide walks you through every step needed to clone the repository, start the
backend, install the frontend, and open the application in your browser. Follow
each section in order the first time.

---

## Prerequisites

Install these tools before you start:

| Tool | Version | Why |
|---|---|---|
| Node.js | 22 LTS | Required by Angular CLI and npm |
| Angular CLI | 21 | Generates components, services and other files |
| Java | 21 | Required to run the Spring Boot backend |
| Maven | 3.9+ | Builds and starts the Spring Boot backend |
| Git | any recent | Clones repositories |
| Docker Desktop | any recent | Optional: run the app in a container |

Check your versions:

```bash
node -v        # should show v22.x.x
ng version     # should show Angular CLI 21.x.x
java -version  # should show 21.x.x
mvn -v         # should show 3.9.x
```

---

## 1. Start the backend

The Angular app calls one Spring Boot backend:
[`spring-boot-tutorial`](https://github.com/EdgarEldy/spring-boot-tutorial).
It owns all endpoints: authentication, users, roles, permissions, categories, products,
customers and orders, all under `/api/v1`.

```bash
# In a separate terminal, clone and start the backend
git clone https://github.com/EdgarEldy/spring-boot-tutorial.git
cd spring-boot-tutorial
./mvnw spring-boot:run
```

Wait until you see `Started ... in X seconds`. The backend listens on port **8080**.
Verify it is up:

```bash
curl http://localhost:8080/api/v1/categories
# Should return {"success":true,...}
```

> **Email activation:** the backend sends a confirmation email when you register.
> By default it uses the SMTP settings in its `application.yml`. Check the backend's
> README for how to configure a local mail server (e.g. MailHog) so you can click
> activation links without a real email provider.

---

## 2. Clone and install the frontend

```bash
git clone https://github.com/EdgarEldy/angular-tutorial.git
cd angular-tutorial
npm install
```

---

## 3. Start the dev server

```bash
npm start
```

Angular CLI compiles the application and opens the proxy. Open
[http://localhost:4200](http://localhost:4200) in your browser.

The dev proxy (`proxy.conf.json`) forwards every request whose path starts with
`/api/v1` to `http://localhost:8080`. This means the Angular app never talks to the
backend directly by host: it always uses the relative path `/api/v1`, which works
identically in development (proxied by the CLI) and in production (proxied by nginx).

---

## 4. Create your first account

1. Click **Register** on the login page.
2. Fill in your name, email and a password of at least 8 characters.
3. Submit. The backend creates a disabled account and sends you an activation email.
4. Open the activation link (from your mail server or MailHog at `http://localhost:8025`).
5. Your account is now enabled. Go to [http://localhost:4200/login](http://localhost:4200/login)
   and log in.

The first admin account must be created directly in the database or seeded by the backend
(see the backend README). Ordinary registration creates a regular user with no admin role.

---

## 5. NPM scripts

| Script | Command | What it does |
|---|---|---|
| Dev server | `npm start` | Starts `ng serve` with the API proxy |
| Production build | `npm run build` | Compiles into `dist/angular-tutorial/browser/` |
| Tests | `npm test` | Runs the Vitest suite with `ng test` |
| Lint | `npm run lint` | Runs angular-eslint |

---

## 6. How the dev proxy works

`proxy.conf.json` contains one entry:

```json
{
  "/api/v1": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

When `ng serve` receives a request for `/api/v1/categories`, it forwards it to
`http://localhost:8080/api/v1/categories`. The browser only ever sees the Angular
origin (`http://localhost:4200`), so there is no CORS issue in development. The proxy
is wired into `angular.json` under `projects.angular-tutorial.architect.serve.options`.

---

## 7. Run with Docker (production mode)

Build and run the production image:

```bash
docker build -t angular-tutorial .
docker run -p 4200:80 angular-tutorial
```

The Dockerfile uses a two-stage build: Stage 1 compiles the Angular app with Node;
Stage 2 serves the static output with nginx. The nginx config in `nginx.conf` proxies
`/api/v1` to `host.docker.internal:8080` so the container can reach the backend
running on your host machine.

You can also use `docker-compose.yml` to start the frontend container:

```bash
docker compose up --build
```

---

## 8. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `npm start` fails with port 4200 in use | Another process is on 4200 | Kill it or use `ng serve --port 4201` |
| API calls return 502 Bad Gateway | Backend not running | Start `spring-boot-tutorial` first |
| "Cannot activate account" error | Activation token expired | Re-register or extend the token TTL in the backend config |
| `npm install` fails with peer-dep error | Node version mismatch | Use Node 22 LTS |
| Lint errors after `npm install` | eslint config mismatch | Run `npm run lint` and fix reported errors |

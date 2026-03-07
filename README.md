# Keg Monitor

Web-based app to manage a home keg system: monitor beer level and temperature across multiple kegs, with a simple hardware build (Arduino Uno R4 WiFi + flow + temperature sensors) that sends metrics over **encrypted (HTTPS)** WiFi.

## Features

- **Dashboard**: Beer brand/type per keg, keg icon with fill level (bar-graph style), optional percentage, temperature (°F / °C), brewery logo when provided.
- **Admin** (local auth): Beer library (brewery, style, name, purchase business, email, phone), assign beer to tap, choose keg size (ounces derived; each pour subtracts from total; reset when you add a new keg).
- **Hardware**: Arduino sends flow pulses and DS18B20 temperatures to the API over HTTPS. Dashboard and admin run on separate hardware (e.g. your server or a Raspberry Pi), not on the Arduino.

## Architecture

- **Web app** (this repo): Node.js API + React frontend. Run in Docker or directly. Serves dashboard and admin; stores data in SQLite.
- **Hardware**: Arduino Uno R4 WiFi reads Titan 300 flow sensor and BOJACK DS18B20, posts to `POST /api/device/metrics` over HTTPS with device credentials.

Data is sent **encrypted** (TLS); the Arduino uses `WiFiSSLClient` to port 443.

## Quick start

### 1. Web app (Docker)

```bash
# Build and run (creates volume for DB)
docker build -t keg-monitor .
docker run -d -p 3000:3000 -v keg-data:/app/data \
  -e SESSION_SECRET=your-secret \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-password \
  --name keg-monitor keg-monitor
```

First run: initialize DB and create admin user (if not using env vars):

```bash
docker run --rm -v keg-data:/app/data -e SESSION_SECRET=xxx keg-monitor node server/scripts/init-db.js
```

Then open **http://localhost:3000** for the dashboard and **http://localhost:3000/admin** for admin.

### 2. Web app (local)

```bash
npm install
cd client && npm install && npm run build && cd ..
cp .env.example .env
# Edit .env: SESSION_SECRET, optional ADMIN_* and DB_PATH
node server/scripts/init-db.js
npm start
```

### 3. Admin setup

1. Log in at `/admin` with your admin user.
2. **Devices**: Create a device; copy **Device ID** and **Secret** for the Arduino.
3. **Beer library**: Add beers (brewery, style, name, purchase business, email, phone, optional logo URL).
4. **Taps**: Add taps, set keg size, assign beer, set **Device ID** (and **Device tap index** if one Arduino serves multiple taps). Use **New keg** when you swap a keg to reset the level.

### 4. Hardware

- **Arduino**: Open `hardware/arduino/keg_monitor/keg_monitor.ino`, set WiFi, server `host`, `deviceId`, `deviceSecret`. Install libraries: OneWire, DallasTemperature. See `hardware/arduino/README.md` for wiring (Titan 300 + DS18B20).
- Ensure the server is reachable over HTTPS (port 443) with a valid certificate so the Arduino’s `WiFiSSLClient` can connect.

## Project layout

```
├── client/                 # React (Vite) dashboard + admin UI
├── server/                 # Express API, SQLite, auth
│   ├── db/
│   ├── scripts/
│   └── index.js
├── hardware/
│   └── arduino/            # Arduino Uno R4 WiFi firmware + README
├── Dockerfile
├── .env.example
└── package.json
```

## API (summary)

- `GET /api/dashboard` – public; returns taps with level, temperature, beer info.
- `POST /api/device/metrics` – device auth via `X-Device-Id` and `X-Device-Secret`; body `{ temperatures: [{ celsius }], pours: [{ pulses }] }`; order matches tap index for that device.
- `/api/admin/*` – session auth; beers, taps, keg sizes, devices CRUD.

## License

MIT

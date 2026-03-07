# Keg Monitor – Arduino Uno R4 WiFi

Firmware for the Arduino Uno R4 WiFi that reads a **Titan 300** flow sensor and **DS18B20** temperature sensor(s) and sends metrics to the Keg Monitor web app over **HTTPS**.

## Hardware

- **Arduino Uno R4 WiFi**
- **Titan 300 flow sensor** (or similar pulse-output flow meter)
- **DS18B20** temperature sensor(s) (one per tap on a single 1-Wire bus)

## Wiring

### Titan 300 flow sensor

| Sensor | Arduino |
|--------|---------|
| Red (VCC) | 5V or 3.3V |
| Black (GND) | GND |
| Yellow (signal) | Digital pin 2 (or another interrupt-capable pin) |

Use the same pin as `FLOW_PIN` in the sketch.

### DS18B20 (BOJACK or similar)

- **VDD** → 3.3V  
- **GND** → GND  
- **Data** → digital pin 3 (or `ONE_WIRE_PIN`)  
- **4.7 kΩ** resistor between Data and VDD  

Multiple DS18B20s can share the same data pin; each will get an index (0, 1, …) in code.

## Libraries

Install via **Sketch → Include Library → Manage Libraries**:

1. **OneWire** (Paul Stoffregen)
2. **DallasTemperature** (Miles Burton)

The **WiFiS3** and **WiFiSSLClient** are included with the **Arduino Uno R4 WiFi** board package.

## Configuration

1. In the sketch, set:
   - `ssid` / `pass` – your WiFi
   - `host` – Keg Monitor server hostname (no `https://`)
   - `deviceId` / `deviceSecret` – from the web app **Admin → Devices** (create a device and copy both)
2. Set `NUM_TAPS` to how many taps this Arduino reports (e.g. 1 for one keg).
3. Calibrate **pulses per ounce**: pour a known volume (e.g. 16 oz), note the pulse count, then set `PULSES_PER_OUNCE` or the per-tap **Pulses per ounce** in Admin so that `ounces = pulses / pulses_per_ounce` matches reality.

## Server and taps

- In **Admin → Taps**, create a tap and set its **Device ID** to the same `deviceId` as in the sketch.
- If this Arduino reports more than one tap, set **Device tap index** to 0 for the first tap, 1 for the second, etc., so the order matches the arrays in the firmware.

## HTTPS

The sketch uses **WiFiSSLClient** and connects to port 443. The server must present a valid TLS certificate (e.g. Let’s Encrypt or a CA-signed cert). For a self-signed cert you would need to add the server’s CA or public key to the Arduino (not shown here).

## Multiple flow sensors

This example uses a single flow sensor on one tap. For multiple taps with one Arduino:

- Use one interrupt-capable pin per flow sensor.
- Use one `volatile` counter per pin and one ISR per pin (or one ISR that checks which pin fired).
- In `loop()`, build `pours` with one `{"pulses": delta}` per tap in the same order as `device_tap_index`.

## Optional: Raspberry Pi

You can run this firmware on the Arduino only; it talks to the web app over WiFi and HTTPS. If you prefer, a Raspberry Pi can run a small bridge that reads from the Arduino (e.g. serial or local HTTP) and forwards to the Keg Monitor API, but the simplest setup is Arduino → WiFi → Keg Monitor server.

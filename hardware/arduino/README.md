# Keg Monitor – Arduino Uno R4 WiFi

Firmware for the Arduino Uno R4 WiFi that reads a **Titan 300** flow sensor and **DS18B20** temperature sensor(s) and sends metrics to the Keg Monitor web app over **HTTPS**.

## Hardware

- **Arduino Uno R4 WiFi**
- **Two** flow sensors (e.g. Titan 300) – one per tap
- **One or more** DS18B20 temperature sensor(s) on a single 1-Wire bus (pin 7)

## Wiring

**Common ground and power:** All sensors can share the same **5V** and **GND**. Connect every sensor’s VCC to **5V** and GND to **GND**.

Default pinout (matches the sketch defaults):

| Signal        | Arduino pin | Use                    |
|---------------|-------------|------------------------|
| Flow sensor 1 | **2**       | Tap 0 flow (interrupt) |
| Flow sensor 2 | **3**       | Tap 1 flow (interrupt) |
| Temperature   | **7**       | DS18B20 1-Wire data    |
| Power         | **5V**      | All sensors VCC        |
| Ground        | **GND**     | All sensors GND        |

### Flow sensors (e.g. Titan 300)

- **Red (VCC)** → 5V  
- **Black (GND)** → GND  
- **Yellow (signal)** → Pin 2 (tap 0) and Pin 3 (tap 1)

### DS18B20 temperature

- **VDD** → 5V  
- **GND** → GND  
- **Data** → Pin 7  
- **4.7 kΩ** resistor between Data and VDD (or Data and 5V)

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
2. Set `NUM_TAPS` to how many taps this Arduino reports (default 2). Pin defines `FLOW_PIN_0`, `FLOW_PIN_1`, and `ONE_WIRE_PIN` match the wiring table above.
3. Calibrate **pulses per ounce**: pour a known volume (e.g. 16 oz), note the pulse count, then set `PULSES_PER_OUNCE` or the per-tap **Pulses per ounce** in Admin so that `ounces = pulses / pulses_per_ounce` matches reality.

## Server and taps

- In **Admin → Taps**, create a tap and set its **Device** to the same device as in the sketch (from **Admin → Devices**).
- If this Arduino reports more than one tap, set **Device tap index** to 0 for the first tap, 1 for the second, etc., so the order matches the arrays in the firmware. When you select the same device for another tap, the form suggests the next free index.

**Only one tap shows temperature/pour?** Assign the **same device** to every tap that this Arduino should feed, and give each tap a different **Device tap index** (0, 1, 2…). The server maps sensor index 0 → tap with index 0, index 1 → tap with index 1, and drops readings when there is no tap for that index.

## HTTPS

The sketch uses **WiFiSSLClient** and connects to port 443. The server must present a valid TLS certificate (e.g. Let’s Encrypt or a CA-signed cert). For a self-signed cert you would need to add the server’s CA or public key to the Arduino (not shown here).

## Multiple flow sensors

The default sketch is set up for **two** flow sensors (pins 2 and 3) and one temperature sensor (pin 7). Each flow pin has its own ISR (`flowISR0`, `flowISR1`). To add more taps, define more `FLOW_PIN_*` and ISRs, and increase `NUM_TAPS`.

## Optional: Raspberry Pi

You can run this firmware on the Arduino only; it talks to the web app over WiFi and HTTPS. If you prefer, a Raspberry Pi can run a small bridge that reads from the Arduino (e.g. serial or local HTTP) and forwards to the Keg Monitor API, but the simplest setup is Arduino → WiFi → Keg Monitor server.

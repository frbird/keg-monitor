/*
 * Keg Monitor - Arduino Uno R4 WiFi
 *
 * Sends beer level (flow sensor pulses) and temperature (DS18B20) to the
 * Keg Monitor web app over HTTPS. One device can report multiple taps;
 * set NUM_TAPS and flow/temp pins to match your wiring.
 *
 * Default wiring:
 *   - Pin 2 = Flow sensor 1 signal (tap 0)
 *   - Pin 3 = Flow sensor 2 signal (tap 1)
 *   - Pin 7 = DS18B20 temperature (1-Wire data)
 *   - 5V = power for all sensors
 *   - GND = common ground for all sensors
 *
 * Libraries (Arduino Library Manager):
 *   - WiFiS3 (built-in with Arduino Uno R4 WiFi board)
 *   - OneWire
 *   - DallasTemperature
 */

#include <WiFiS3.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Set to 0 to use plain HTTP (e.g. local server). Use only on trusted networks.
#define USE_HTTPS 0

#if USE_HTTPS
#include <WiFiSSLClient.h>
#else
#include <WiFiClient.h>
#endif

// -------- Configuration (change these) --------
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

const char* host = "SERVER_IP_OR_HOST";  // Server hostname or IP (no https:// or http://)
const int   port = 3000;                 // 443 for HTTPS; 3000 (or 80) for HTTP when USE_HTTPS is 0

const char* deviceId = "YOUR_DEVICE_ID";       // From Admin → Devices
const char* deviceSecret = "YOUR_DEVICE_SECRET";

// Number of taps this device reports (order must match device_tap_index in admin)
#define NUM_TAPS 2

// Flow sensor signal pins (use interrupt-capable pins; Uno R4: 0,1,2,3,4,5,6,7,...)
#define FLOW_PIN_0 2   // Tap 0
#define FLOW_PIN_1 3   // Tap 1

// 1-Wire bus for DS18B20 temperature sensor(s)
#define ONE_WIRE_PIN 7

// Pulses per ounce for Titan 300 (calibrate: pour known volume, count pulses)
// Typical range ~4–8 pulses per fl oz depending on flow rate; adjust in admin per-tap.
const float PULSES_PER_OUNCE = 5.0f;

// How often to send metrics (ms)
#define SEND_INTERVAL_MS 15000

// Optional: send heartbeat between metrics to keep "connected" status (0 = disabled)
#define HEARTBEAT_INTERVAL_MS 30000

// Board/sensor names sent to server (shown on dashboard and admin)
#define BOARD_MODEL "Arduino Uno R4 WiFi"
#define FLOW_SENSOR_MODEL "Titan 300"
#define TEMP_SENSOR_MODEL "DS18B20"

// -------- Globals --------
#if USE_HTTPS
WiFiSSLClient client;
#else
WiFiClient client;
#endif
OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature sensors(&oneWire);

volatile uint32_t flowPulses[NUM_TAPS];
uint32_t lastPulses[NUM_TAPS];
unsigned long lastSend;
unsigned long lastHeartbeat;

void flowISR0() { flowPulses[0]++; }
void flowISR1() { flowPulses[1]++; }

void setup() {
  Serial.begin(9600);
  while (!Serial) {}

  for (int i = 0; i < NUM_TAPS; i++) {
    flowPulses[i] = 0;
    lastPulses[i] = 0;
  }
  pinMode(FLOW_PIN_0, INPUT_PULLUP);
  pinMode(FLOW_PIN_1, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN_0), flowISR0, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN_1), flowISR1, FALLING);

  sensors.begin();

  Serial.print("Connecting to WiFi... ");
  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("WiFi module error");
    return;
  }
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println(" OK");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  lastSend = 0;
  lastHeartbeat = 0;
}

void loop() {
  sensors.requestTemperatures();

  unsigned long now = millis();

  // Optional: lightweight heartbeat to keep "connected" status when not sending metrics
#if HEARTBEAT_INTERVAL_MS > 0
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    if (sendHeartbeat()) Serial.println("Heartbeat OK");
  }
#endif

  if (now - lastSend >= SEND_INTERVAL_MS) {
    lastSend = now;

    float temps[NUM_TAPS];
    int sensorCount = sensors.getDeviceCount();
    for (int i = 0; i < NUM_TAPS; i++) {
      if (i < sensorCount) {
        temps[i] = sensors.getTempCByIndex(i);
        if (temps[i] == DEVICE_DISCONNECTED_C) temps[i] = -127.0f;
      } else if (sensorCount > 0) {
        // One temp sensor: use same reading for all taps (e.g. shared cold room)
        temps[i] = sensors.getTempCByIndex(0);
        if (temps[i] == DEVICE_DISCONNECTED_C) temps[i] = -127.0f;
      } else {
        temps[i] = -127.0f;
      }
    }

    // Build JSON: deviceInfo (board + sensors), temperatures, pours
    String body = "{\"deviceInfo\":{\"board\":\"" BOARD_MODEL "\",\"sensors\":[{\"type\":\"flow\",\"model\":\"" FLOW_SENSOR_MODEL "\"},{\"type\":\"temperature\",\"model\":\"" TEMP_SENSOR_MODEL "\"}]},\"temperatures\":[";
    for (int i = 0; i < NUM_TAPS; i++) {
      if (i > 0) body += ",";
      body += "{\"celsius\":";
      body += temps[i];
      body += "}";
    }
    body += "],\"pours\":[";
    for (int i = 0; i < NUM_TAPS; i++) {
      uint32_t delta = flowPulses[i] - lastPulses[i];
      lastPulses[i] = flowPulses[i];
      if (i > 0) body += ",";
      body += "{\"pulses\":";
      body += delta;
      body += "}";
    }
    body += "]}";

    if (sendMetrics(body)) {
      Serial.println("Metrics sent OK");
    } else {
      Serial.println("Metrics send failed");
    }
  }

  delay(100);
}

bool sendMetrics(const String& body) {
  if (!client.connect(host, port)) {
    Serial.println(USE_HTTPS ? "HTTPS connect failed" : "HTTP connect failed");
    return false;
  }

  client.println("POST /api/device/metrics HTTP/1.1");
  client.print("Host: ");
  client.println(host);
  client.println("Content-Type: application/json");
  client.print("X-Device-Id: ");
  client.println(deviceId);
  client.print("X-Device-Secret: ");
  client.println(deviceSecret);
  client.print("Content-Length: ");
  client.println(body.length());
  client.println("Connection: close");
  client.println();
  client.print(body);

  unsigned long timeout = millis();
  while (client.connected() && millis() - timeout < 5000) {
    if (client.available()) {
      String line = client.readStringUntil('\n');
      if (line.startsWith("HTTP")) {
        int code = line.substring(9, 12).toInt();
        client.stop();
        return (code >= 200 && code < 300);
      }
    }
    delay(1);
  }
  client.stop();
  return false;
}

bool sendHeartbeat() {
  if (!client.connect(host, port)) return false;
  client.println("POST /api/device/heartbeat HTTP/1.1");
  client.print("Host: ");
  client.println(host);
  client.print("X-Device-Id: ");
  client.println(deviceId);
  client.print("X-Device-Secret: ");
  client.println(deviceSecret);
  client.println("Content-Length: 0");
  client.println("Connection: close");
  client.println();
  unsigned long timeout = millis();
  while (client.connected() && millis() - timeout < 5000) {
    if (client.available()) {
      String line = client.readStringUntil('\n');
      if (line.startsWith("HTTP")) {
        int code = line.substring(9, 12).toInt();
        client.stop();
        return (code >= 200 && code < 300);
      }
    }
    delay(1);
  }
  client.stop();
  return false;
}

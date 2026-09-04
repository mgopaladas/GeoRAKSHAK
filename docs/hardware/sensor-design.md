# ESP32 Sensor Node — Firmware Architecture

## Overview

The sensor node firmware runs on an ESP32 microcontroller and reads environmental
data from connected sensors. It transmits structured JSON readings via MQTT or HTTP
to the GeoRakshak backend.

## Sensor Connections

| Sensor | Interface | ESP32 Pin | Purpose |
|--------|-----------|-----------|---------|
| Rain Gauge | Digital (pulse) | GPIO 4 | Rainfall measurement |
| Soil Moisture | Analog (ADC) | GPIO 36 | Soil water content |
| MPU6050 IMU | I2C | SDA=21, SCL=22 | Ground tilt/movement |
| GPS (NEO-6M) | UART | RX=16, TX=17 | Location |
| DHT22 | Digital | GPIO 15 | Temperature/humidity |
| Battery | Analog (ADC) | GPIO 39 | Battery voltage |

## Message Format

```json
{
  "device_id": "GR-SENSOR-001",
  "timestamp": "2026-09-03T15:10:00",
  "latitude": 25.5788,
  "longitude": 91.8933,
  "rainfall_1h": 28.4,
  "rainfall_24h": 94.7,
  "soil_moisture": 82.3,
  "tilt_x": 1.8,
  "tilt_y": 2.4,
  "temperature": 24.6,
  "humidity": 81,
  "battery": 87,
  "signal_strength": -71
}
```

## MQTT Topic

```
georakshak/sensors/{device_id}
```

## Firmware Modules (Planned — Phase 4)

```
main.cpp          — Setup, loop, task scheduling
rainfall.cpp      — Rain gauge pulse counting, mm calculation
soil_moisture.cpp — ADC reading, calibration curve
imu.cpp           — MPU6050 tilt/acceleration, filtering
gps.cpp           — NMEA parsing, coordinate extraction
communication.cpp — MQTT publish, HTTP fallback, reconnection
power.cpp         — Battery monitoring, deep sleep, solar
storage.cpp       — Local SPIFFS buffering for offline mode
health.cpp        — Sensor self-diagnostics
```

## Edge Intelligence

The sensor node performs basic validation before transmitting:

1. **Calibration** — Apply sensor-specific conversion curves
2. **Noise Filtering** — Moving average on ADC readings
3. **Outlier Detection** — Flag sudden impossible jumps
4. **Sensor Health** — Detect disconnected/faulty sensors
5. **Timestamping** — GPS-synchronized timestamps

The node does NOT perform AI inference — that happens server-side.

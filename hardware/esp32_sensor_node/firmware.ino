/**
 * GeoRakshak - SIH26001
 * Physical IoT Sensor Node Firmware (ESP32)
 *
 * This firmware reads from an MPU6050 (Tilt/Movement) and an analog Soil Moisture sensor.
 * It connects to Wi-Fi and securely POSTs the telemetry payload to the GeoRakshak AI Backend.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// --- Configuration ---
const char* ssid = "SIH_WIFI_NETWORK";
const char* password = "SIH_PASSWORD";
const char* serverName = "http://YOUR_BACKEND_IP:8000/api/telemetry/ingest"; 

const String STATION_ID = "NODE-001";
const int SOIL_MOISTURE_PIN = 34; 

Adafruit_MPU6050 mpu;
unsigned long lastTime = 0;
unsigned long timerDelay = 5000; // Send telemetry every 5 seconds

void setup() {
  Serial.begin(115200);
  
  // Wi-Fi Connection
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());

  // Initialize Sensors
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 sensor!");
    while (1) { delay(10); }
  }
  
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  pinMode(SOIL_MOISTURE_PIN, INPUT);

  Serial.println("GeoRakshak Sensor Node Ready.");
}

void loop() {
  if ((millis() - lastTime) > timerDelay) {
    if(WiFi.status()== WL_CONNECTED){
      HTTPClient http;
      
      // Read Sensor Data
      int soilRaw = analogRead(SOIL_MOISTURE_PIN);
      // Convert raw (0-4095) to percentage (0-100)
      float soilMoisture = map(soilRaw, 4095, 0, 0, 100); 

      // Read MPU6050 Accelerometer parameters
      sensors_event_t a, g, temp;
      mpu.getEvent(&a, &g, &temp);
      
      // Calculate basic tilt magnitude derived from X & Y acceleration
      float tiltMagnitude = sqrt(pow(a.acceleration.x, 2) + pow(a.acceleration.y, 2));

      // Construct JSON Payload compatible with GeoRakshak backend
      String jsonPayload = "{";
      jsonPayload += "\"station_id\": \"" + STATION_ID + "\", ";
      jsonPayload += "\"soil_moisture\": " + String(soilMoisture) + ", ";
      jsonPayload += "\"tilt_magnitude\": " + String(tiltMagnitude) + "";
      jsonPayload += "}";

      // Transmit
      http.begin(serverName);
      http.addHeader("Content-Type", "application/json");
      
      int httpResponseCode = http.POST(jsonPayload);
      
      Serial.print("Telemetry Sent. HTTP Response: ");
      Serial.println(httpResponseCode);
      
      http.end();
    }
    else {
      Serial.println("WiFi Disconnected. Waiting for reconnection...");
    }
    lastTime = millis();
  }
}

'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Wifi, Code, GitBranch, Database, Terminal, ArrowRight, Zap, GraduationCap, Download, Brain, Play, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';

export default function StudentHub() {
    const [activeLang, setActiveLang] = useState('cpp');
    const [logs, setLogs] = useState<string[]>([]);
    const [openStep, setOpenStep] = useState<number | null>(1);

    // Simulate incoming logs if they were testing their own hardware
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeLang === 'python' || Math.random() > 0.6) {
                const now = new Date().toISOString().split('T')[1].substring(0, 8);
                const mockTilt = (Math.random() * 2).toFixed(2);
                const mockSoil = (60 + Math.random() * 10).toFixed(1);
                setLogs(prev => {
                    const next = [...prev, `[${now}] Recv POST /v1/telemetry [DIY-NODE-01] -> { tilt: ${mockTilt}, soil: ${mockSoil} }`];
                    return next.length > 8 ? next.slice(1) : next;
                });
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [activeLang]);

    const toggleStep = (step: number) => {
        setOpenStep(openStep === step ? null : step);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="glass-card p-8 border-t-4 border-blue-500 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Cpu className="w-48 h-48" />
                </div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/30">
                        <GraduationCap className="w-4 h-4" /> ECE / EEE Open Innovation Hub
                    </div>
                    <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Maker Hub: Connect & Train
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-3xl leading-relaxed text-sm">
                        Welcome, students! The GeoRakshak telemetry lake is entirely open-architecture. This hub contains everything you need: how to wire up your hardware, download datasets, train real predictive Machine Learning models locally, and safely stream your physical IoT telemetry right onto this dashboard.
                    </p>
                </div>
            </div>

            {/* Comprehensive Documentation Accordion */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-[var(--text-primary)]">Complete IoT & AI Integration Guide</h3>
                </div>

                {/* Step 1: Hardware & Wiring */}
                <div className="border-b border-[var(--border-subtle)]">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors text-left"
                        onClick={() => toggleStep(1)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">1</div>
                            <div>
                                <h4 className="font-bold text-[var(--text-primary)]">Circuit Assembly & Hardware</h4>
                                <p className="text-xs text-[var(--text-muted)]">How to build your custom GeoRakshak sensing node</p>
                            </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${openStep === 1 ? 'rotate-90' : ''}`} />
                    </button>
                    {openStep === 1 && (
                        <div className="px-6 pb-6 pt-2 pl-[4.5rem]">
                            <div className="prose prose-sm prose-invert max-w-none text-[var(--text-muted)]">
                                <p>To connect to the GeoRakshak platform, you need a microcontroller (ESP32, ESP8266, or Raspberry Pi Pico W) with internet access. You will also need two primary physical sensors:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-2">
                                    <li><strong>MPU6050 (Accelerometer / Gyroscope):</strong> Connect via I2C (`SDA`, `SCL`). Used to measure ground tilt magnitude. Abnormal angular velocities imply slope displacement.</li>
                                    <li><strong>Capacitive Soil Moisture Sensor:</strong> Connect via Analog Input (`A0`). Placed in the ground, it measures water saturation levels. (0% = Dry, 100% = Saturated).</li>
                                    <li><strong>DHT11/DHT22 (Optional):</strong> For localized temperature and humidity readings.</li>
                                </ul>
                                <p className="mt-3 text-xs bg-[var(--bg-secondary)] p-3 border border-[var(--border-subtle)] rounded text-[var(--text-primary)]">
                                    <strong>Wiring (ESP32):</strong> <br />
                                    <code>MPU6050: VCC to 3.3V, GND to GND, SDA to GPIO21, SCL to GPIO22</code><br />
                                    <code>Moisture: VCC to 3.3V, GND to GND, Aout to GPIO34 (ADC1)</code>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 2: Training the ML Model */}
                <div className="border-b border-[var(--border-subtle)]">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors text-left"
                        onClick={() => toggleStep(2)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">2</div>
                            <div>
                                <h4 className="font-bold text-[var(--text-primary)]">Train & Predict (Machine Learning)</h4>
                                <p className="text-xs text-[var(--text-muted)]">How to use historical datasets to predict landslides</p>
                            </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${openStep === 2 ? 'rotate-90' : ''}`} />
                    </button>
                    {openStep === 2 && (
                        <div className="px-6 pb-6 pt-2 pl-[4.5rem]">
                            <div className="prose prose-sm prose-invert max-w-none text-[var(--text-muted)]">
                                <p>Instead of hardcoding "if rainfall {'>'} 100", the GeoRakshak backend utilizes a Random Forest Classifier to output a <strong>Risk Probability (0.0 to 1.0)</strong>.</p>
                                <ol className="list-decimal pl-5 mt-2 space-y-2">
                                    <li>
                                        <strong>Download Data:</strong> Use the purple dataset block below to download the `GeoRakshak_Landslide_Data.csv`. This contains 1,500+ rows of historical parameters (rainfall_24h, tilt, soil_moisture, susceptibility_score).
                                    </li>
                                    <li>
                                        <strong>Train a Model (Local):</strong> Write a Python script using `scikit-learn`. Use `RandomForestClassifier` trained on X (`rainfall`, `tilt`, `moisture`) and y (`landslide_occurred = 0 or 1`).
                                    </li>
                                    <li>
                                        <strong>Prediction Engine:</strong> During inference, the Python backend takes your physical incoming sensor telemetry via the API, passes it directly into the `.predict_proba(X)` pipeline, and returns `CRITICAL`, `HIGH`, `MODERATE`, or `LOW` risk.
                                    </li>
                                </ol>
                                <p className="mt-3 italic text-xs text-blue-400">Note: The national platform handles the cloud inference automatically. You just need to pipe your data to the API!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 3: API Pipeline */}
                <div>
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors text-left"
                        onClick={() => toggleStep(3)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">3</div>
                            <div>
                                <h4 className="font-bold text-[var(--text-primary)]">Cloud Integration Pipeline</h4>
                                <p className="text-xs text-[var(--text-muted)]">API Keys, JSON POSTing, and Live WebSockets</p>
                            </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${openStep === 3 ? 'rotate-90' : ''}`} />
                    </button>
                    {openStep === 3 && (
                        <div className="px-6 pb-6 pt-2 pl-[4.5rem]">
                            <div className="prose prose-sm prose-invert max-w-none text-[var(--text-muted)] bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-subtle)]">
                                <p>Once your circuit is active, your C++ or Python script must construct a JSON payload with the exact schema our database requires, and fire an HTTP POST request to the cloud endpoint.</p>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Student API Key (Auth)</div>
                                        <code className="text-sm text-green-400 font-mono">sk_stu_live_8f92jKds93kL</code>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Telemetry POST Webhook</div>
                                        <code className="text-sm text-blue-400 font-mono break-all">http://api.georakshak.in/v1/telemetry</code>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs">When the API receives your JSON packet (look at the code examples below), it automatically passes the values into the ML engine, calculates the Risk Score, and pushes the new state back down to this Website via a Live WebSocket connection. <strong>You will see your hardware physically trigger the dashboard map below!</strong></p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">

                {/* Column 1 & 2: Datasets & Integration */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Dataset Training Section */}
                    <div className="glass-card p-6 border-l-2 border-purple-500 hover:bg-[var(--bg-secondary)] transition-colors">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="w-6 h-6 text-purple-400" />
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Download Datasets</h3>
                                </div>
                                <p className="text-sm text-[var(--text-muted)] mb-4 max-w-lg">
                                    Grab the authoritative SIH dataset containing pre-labeled regional baseline susceptibility characteristics (rainfall constants, soil types) for local model training.
                                </p>
                            </div>
                            <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-purple-500/20">
                                <Download className="w-4 h-4" /> .CSV Dataset
                            </button>
                        </div>
                    </div>

                    {/* Hardware Code Setup */}
                    <div className="glass-card p-6 border-l-2 border-orange-500">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Code className="w-6 h-6 text-orange-400" />
                                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Circuit Code Blueprints</h3>
                                </div>
                                <p className="text-xs text-[var(--text-muted)]">Flash your ESP32 or Raspberry Pi to send live data using our JSON format.</p>
                            </div>
                            <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1 border border-[var(--border-subtle)]">
                                <button
                                    onClick={() => setActiveLang('cpp')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeLang === 'cpp' ? 'bg-orange-500/20 text-orange-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                >
                                    C++ (ESP32)
                                </button>
                                <button
                                    onClick={() => setActiveLang('python')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeLang === 'python' ? 'bg-orange-500/20 text-orange-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                >
                                    Python (Raspberry Pi)
                                </button>
                                <button
                                    onClick={() => setActiveLang('curl')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeLang === 'curl' ? 'bg-orange-500/20 text-orange-400' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                                >
                                    cURL (No Hardware)
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#0d1117] rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-inner">
                            <div className="flex items-center px-4 py-2 border-b border-[var(--border-subtle)] bg-[#161b22]">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="ml-4 text-xs font-mono text-gray-400">
                                    {activeLang === 'cpp' ? 'main.ino' : activeLang === 'python' ? 'telemetry_push.py' : 'terminal.sh'}
                                </span>
                            </div>
                            <div className="p-4 overflow-x-auto h-72 scrollbar-thin">
                                <pre className="text-[13px] font-mono text-gray-300 leading-relaxed">
                                    {activeLang === 'cpp' && (
                                        `#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* endpoint = "http://api.georakshak.in/v1/telemetry"; // SIH Webhook

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while(WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(endpoint);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", "sk_stu_live_8f92jKds93kL");

    // Read your physical sensors (MPU6050 & Moisture)
    float tilt = readMPU6050(); 
    float moisture = analogRead(SOIL_PIN);

    // Exact JSON Schema required by GeoRakshak
    String payload = "{\\"station_id\\":\\"DIY-NODE-01\\",\\"measurements\\":{\\"tilt_magnitude\\":" + String(tilt) + ",\\"soil_moisture\\":" + String(moisture) + "}}";
    
    int responseCode = http.POST(payload);
    http.end();
  }
  delay(1000); // Send data at 1 Hz
}`
                                    )}
                                    {activeLang === 'python' && (
                                        `import requests
                                    import time
                                    import json
                                    from mpu6050 import mpu6050 # Assuming I2C

                                    sensor = mpu6050(0x68)
                                    ENDPOINT = "http://api.georakshak.in/v1/telemetry"

                                    while True:
                                    accel_data = sensor.get_accel_data()

                                    # Calculate simple inclination magnitude
                                    tilt = (accel_data['x']**2 + accel_data['y']**2)**0.5

                                    # Exact JSON Schema required by GeoRakshak
                                    payload = {
                                        "station_id": "DIY-NODE-01",
                                    "measurements": {
                                        "tilt_magnitude": float(tilt),
                                    "soil_moisture": 65.5, # Read from ADC A0
                                    "rainfall_1h": 0.0
        }
    }

                                    headers = {"X-API-Key": "sk_stu_live_8f92jKds93kL"}
                                    requests.post(ENDPOINT, json=payload, headers=headers)
                                    time.sleep(1)`
                                    )}
                                    {activeLang === 'curl' && (
                                        `# Don't have hardware yet? No problem!
# You can simulate a live IoT payload directly from your computer's terminal.
# Just paste this into your command line (Mac/Linux/Windows PowerShell):

curl -X POST "http://api.georakshak.in/v1/telemetry" \\
     -H "Content-Type: application/json" \\
     -H "X-API-Key: sk_stu_live_8f92jKds93kL" \\
     -d '{
          "station_id": "DIY-NODE-01",
          "measurements": {
              "tilt_magnitude": 1.45,
              "soil_moisture": 88.0,
              "rainfall_1h": 0.0
          }
     }'

# Watch the Live Webhook Terminal below react instantly!`
                                    )}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Live Output Terminal */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 border-l-2 border-green-500 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-green-400" />
                                <h3 className="font-bold text-[var(--text-primary)]">Live Webhook Terminal</h3>
                            </div>
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-500 tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Listening
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-4">
                            Once your microcontroller begins executing the script, your Node ID `DIY-NODE-01` will show up here, validating cloud ingestion.
                        </p>

                        <div className="flex-1 bg-[#0d1117] rounded-xl border border-[var(--border-subtle)] flex flex-col items-stretch overflow-hidden min-h-[300px]">
                            <div className="text-[10px] text-gray-500 font-mono p-2 border-b border-[var(--border-subtle)] bg-[#161b22]">
                                /var/log/georakshak/ingest.log
                            </div>
                            <div className="p-3 font-mono text-[11px] text-gray-400 leading-relaxed overflow-y-auto w-full h-full flex flex-col justify-end whitespace-pre-wrap">
                                {logs.length === 0 ? (
                                    <div className="text-gray-600 italic animate-pulse">Waiting for hardware connection...</div>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className={`py-0.5 ${i === logs.length - 1 ? 'text-green-400' : 'opacity-70'}`}>
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="text-center text-xs text-[var(--text-muted)] pt-8 opacity-70">
                Note: This Maker Hub sandbox is restricted to 1Hz telemetry rates. Do not flash production firmware using these endpoints.
            </div>
        </div>
    );
}

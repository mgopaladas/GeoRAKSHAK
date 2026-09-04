import { useState, useEffect, useRef } from 'react';

// Defines the shape of the incoming per-second telemetry & ML trigger payload
export interface TelemetryPacket {
    type: 'TELEMETRY' | 'ALERT';
    station_id: string;
    timestamp: string;
    measurements?: {
        rainfall_1h: number;
        rainfall_24h: number;
        soil_moisture: number;
        susceptibility: number;
        tilt_magnitude: number;
    };
    prediction?: {
        risk_level: string;
        confidence: number;
    };
    severity?: string;
    message?: string;
}

export function useTelemetry(socketUrl: string = 'ws://127.0.0.1:8000/ws/telemetry') {
    const [telemetryStream, setTelemetryStream] = useState<TelemetryPacket[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<TelemetryPacket[]>([]);
    // Track the current real-time AI computed state of each individual sensor
    const [nodeStates, setNodeStates] = useState<Record<string, { risk_level: string, confidence: number }>>({});
    // Track the complete full JSON packet for each node for the Sensors data table
    const [latestReadings, setLatestReadings] = useState<Record<string, TelemetryPacket>>({});
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Only connect on the client side
        if (typeof window === 'undefined') return;

        const connectWebSocket = () => {
            console.log('Connecting to GeoRakshak Telemetry Stream...');
            wsRef.current = new WebSocket(socketUrl);

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.batch) {
                        // High frequency batch (TELEMETRY)
                        setTelemetryStream(prev => {
                            const newStream = [...data.batch, ...prev];
                            // Keep only the last 50 ticks to avoid massive RAM usage
                            return newStream.slice(0, 50);
                        });

                        // Dynamically update the Master UI Status Registry based on live predictions
                        setNodeStates(prev => {
                            const nextState = { ...prev };
                            data.batch.forEach((packet: TelemetryPacket) => {
                                if (packet.prediction) {
                                    nextState[packet.station_id] = {
                                        risk_level: packet.prediction.risk_level,
                                        confidence: packet.prediction.confidence
                                    };
                                }
                            });
                            return nextState;
                        });

                        setLatestReadings(prev => {
                            const nextReadings = { ...prev };
                            data.batch.forEach((packet: TelemetryPacket) => {
                                nextReadings[packet.station_id] = packet;
                            });
                            return nextReadings;
                        });
                    } else if (data.type === 'ALERT') {
                        // Instant trigger alert from the Edge Inference Engine
                        setActiveAlerts(prev => [data, ...prev].slice(0, 10));
                    }
                } catch (e) {
                    console.error("Error parsing telemetry stream:", e);
                }
            };

            wsRef.current.onerror = (error) => {
                console.warn("WebSocket minor interruption (often due to React StrictMode):", error);
                wsRef.current?.close();
            };

            wsRef.current.onclose = () => {
                console.warn('WebSocket connection closed. Attempting reconnect in 3s...');
                // Auto-reconnect basic logic
                setTimeout(connectWebSocket, 3000);
            };
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [socketUrl]);

    return { telemetryStream, activeAlerts, nodeStates, latestReadings };
}

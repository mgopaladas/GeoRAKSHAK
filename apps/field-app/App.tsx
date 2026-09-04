import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Simulated active alerts fetched from FastAPI
const mockAlerts = [
    { id: '1', zone: 'Ramban-Banihal Corridor', type: 'CRITICAL', desc: '95% Risk computed from massive rainfall influx.' },
    { id: '2', zone: 'Doda Zone', type: 'HIGH', desc: '89% Trigger boundary met.' }
];

export default function App() {
    const [activeTab, setActiveTab] = useState('ALERTS');

    const handleReportSubmit = () => {
        Alert.alert('Report Submitted', 'Ground truth successfully securely dispatched to the central intelligence module.');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>GeoRakshak Field Agent</Text>
                <View style={styles.headerStatus}>
                    <View style={styles.statusDot}></View>
                    <Text style={styles.statusText}>SYS_SYNC</Text>
                </View>
            </View>

            {/* Navigation */}
            <View style={styles.navBar}>
                <TouchableOpacity
                    style={[styles.navButton, activeTab === 'ALERTS' && styles.navButtonActive]}
                    onPress={() => setActiveTab('ALERTS')}
                >
                    <Text style={[styles.navText, activeTab === 'ALERTS' && styles.navTextActive]}>Live Alerts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navButton, activeTab === 'REPORT' && styles.navButtonActive]}
                    onPress={() => setActiveTab('REPORT')}
                >
                    <Text style={[styles.navText, activeTab === 'REPORT' && styles.navTextActive]}>Report Ground Truth</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView style={styles.content}>
                {activeTab === 'ALERTS' ? (
                    <View style={styles.alertView}>
                        <Text style={styles.sectionTitle}>Active Emergency Protocols</Text>
                        {mockAlerts.map(alert => (
                            <View key={alert.id} style={styles.alertCard}>
                                <View style={styles.alertHeader}>
                                    <Text style={styles.alertZone}>{alert.zone}</Text>
                                    <Text style={[styles.alertBadge, alert.type === 'CRITICAL' ? styles.badgeCrit : styles.badgeHigh]}>
                                        {alert.type}
                                    </Text>
                                </View>
                                <Text style={styles.alertDesc}>{alert.desc}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.reportView}>
                        <Text style={styles.sectionTitle}>Submit Field Observation</Text>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Location Capture</Text>
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionText}>📍 Lock GPS Coordinates</Text>
                            </TouchableOpacity>
                            <Text style={styles.subtext}>Accuracy: Pending</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Visual Verification</Text>
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionText}>📷 Capture Slope Image</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.submitButton} onPress={handleReportSubmit}>
                            <Text style={styles.submitText}>TRANSMIT SECURE REPORT</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0e17',
    },
    header: {
        padding: 20,
        paddingTop: 40,
        backgroundColor: '#111827',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#374151'
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#064e3b',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34d399',
        marginRight: 6
    },
    statusText: {
        color: '#34d399',
        fontSize: 10,
        fontWeight: 'bold'
    },
    navBar: {
        flexDirection: 'row',
        backgroundColor: '#111827',
    },
    navButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderColor: 'transparent'
    },
    navButtonActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#1e293b'
    },
    navText: {
        color: '#9ca3af',
        fontWeight: 'bold'
    },
    navTextActive: {
        color: '#3b82f6'
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20
    },
    alertCard: {
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#374151'
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    alertZone: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    alertBadge: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden'
    },
    badgeCrit: {
        backgroundColor: '#dc2626',
    },
    badgeHigh: {
        backgroundColor: '#ea580c',
    },
    alertDesc: {
        color: '#d1d5db',
        fontSize: 14,
        lineHeight: 20
    },
    alertView: {},
    reportView: {},
    formGroup: {
        marginBottom: 24
    },
    label: {
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8
    },
    actionButton: {
        backgroundColor: '#1f2937',
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center'
    },
    actionText: {
        color: '#60a5fa',
        fontWeight: 'bold'
    },
    subtext: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 6,
        textAlign: 'right'
    },
    submitButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20
    },
    submitText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});

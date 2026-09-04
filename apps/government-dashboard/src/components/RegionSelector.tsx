'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';

interface RegionSelectorProps {
    onRegionChange?: (region: string) => void;
}

const REGIONS = [
    { id: 'ner', name: 'NER (North Eastern Region)', label: 'Primary Deployment', isDefault: true },
    { id: 'himalayas', name: 'Himalayas Belt', label: 'Active Monitoring Zone' },
    { id: 'western_ghats', name: 'Western Ghats', label: 'Active Monitoring Zone' },
    { id: 'eastern_ghats', name: 'Eastern Ghats', label: 'Active Monitoring Zone' },
    { id: 'india', name: 'National Overview', label: 'MDoNER Master Layer' },
];

export default function RegionSelector({ onRegionChange }: RegionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState('ner');

    const selectedRegion = REGIONS.find(r => r.id === selectedId) || REGIONS[0];

    const handleSelect = (id: string) => {
        setSelectedId(id);
        setIsOpen(false);
        if (onRegionChange) {
            onRegionChange(id);
        }
    };

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)]/60 hover:bg-[var(--bg-card-hover)] transition-colors"
            >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgba(59,130,246,0.2)]">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="flex flex-col items-start px-1 text-left">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider leading-none mb-0.5">
                        Monitoring Region
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)] leading-none">
                        {selectedRegion.name}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-xl shadow-black/20 overflow-hidden z-50">
                        <div className="p-2 border-b border-[var(--glass-border)]">
                            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-2">
                                National Monitoring Layer
                            </span>
                        </div>
                        <div className="p-1.5">
                            {REGIONS.map((region) => (
                                <button
                                    key={region.id}
                                    onClick={() => handleSelect(region.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${selectedId === region.id
                                        ? 'bg-blue-500/15 text-[var(--text-primary)]'
                                        : 'hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]'
                                        }`}
                                >
                                    <div>
                                        <div className={`text-sm font-semibold text-[var(--text-primary)]`}>
                                            {region.name}
                                            {region.isDefault && (
                                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-500">
                                                    DEFAULT
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                            {region.label}
                                        </div>
                                    </div>
                                    {selectedId === region.id && (
                                        <Check className="w-4 h-4 text-blue-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
} 

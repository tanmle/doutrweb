import React, { useState } from 'react';
import { Button } from '../ui/Button';
import styles from './DateRangeFilter.module.css';

export type DatePreset = 'today' | 'week' | 'month' | 'last-month';

export interface DateRange {
    start: string;
    end: string;
}

export interface DateRangeFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    presets?: DatePreset[];
    showCustomRange?: boolean;
}

export function DateRangeFilter({
    value,
    onChange,
    presets = ['today', 'week', 'month', 'last-month'],
    showCustomRange = true
}: DateRangeFilterProps) {
    const [activePreset, setActivePreset] = useState<DatePreset | 'range' | null>(null);

    const handlePresetClick = (preset: DatePreset) => {
        setActivePreset(preset);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        switch (preset) {
            case 'today':
                onChange({ start: todayStr, end: todayStr });
                break;
            case 'week': {
                const weekday = today.getDay();
                const diff = (weekday + 6) % 7;
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - diff);
                onChange({
                    start: startOfWeek.toISOString().split('T')[0],
                    end: todayStr
                });
                break;
            }
            case 'month': {
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                onChange({
                    start: startOfMonth.toISOString().split('T')[0],
                    end: todayStr
                });
                break;
            }
            case 'last-month': {
                const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                onChange({
                    start: startOfLastMonth.toISOString().split('T')[0],
                    end: endOfLastMonth.toISOString().split('T')[0]
                });
                break;
            }
        }
    };

    const presetLabels: Record<DatePreset, string> = {
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
        'last-month': 'Last Month'
    };

    return (
        <div className={styles.dateRangeFilter}>
            <div className={styles.presetButtons}>
                {presets.map((preset) => (
                    <Button
                        key={preset}
                        variant={activePreset === preset ? 'primary' : 'secondary'}
                        onClick={() => handlePresetClick(preset)}
                    >
                        {presetLabels[preset]}
                    </Button>
                ))}
                {showCustomRange && (
                    <Button
                        variant={activePreset === 'range' ? 'primary' : 'secondary'}
                        onClick={() => setActivePreset('range')}
                    >
                        Custom Range
                    </Button>
                )}
            </div>

            {(activePreset === 'range' || showCustomRange) && (
                <div className={styles.customRange}>
                    <input
                        type="date"
                        value={value.start}
                        onChange={(e) => onChange({ ...value, start: e.target.value })}
                        onClick={(e) => e.currentTarget.showPicker()}
                        className={styles.dateInput}
                        aria-label="Start date"
                    />
                    <span className={styles.separator}>to</span>
                    <input
                        type="date"
                        value={value.end}
                        onChange={(e) => onChange({ ...value, end: e.target.value })}
                        onClick={(e) => e.currentTarget.showPicker()}
                        className={styles.dateInput}
                        aria-label="End date"
                    />
                </div>
            )}
        </div>
    );
}

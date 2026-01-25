import React from 'react';
import styles from './DataTable.module.css';
import { LoadingIndicator } from '../ui/LoadingIndicator';

export interface ColumnDef<T> {
    key: string;
    header: string;
    render?: (value: any, row: T) => React.ReactNode;
    sortable?: boolean;
}

export interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    actions?: (row: T) => React.ReactNode;
    loading?: boolean;
    emptyMessage?: string;
    keyExtractor: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    actions,
    loading = false,
    emptyMessage = 'No data available',
    keyExtractor
}: DataTableProps<T>) {
    if (loading) {
        return <LoadingIndicator label="Loading data..." />;
    }

    if (data.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className={col.sortable ? styles.sortable : ''}>
                                {col.header}
                            </th>
                        ))}
                        {actions && <th className={styles.actionsHeader}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr key={keyExtractor(row)}>
                            {columns.map((col) => (
                                <td key={col.key} data-label={col.header}>
                                    {col.render
                                        ? col.render(row[col.key], row)
                                        : row[col.key]}
                                </td>
                            ))}
                            {actions && (
                                <td data-label="Actions" className={styles.actionsCell}>
                                    <div className={styles.actions}>{actions(row)}</div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

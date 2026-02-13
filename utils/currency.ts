export const formatCurrency = (value: number | string) => {
    if (!value) return '';
    // Convert to number, preserving decimals
    const number = typeof value === 'number' ? value : Number(value.toString().replace(/[^\d.-]/g, ''));
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
};

export const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, ''));
};

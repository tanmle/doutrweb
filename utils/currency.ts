export const formatCurrency = (value: number | string) => {
    if (!value) return '';
    // Convert to number, preserving decimals
    const number = typeof value === 'number' ? value : Number(value.toString().replace(/[^\d.-]/g, ''));
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
};

export const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, ''));
};

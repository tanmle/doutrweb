export const formatCurrency = (value: number | string) => {
    if (!value) return '';
    const number = Number(value.toString().replace(/\D/g, ''));
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
};

export const parseCurrency = (value: string) => {
    return Number(value.replace(/\D/g, ''));
};

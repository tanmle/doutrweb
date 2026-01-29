/**
 * Type definitions for sales page
 */

export interface Shop {
    id: string;
    name: string;
    owner_id: string;
}

export interface Product {
    id: string;
    name: string;
    sku?: string;
    base_price: number;
    selling_price: number;
    type?: 'company' | 'self_researched';
}

export interface CommissionRate {
    id: string;
    level: number;
    type: 'company' | 'self_researched';
    profit_threshold: number;
    commission_percent: number;
}

export interface Profile {
    id: string;
    full_name: string | null;
    email: string;
    role?: 'admin' | 'leader' | 'member';
}

export interface SalesRecordWithRelations {
    id: string;
    shop_id: string;
    product_id?: string;
    order_id?: string;
    order_status?: string;
    order_substatus?: string;
    sku_id?: string;
    seller_sku?: string;
    tracking_id?: string;
    date: string;
    items_sold: number;
    revenue: number;
    profit: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at?: string;
    raw_data?: any;
    shop: {
        id: string;
        name: string;
        owner_id: string;
        profiles: Profile | Profile[];
    } | null;
    product: Product | null;
}

export interface SalesFormData {
    shopId: string;
    date: string;
    productId: string;
    quantity: string;
    price: string;
}

export interface SalesItem {
    productId: string;
    quantity: string;
    price: string;
}

export type DateFilterType = 'today' | 'this_month' | 'last_month' | 'range';

export interface DateRange {
    start: string;
    end: string;
}

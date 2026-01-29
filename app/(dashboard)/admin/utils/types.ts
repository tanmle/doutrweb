/**
 * Type definitions for the admin panel
 */

export type Tab = 'products' | 'users' | 'fees' | 'monthly_fees' | 'configuration' | 'payroll';
export type FeeFilter = 'all' | 'today' | 'this_month' | 'last_month' | 'range';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  base_price: number;
  selling_price: number;
  type?: 'company' | 'self_researched';
  owner_id?: string;
  in_stock?: boolean;
  stock_quantity?: number;
  created_at: string;
  variation?: string;
  image_url?: string;
  owner_profile?: {
    full_name: string;
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'leader' | 'member';
  leader_id?: string;
  bank_name?: string;
  bank_number?: string;
  base_salary?: number;
  created_at: string;
  leader?: {
    full_name: string;
  };
}

export interface SellingFee {
  id: string;
  name: string;
  price: number;
  owner_id?: string;
  date: string;
  note?: string;
  owner_profile?: {
    full_name: string;
  };
}

export interface MonthlyFee {
  id: string;
  name: string;
  price: number;
  owner_id?: string;
  date: string;
  note?: string;
  owner_profile?: {
    full_name: string;
  };
}

export interface Profile {
  id: string;
  full_name?: string;
  email: string;
  role: 'admin' | 'leader' | 'member';
  bank_name?: string;
  bank_number?: string;
  base_salary?: number;
}

export interface PayrollRecord {
  id: string;
  user_id: string;
  month: string;
  standard_work_days: number;
  actual_work_days: number;
  bonus: number;
  total_salary: number;
  status: 'pending' | 'paid';
  user?: {
    full_name: string;
    email: string;
    role?: string;
    bank_name?: string;
    bank_number?: string;
    base_salary?: number;
  };
}

export interface CommissionRate {
  id: string;
  level: number;
  type: 'company' | 'self_researched';
  profit_threshold: number;
  commission_percent: number;
}

export interface FormData {
  [key: string]: any;
}

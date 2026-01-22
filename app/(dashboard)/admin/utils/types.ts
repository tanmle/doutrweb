/**
 * Type definitions for the admin panel
 */

export type Tab = 'products' | 'users' | 'fees' | 'configuration';
export type FeeFilter = 'all' | 'today' | 'this_month' | 'last_month' | 'range';

export interface Product {
  id: string;
  name: string;
  base_price: number;
  selling_price: number;
  type?: 'company' | 'self_researched';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'leader' | 'member';
  leader_id?: string;
  created_at: string;
  leader?: {
    full_name: string;
  };
}

export interface Fee {
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

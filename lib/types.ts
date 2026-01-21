export type Role = 'admin' | 'leader' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  basePrice: number;
  sellingFee: number;
  salary: number; // For team member
  otherFee?: number;
}

export interface Shop {
  id: string;
  name: string;
  ownerId: string; // User ID
  platform: 'tiktok';
  status: 'active' | 'inactive';
}

export interface SaleRecord {
  id: string;
  shopId: string;
  date: string; // ISO Date
  revenue: number;
  profit: number;
  itemsSold: number;
}

export interface TeamStats {
  totalIncome: number;
  missingIncome: number;
  commission: number;
  targetKPI: number;
  currentKPI: number;
}

import React from 'react';
import { createClient } from '@/utils/supabase/client';

type SupabaseClient = ReturnType<typeof createClient>;

// Cached data fetching functions using React.cache
export const cachedGetUser = React.cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data;
});

export const cachedGetProfile = React.cache(async (supabase: SupabaseClient, userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
});

export const cachedGetShops = React.cache(async (
  supabase: SupabaseClient,
  options?: {
    status?: string;
    ownerId?: string;
    limit?: number;
    offset?: number;
  }
) => {
  let query = supabase
    .from('shops')
    .select('*, owner:profiles!owner_id(id, full_name, email, role)');

  if (options?.status && options.status !== 'all') {
    if (options.status === 'archived') {
      query = query.eq('status', 'archived');
    } else {
      query = query.eq('status', options.status);
    }
  } else if (options?.status !== 'all') {
    query = query.neq('status', 'archived');
  }

  if (options?.ownerId) {
    query = query.eq('owner_id', options.ownerId);
  }

  const { data, error } = await query.order('name');

  if (options?.limit || options?.offset) {
    const from = options?.offset || 0;
    const to = (options?.offset || 0) + (options?.limit || 10) - 1;
    const { data: paginatedData, error: paginationError } = await query.range(from, to);
    if (paginationError) throw paginationError;
    return paginatedData;
  }
  if (error) throw error;
  return data;
});

export const cachedGetProfiles = React.cache(async (
  supabase: SupabaseClient,
  options?: {
    role?: string;
    status?: string;
    leaderId?: string;
  }
) => {
  let query = supabase
    .from('profiles')
    .select('id, full_name, email, role');

  if (options?.role) {
    query = query.eq('role', options.role);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.leaderId) {
    query = query.or(`id.eq.${options.leaderId},leader_id.eq.${options.leaderId}`);
  }

  if (options?.role && options.role === 'admin') {
    query = query.neq('role', 'admin');
  }

  const { data, error } = await query.order('full_name');
  if (error) throw error;
  return data;
});

export const cachedGetSalesRecords = React.cache(async (
  supabase: SupabaseClient,
  options?: {
    shopId?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }
) => {
  let query = supabase
    .from('sales_records')
    .select(`
      created_at,
      date, 
      revenue, 
      profit, 
      items_sold,
      order_id,
      status,
      product_id,
      quantity,
      price,
      shop:shops!inner(
        id,
        name, 
        owner_id, 
        owner:profiles!owner_id(full_name, role)
      ),
      product:products!inner(
        name,
        sku
      )
    `);

  if (options?.shopId) {
    query = query.eq('shop_id', options.shopId);
  }

  if (options?.dateRange) {
    query = query
      .gte('date', options.dateRange.start)
      .lte('date', options.dateRange.end);
  }

  const result = await query.order('date', { ascending: false });
  
  if (result.error) throw result.error;

  if (options?.limit || options?.offset) {
    const from = options?.offset || 0;
    const to = (options?.offset || 0) + (options?.limit || 10) - 1;
    const paginatedResult = await query.range(from, to);
    if (paginatedResult.error) throw paginatedResult.error;
    return { data: paginatedResult.data, count: result.count };
  }

  return { data: result.data, count: result.count };
});

export const cachedGetPayouts = React.cache(async (
  supabase: SupabaseClient,
  options?: {
    dateRange?: { start: string; end: string };
    shopId?: string;
    ownerId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
) => {
  let query = supabase
    .from('payout_records')
    .select(`
      *,
      shop:shops!inner(
        id,
        name,
        owner_id,
        owner:profiles!owner_id(id, full_name, email)
      )
    `);

  if (options?.dateRange) {
    query = query
      .gte('statement_date', options.dateRange.start)
      .lte('statement_date', options.dateRange.end);
  }

  if (options?.shopId) {
    query = query.eq('shop_id', options.shopId);
  }

  if (options?.ownerId) {
    query = query.eq('shop.owner_id', options.ownerId);
  }

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  const result = await query.order('statement_date', { ascending: false });
  
  if (result.error) throw result.error;

  if (options?.limit || options?.offset) {
    const from = options?.offset || 0;
    const to = (options?.offset || 0) + (options?.limit || 10) - 1;
    const paginatedResult = await query.range(from, to);
    if (paginatedResult.error) throw paginatedResult.error;
    return { data: paginatedResult.data, count: result.count };
  }

  return { data: result.data, count: result.count };
});
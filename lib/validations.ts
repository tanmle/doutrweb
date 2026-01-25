import { z } from 'zod';

/**
 * Validation schemas for server actions
 */

export const createUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    full_name: z.string().min(1, 'Full name is required'),
    role: z.enum(['admin', 'leader', 'member'], {
        message: 'Invalid role'
    }),
    leader_id: z.string().uuid().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    bank_number: z.string().optional().nullable(),
    base_salary: z.number().min(0, 'Base salary must be positive').optional().nullable(),
});

export const updateUserSchema = z.object({
    id: z.string().uuid('Invalid user ID'),
    full_name: z.string().min(1, 'Full name is required').optional(),
    role: z.enum(['admin', 'leader', 'member']).optional(),
    leader_id: z.string().uuid().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    bank_number: z.string().optional().nullable(),
    base_salary: z.number().min(0).optional().nullable(),
});

export const createProductSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().optional().nullable(),
    base_price: z.number().min(0, 'Base price must be positive'),
    selling_price: z.number().min(0, 'Selling price must be positive'),
    type: z.enum(['company', 'self_researched']).optional(),
    owner_id: z.string().uuid().optional().nullable(),
});

export const createSalesRecordSchema = z.object({
    shop_id: z.string().uuid('Invalid shop ID'),
    product_id: z.string().uuid('Invalid product ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    items_sold: z.number().int().min(1, 'Items sold must be at least 1'),
    revenue: z.number().min(0, 'Revenue must be positive'),
    profit: z.number(),
    created_by: z.string().uuid('Invalid user ID'),
    status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateSalesRecordInput = z.infer<typeof createSalesRecordSchema>;

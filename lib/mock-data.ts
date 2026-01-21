import { User, Shop, TeamStats } from './types';

export const mockUsers: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@doutr.com', role: 'admin' },
  { id: '2', name: 'Team Leader', email: 'leader@doutr.com', role: 'leader' },
  { id: '3', name: 'Team Member', email: 'member@doutr.com', role: 'member' },
];

export const mockShops: Shop[] = [
  { id: 's1', name: 'Fashion Boutique', ownerId: '2', platform: 'tiktok', status: 'active' },
  { id: 's2', name: 'Gadget Store', ownerId: '3', platform: 'tiktok', status: 'active' },
];

export const mockStats: TeamStats = {
  totalIncome: 125000,
  missingIncome: 5000,
  commission: 12000,
  targetKPI: 150000,
  currentKPI: 125000,
};

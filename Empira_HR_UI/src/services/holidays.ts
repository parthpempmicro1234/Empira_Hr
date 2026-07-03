import { api } from './api';

export interface Holiday {
  id: number;
  name: string;
  date: string;
  business_unit: number;
  business_unit_name: string;
  is_active: boolean;
}

export async function getHolidays(year?: number): Promise<Holiday[]> {
  const params = year != null ? { date__year: year } : undefined;
  const res = await api.get<Holiday[]>('org/holidays/', { params });
  const data = res.data;
  return Array.isArray(data) ? data : [];
}

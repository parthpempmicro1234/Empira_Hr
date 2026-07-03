import { api } from './api';

export interface ZipcodeCity {
  city_id: number;
  city: string;
}

export interface ZipcodeLookupResponse {
  zipcode: string;
  country: string;
  country_id: number;
  state: string;
  state_id: number;
  district?: string;
  count?: number;
  cities: ZipcodeCity[];
}

export async function lookupZipcode(code: string): Promise<ZipcodeLookupResponse> {
  const res = await api.get<ZipcodeLookupResponse>('/api/zipcode', { params: { code } });
  return res.data;
}


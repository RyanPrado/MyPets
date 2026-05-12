import type { Species } from '@/lib/constants/species';

export type Pet = {
  id: number;
  name: string;
  species: Species;
  birth_date: string | null;
  photo_uri: string | null;
  created_at: string;
};

import type { Species } from '@/lib/constants/species';

export type Pet = {
  id: number;
  name: string;
  species: Species;
  birth_date: string | null;
  photo_uri: string | null;
  created_at: string;
};

export type Vaccine = {
  id: number;
  pet_id: number;
  name: string;
  date_given: string;
  amount_paid_cents: number | null;
  next_due_date: string | null;
  created_at: string;
};

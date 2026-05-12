export const SPECIES = [
  'Cão',
  'Gato',
  'Coelho',
  'Hamster',
  'Cobaia',
  'Rato',
  'Furão',
  'Periquito',
  'Canário',
  'Papagaio',
  'Tartaruga',
  'Iguana',
  'Cobra',
  'Peixe',
  'Outro',
] as const;

export type Species = (typeof SPECIES)[number];

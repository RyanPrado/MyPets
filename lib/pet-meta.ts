export function calculateAgeInYears(
  birthDate: string | null,
  now: Date = new Date()
): number | null {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;

  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  const dayDiff = now.getDate() - parsed.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatAgeLabel(birthDate: string | null, now?: Date): string | null {
  const years = calculateAgeInYears(birthDate, now);
  if (years === null) return null;
  if (years === 0) return 'menos de 1 ano';
  if (years === 1) return '1 ano';
  return `${years} anos`;
}

export function formatPetMeta(species: string, birthDate: string | null, now?: Date): string {
  const age = formatAgeLabel(birthDate, now);
  return age ? `${species} · ${age}` : species;
}

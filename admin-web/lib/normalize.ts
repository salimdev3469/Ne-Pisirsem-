const TURKISH_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u'
};

export function normalizeText(input: string): string {
  const lower = input.toLowerCase().trim();
  const ascii = [...lower].map((char) => TURKISH_MAP[char] ?? char).join('');

  return ascii
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function ingredientIdFromName(name: string): string {
  const normalized = normalizeText(name).replace(/\s+/g, '_');
  return normalized.startsWith('ing_') ? normalized : `ing_${normalized}`;
}

export function mealTypeIdFromName(name: string): string {
  const normalized = normalizeText(name).replace(/\s+/g, '_');
  return normalized.startsWith('meal_') ? normalized : `meal_${normalized}`;
}

export function splitDelimitedList(value: string, delimiters: RegExp = /[|,;]/): string[] {
  return value
    .split(delimiters)
    .map((item) => item.trim())
    .filter(Boolean);
}

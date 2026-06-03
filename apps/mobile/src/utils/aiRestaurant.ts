export interface ParsedRestaurant {
  name: string;
  shopId?: number;
  raw: string;
}

function extractShopId(text: string): number | undefined {
  const match =
    text.match(/shopId\s*[:：]\s*(\d+)/i) ||
    text.match(/\[id[:\s]*(\d+)\]/i) ||
    text.match(/\(id[:\s]*(\d+)\)/i);
  if (!match) return undefined;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) ? id : undefined;
}

function extractNameFromBlock(text: string): string {
  const firstLine =
    text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0) || '';

  return firstLine
    .replace(/^🍽️?\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/shopId\s*[:：]\s*\d+/gi, '')
    .replace(/\[id[:\s]*\d+\]/gi, '')
    .replace(/\(id[:\s]*\d+\)/gi, '')
    .trim();
}

function blockToRestaurant(raw: string): ParsedRestaurant | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const name = extractNameFromBlock(trimmed);
  if (!name || name.length < 2) return null;
  return { name, shopId: extractShopId(trimmed), raw: trimmed };
}

/** 解析 AI 回复中的结构化餐厅推荐 */
export function parseRestaurants(text: string): { intro: string; restaurants: ParsedRestaurant[] } {
  if (!text?.trim()) return { intro: '', restaurants: [] };

  let intro = '';
  let restaurants: ParsedRestaurant[] = [];

  if (text.includes('🍽️')) {
    const parts = text.split(/(?=🍽️)/);
    intro = parts[0]?.trim() || '';
    restaurants = parts
      .slice(1)
      .map(blockToRestaurant)
      .filter((r): r is ParsedRestaurant => r !== null);
  } else {
    const regex = /\*\*([^*]+)\*\*([\s\S]*?)(?=\n\*\*[^*]+\*\*|$)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const raw = `🍽️ **${match[1]}**${match[2]}`;
      if (!/📍|地址/.test(raw)) continue;
      const parsed = blockToRestaurant(raw);
      if (parsed) restaurants.push(parsed);
    }
    if (restaurants.length > 0) {
      const firstRaw = restaurants[0].raw;
      const idx = text.indexOf(firstRaw.replace(/^🍽️\s*/, ''));
      intro = idx > 0 ? text.slice(0, idx).trim() : '';
    }
  }

  return { intro, restaurants };
}

export function normalizeShopName(name: string): string {
  return name.replace(/[^一-龥a-zA-Z0-9·]/g, '').trim();
}

export function shopSearchKeywords(name: string): string[] {
  const base = normalizeShopName(name);
  const parts = base.split('·').map((p) => p.trim()).filter((p) => p.length >= 2);
  const keywords = [base, ...parts];
  if (base.length >= 4) keywords.push(base.slice(0, 4));
  return [...new Set(keywords)];
}

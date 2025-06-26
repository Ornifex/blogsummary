// types.ts
export const CLASSES = [
  "Warrior", "Mage", "Rogue", "Priest", "Paladin", "Hunter", "Warlock",
  "Death Knight", "Druid", "Monk", "Evoker", "Demon Hunter"
] as const;
export type Classes = typeof CLASSES[number];

export const CONTENT_TYPES = [
  "Delves", "Raiding", "M+", "PvP", "Open World"
] as const;
export type ContentType = typeof CONTENT_TYPES[number];

export const EXPANSIONS = [
  "Dragonflight", "Shadowlands", "Legion", "BfA", "Warlords of Draenor",
  "Mists of Pandaria", "Cataclysm", "Wrath of the Lich King", "The Burning Crusade", "Vanilla"
] as const;
export type Expansion = typeof EXPANSIONS[number];

export interface BlogSummary {
  id: string;
  title: string;
  date: string;
  original_url: string;
  source?: string;
  summaries?: {
    [K in "General" | Classes | ContentType]?: {
      summary: string;
      word_stats: {
        original: number;
        summary: number;
        reduction_percent: number;
      };
    }
  };
}
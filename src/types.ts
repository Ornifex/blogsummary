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
  summary: string;
  original_url: string;
  word_stats: {
    original: number;
    summary: number;
    reduction_percent: number;
  };
  source?: string;
  classSummaries?: {
    [K in Classes]?: {
      summary: string;
      word_stats: {
        original: number;
        summary: number;
        reduction_percent: number;
      };
    }
  };
  contentTypeSummaries?: {
    [K in ContentType]?: {
      summary: string;
      word_stats: {
        original: number;
        summary: number;
        reduction_percent: number;
      };
    }
  };
}
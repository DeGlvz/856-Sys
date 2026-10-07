export type AliasQuality = 'good' | 'low' | 'unclassified';
export type SubjectKind = 'individual' | 'entity';
export type MatchClass = 'CLEAR' | 'POTENTIAL MATCH' | 'LIKELY MATCH' | 'CONFIRMED MATCH';

export interface ListAlias {
  name: string;
  quality: AliasQuality;
  type?: string; // aka / fka / nka / original script
}

export interface ListEntity {
  id: string;            // identificador en la lista (ent_num, DATAID, LogicalId…)
  source: string;        // código de lista (OFAC_SDN, UN, EU…)
  type: 'individual' | 'entity' | 'vessel' | 'aircraft' | 'unknown';
  name: string;
  aliases: ListAlias[];
  dob: string[];
  nationality: string[];
  documents: string[];
  programs: string[];
  remarks?: string;
  url?: string;
}

export interface DatasetMeta {
  code: string;
  name: string;
  authority: string;
  url: string;
  format: string;
  parser: string;
  refresh: string;
  downloaded_at: string | null;
  sha256: string | null;
  source_version: string | null;
  entities: number;
  errors: string[];
  status: 'ok' | 'error' | 'pending' | 'live';
  files?: { url: string; sha256: string; bytes: number }[];
  parse_ms?: number;
}

export interface ScreeningQuery {
  kind: SubjectKind;
  name: string;
  aliases?: string[];
  dob?: string;          // YYYY o YYYY-MM-DD
  nationality?: string;
  documents?: string[];
  lists?: string[];      // subconjunto de códigos; vacío = todas
}

export interface MatchDetail {
  subject_name: string;
  query_variant: string;
  alias_detected: string;
  alias_quality: AliasQuality | 'primary';
  list_matched: string;
  list_authority: string;
  list_entity_id: string;
  list_entity_name: string;
  entity_type: string;
  match_type: 'exacto' | 'fonético' | 'fuzzy' | 'transliteración' | 'documento';
  score: number;
  score_base: number;
  components: { jaro_winkler: number; soundex: number; levenshtein_norm: number; metaphone: number; nysiis: number };
  adjustments: { reason: string; delta: number }[];
  classification: MatchClass;
  corroboration: string[];
  programs: string[];
  dob: string[];
  nationality: string[];
  source_url: string;
  source_version: string | null;
  dataset_sha256: string | null;
  consulted_at: string;
}

export interface ScreeningResult {
  query: ScreeningQuery;
  normalized: { variant: string; normalized: string; canonical: string; transliteration: string[] }[];
  consulted_at: string;
  lists: (DatasetMeta & { result: MatchClass; best_score: number | null })[];
  matches: MatchDetail[];
  overall: MatchClass;
  thresholds: Thresholds;
  clause: string;
  limitations: string[];
}

export interface Thresholds {
  potential: number;
  likely: number;
  confirmed: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { potential: 60, likely: 80, confirmed: 95 };

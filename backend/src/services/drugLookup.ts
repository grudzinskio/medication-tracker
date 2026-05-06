/**
 * OpenFDA drug label search → catalog-shaped suggestions for Medications table.
 * https://open.fda.gov/apis/drug/label/
 */

const OPENFDA_BASE = 'https://api.fda.gov/drug/label.json';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_QUERY_LEN = 2;
const MAX_QUERY_LEN = 80;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_RESULTS = 15;

type CacheEntry = { at: number; results: DrugLookupSuggestion[] };
const cache = new Map<string, CacheEntry>();

export type DrugLookupSuggestion = {
  DrugName: string;
  GenericName: string;
  Form: string;
  Route: string;
  Manufacturer: string;
  UnitType: string;
};

function titleCaseWords(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function mapDosageFormToForm(raw: string | undefined): string {
  if (!raw) return 'Other';
  const u = raw.toUpperCase();
  if (u.includes('TABLET')) return 'Tablet';
  if (u.includes('CAPSULE')) return 'Capsule';
  if (u.includes('INJECTION') || u.includes('SOLUTION') || u.includes('POWDER')) return 'Injection';
  if (u.includes('PATCH')) return 'Patch';
  if (u.includes('CREAM') || u.includes('OINTMENT')) return 'Cream';
  if (u.includes('INHAL')) return 'Inhaler';
  if (u.includes('LIQUID') || u.includes('SYRUP')) return 'Liquid';
  return 'Other';
}

function mapRoute(raw: string | undefined): string {
  if (!raw) return 'Other';
  const u = raw.toUpperCase();
  if (u.includes('ORAL')) return 'Oral';
  if (u.includes('SUBCUTANEOUS')) return 'Subcutaneous';
  if (u.includes('INTRAVENOUS') || u.includes('IV')) return 'IV';
  if (u.includes('INTRAMUSCULAR')) return 'IM';
  if (u.includes('TOPICAL')) return 'Topical';
  if (u.includes('INHALATION')) return 'Inhalation';
  if (u.includes('TRANSDERMAL')) return 'Transdermal';
  return 'Other';
}

function firstArr(val: string[] | undefined): string {
  return val?.[0]?.trim() ?? '';
}

function pickUnit(openfda: Record<string, string[] | undefined>): string {
  const u =
    firstArr(openfda.active_numerator_unit) ||
    firstArr(openfda.active_ingredient_unit) ||
    '';
  if (u) return u.length > 80 ? `${u.slice(0, 77)}…` : u;
  return 'mg';
}

export async function searchDrugLabels(query: string): Promise<DrugLookupSuggestion[]> {
  const q = query.trim().replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (q.length < MIN_QUERY_LEN || q.length > MAX_QUERY_LEN) {
    return [];
  }

  const cacheKey = q.toLowerCase();
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.results;
  }

  const escaped = q.replace(/"/g, '\\"');
  const search = `openfda.brand_name:${escaped}*`;
  const url = `${OPENFDA_BASE}?${new URLSearchParams({
    search,
    limit: String(MAX_RESULTS),
  })}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      if (res.status === 404) {
        cache.set(cacheKey, { at: Date.now(), results: [] });
        return [];
      }
      throw new Error(`OpenFDA HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      results?: Array<{ openfda?: Record<string, string[]> }>;
    };
    const rows = json.results ?? [];
    const seen = new Set<string>();
    const results: DrugLookupSuggestion[] = [];

    for (const row of rows) {
      const od = row.openfda ?? {};
      const brand = firstArr(od.brand_name) || firstArr(od.generic_name);
      const generic = firstArr(od.generic_name) || brand;
      if (!brand) continue;

      const dedupeKey = `${brand}|${generic}`.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const formRaw = firstArr(od.dosage_form);
      const routeRaw = firstArr(od.route);
      const mfg = firstArr(od.manufacturer_name) || firstArr(od.labeler_name) || '';

      results.push({
        DrugName: brand.length > 100 ? brand.slice(0, 97) + '…' : brand,
        GenericName: titleCaseWords(generic.length > 255 ? generic.slice(0, 252) + '…' : generic),
        Form: mapDosageFormToForm(formRaw),
        Route: mapRoute(routeRaw),
        Manufacturer: mfg.length > 255 ? mfg.slice(0, 252) + '…' : mfg,
        UnitType: pickUnit(od as Record<string, string[] | undefined>),
      });

      if (results.length >= MAX_RESULTS) break;
    }

    cache.set(cacheKey, { at: Date.now(), results });
    return results;
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === 'AbortError') {
      throw new Error('Drug lookup timed out');
    }
    throw e;
  }
}

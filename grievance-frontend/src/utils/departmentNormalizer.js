/**
 * Dynamic Department Normalizer
 *
 * Provides generic, zero-hardcoding normalization of department names.
 * Handles:
 * - Case differences (e.g. "School of law" vs "School of Law")
 * - Ampersand vs "and" with any spacing (e.g. "Design&Innovation", "Design & Innovation", "Design and Innovation")
 * - Multiple consecutive spaces and leading/trailing whitespace
 */

/**
 * Generates a canonical search key from any department string.
 * Generic regex: \s*&\s* becomes " and ", all whitespace collapsed to single space, lowercase.
 */
export const normalizeDeptKey = (name) => {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Builds a Map of normalizedKey -> officialDepartmentName from the official departments list.
 * officialList can be an array of strings or objects ({ name }).
 */
export const buildOfficialDeptMap = (officialList = []) => {
  const map = new Map();
  if (!Array.isArray(officialList)) return map;

  for (const item of officialList) {
    const name = typeof item === "string" ? item.trim() : (item?.name || "").trim();
    if (!name) continue;
    const key = normalizeDeptKey(name);
    if (!map.has(key)) {
      map.set(key, name);
    }
  }
  return map;
};

/**
 * Returns the canonical department name for a raw department string.
 * If matched against officialDeptMap, returns the official formatted name.
 * If not in officialDeptMap, cleans multiple spaces and returns trimmed string.
 */
export const canonicalizeDepartment = (rawName, officialDeptMap = new Map()) => {
  if (!rawName) return "";
  const cleaned = String(rawName).replace(/\s+/g, " ").trim();
  const key = normalizeDeptKey(cleaned);
  if (officialDeptMap && officialDeptMap.has(key)) {
    return officialDeptMap.get(key);
  }
  return cleaned;
};

/**
 * Combines raw department values and official departments into a clean,
 * deduplicated, sorted list with 1 entry per department.
 */
export const getCleanDepartmentList = (rawList = [], officialList = []) => {
  const officialMap = buildOfficialDeptMap(officialList);
  const uniqueMap = new Map(); // normalizedKey -> bestDisplayName

  // 1. Add all official departments first
  for (const [key, officialName] of officialMap.entries()) {
    uniqueMap.set(key, officialName);
  }

  // 2. Process all raw/existing departments (e.g., from staff records or database)
  const candidateItems = Array.isArray(rawList) ? rawList : [];
  for (const item of candidateItems) {
    const raw = typeof item === "string" ? item.trim() : (item?.name || "").trim();
    if (!raw) continue;
    const key = normalizeDeptKey(raw);
    if (!key) continue;

    if (!uniqueMap.has(key)) {
      // Unlisted department (e.g. "Sports", "Examination Section")
      // Clean consecutive spaces
      const cleanDisplay = raw.replace(/\s+/g, " ").trim();
      uniqueMap.set(key, cleanDisplay);
    }
  }

  // 3. Return alphabetically sorted unique departments
  return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
};

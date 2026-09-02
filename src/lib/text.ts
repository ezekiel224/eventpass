export function normalizePersonName(value: string) {
  return value.normalize("NFC").trim();
}

export function foldForSearch(value: string) {
  return value.normalize("NFKD").replace(/\p{M}+/gu, "").toLocaleLowerCase().trim();
}


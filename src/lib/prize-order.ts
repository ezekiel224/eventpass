const prizeNameCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base"
});

type NamedPrize = {
  id?: string;
  name: string;
};

export function comparePrizeNames(left: NamedPrize, right: NamedPrize) {
  const nameOrder = prizeNameCollator.compare(left.name.trim(), right.name.trim());
  if (nameOrder !== 0) return nameOrder;
  return (left.id ?? "").localeCompare(right.id ?? "");
}

export function sortPrizesByName<T extends NamedPrize>(prizes: readonly T[]) {
  return [...prizes].sort(comparePrizeNames);
}

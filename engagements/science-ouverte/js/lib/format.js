// Mise en forme des nombres à la québécoise (espace fine insécable, virgule décimale).

const formatters = new Map();

export function formatNumber(value, decimals = 0) {
  if (!formatters.has(decimals)) {
    formatters.set(decimals, new Intl.NumberFormat('fr-CA', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }));
  }
  return formatters.get(decimals).format(value);
}

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

export const formatMoney = (value: number) => moneyFormatter.format(value);
export const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits }).format(
    value,
  );
export const formatScientific = (value: number) =>
  value === 0 ? "0" : value.toExponential(5).replace(".", ",");
export const formatCompact = (value: number) => {
  if (value >= 1e9) return `$ ${formatNumber(value / 1e9, 1)} mil M`;
  if (value >= 1e6) return `$ ${formatNumber(value / 1e6, 1)} M`;
  if (value >= 1e3) return `$ ${formatNumber(value / 1e3, 0)} mil`;
  return `$ ${formatNumber(value, 0)}`;
};

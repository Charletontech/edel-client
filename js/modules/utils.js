window.EdelModules = window.EdelModules || {};

window.EdelModules.utils = {
  formatCurrency(value, currencySymbol = "N") {
    return `${currencySymbol}${value}`;
  },
};

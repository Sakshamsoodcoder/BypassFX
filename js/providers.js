// providers.js — hardcoded fee config (data, not logic)

export const PROVIDERS = [
  { name: 'Wise', feePercent: 0.005, feeFixed: 0 },
  { name: 'PayPal', feePercent: 0.035, feeFixed: 0 },
  { name: 'Bank wire', feePercent: 0.01, feeFixed: 20 },
];

// Currencies allowed as INTERMEDIATE hops only — keeps the pathfinder's
// search space bounded. See graphBuilder.js.
export const HUB_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD',
];

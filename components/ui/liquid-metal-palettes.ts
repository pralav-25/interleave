export type LiquidMetalVariant = 'chrome' | 'gold' | 'mercury' | 'oil';

export const FALLBACK_SURFACE: Record<LiquidMetalVariant, string> = {
  chrome:
    'conic-gradient(from 210deg at 50% 50%, #0b0d10, #8f9aa8, #e9eef5, #6f7b8c, #cfd7e2, #14181d, #b9c3cf, #0b0d10)',
  gold: 'conic-gradient(from 210deg at 50% 50%, #3a2708, #b3832a, #f6dd8f, #8a5f16, #ffeeb5, #2a1c05, #d9a842, #3a2708)',
  mercury:
    'conic-gradient(from 200deg at 50% 50%, #10141a, #7f8b99, #dbe4ee, #55606d, #ffffff, #1b2028, #a6b2c0, #10141a)',
  oil: 'conic-gradient(from 190deg at 50% 50%, #1b1035, #3f7fd6, #38d0c0, #b9e05f, #f2a03d, #e0509b, #6b3fd6, #1b1035)',
};

export const TEXT_SURFACE: Record<LiquidMetalVariant, string> = {
  chrome:
    'linear-gradient(100deg, #8a96a6 0%, #e9eef5 16%, #9aa6b6 32%, #ffffff 46%, #8f9bab 62%, #dfe6ef 78%, #8591a1 100%)',
  gold: 'linear-gradient(100deg, #7a5410 0%, #f6dd8f 16%, #b3832a 32%, #fff6d0 46%, #8a5f16 62%, #edc862 78%, #6a460b 100%)',
  mercury:
    'linear-gradient(100deg, #55606d 0%, #dbe4ee 16%, #8f9aa8 32%, #ffffff 46%, #6b7684 62%, #cfd9e5 78%, #454f5b 100%)',
  oil: 'linear-gradient(100deg, #3f7fd6 0%, #38d0c0 16%, #b9e05f 32%, #f2a03d 46%, #e0509b 62%, #6b3fd6 78%, #3f7fd6 100%)',
};

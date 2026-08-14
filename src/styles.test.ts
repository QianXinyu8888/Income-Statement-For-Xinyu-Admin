/// <reference types="vite/client" />

import styles from './styles.css?raw';
import { describe, expect, it } from 'vitest';

describe('responsive transaction toolbar styles', () => {
  it('lets the 320px toolbar shrink without widening the page', () => {
    const compactMobileStart = styles.indexOf('@media (max-width: 360px)');
    const finalMobileStart = styles.lastIndexOf('@media (max-width: 680px)');

    expect(compactMobileStart).toBeGreaterThanOrEqual(0);
    expect(compactMobileStart).toBeGreaterThan(finalMobileStart);

    const compactMobileStyles = styles.slice(compactMobileStart);
    expect(compactMobileStyles).toMatch(/\.toolbar\s*{[^}]*min-width:\s*0[^}]*width:\s*100%/);
    expect(compactMobileStyles).toMatch(/\.search-box\s*{[^}]*min-width:\s*0/);
    expect(compactMobileStyles).toMatch(
      /\.reset-button\s*{[^}]*width:\s*44px[^}]*flex:\s*0 0 44px[^}]*font-size:\s*0/,
    );
  });
});

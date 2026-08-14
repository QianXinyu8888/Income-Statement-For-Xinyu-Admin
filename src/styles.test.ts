import { afterEach, describe, expect, it } from 'vitest';
import './styles.css';

describe('overview monthly chart styles', () => {
  afterEach(() => document.body.replaceChildren());

  it('keeps the scroll wrapper and stacked month metadata in the computed styles', () => {
    document.body.innerHTML = `
      <div class="simple-chart-wrapper">
        <div class="simple-chart">
          <div class="simple-chart__item">
            <div class="simple-chart__plot">
              <i class="bar-positive"></i>
              <i class="bar-negative"></i>
            </div>
            <div class="simple-chart__info">
              <span class="simple-chart__month">2026.08</span>
              <strong class="simple-chart__amount">¥100.00</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.querySelector<HTMLElement>('.simple-chart-wrapper')!;
    const info = document.querySelector<HTMLElement>('.simple-chart__info')!;
    const styleRules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules).filter((rule): rule is CSSStyleRule => 'selectorText' in rule),
    );

    expect(getComputedStyle(wrapper).overflowX).toBe('auto');
    expect(getComputedStyle(info).display).toBe('flex');
    expect(getComputedStyle(info).flexDirection).toBe('column');
    expect(
      styleRules.some(
        (rule) =>
          rule.selectorText === '.bar-positive' &&
          rule.style.getPropertyValue('background-color') === 'var(--profit)' &&
          rule.style.getPropertyPriority('background-color') === 'important',
      ),
    ).toBe(true);
    expect(
      styleRules.some(
        (rule) =>
          rule.selectorText === '.bar-negative' &&
          rule.style.getPropertyValue('background-color') === 'var(--loss)' &&
          rule.style.getPropertyPriority('background-color') === 'important',
      ),
    ).toBe(true);
  });
});

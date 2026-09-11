import { afterEach, describe, expect, it } from 'vitest';
import './styles.css';

describe('overview monthly chart styles', () => {
  afterEach(() => document.body.replaceChildren());

  it('keeps the scroll wrapper and stacked month metadata in the computed styles', () => {
    document.body.innerHTML = `
      <section class="overview-monthly-chart">
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
      </section>
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
          rule.selectorText === '.overview-monthly-chart .bar-positive' &&
          rule.style.getPropertyValue('background-color') === 'var(--profit)' &&
          rule.style.getPropertyPriority('background-color') === '',
      ),
    ).toBe(true);
    expect(
      styleRules.some(
        (rule) =>
          rule.selectorText === '.overview-monthly-chart .bar-negative' &&
          rule.style.getPropertyValue('background-color') === 'var(--loss)' &&
          rule.style.getPropertyPriority('background-color') === '',
      ),
    ).toBe(true);
  });

  it('keeps the overview chart on its dedicated two-row grid layout', () => {
    document.body.innerHTML = `
      <section class="overview-monthly-chart">
        <div class="simple-chart-wrapper">
          <div class="simple-chart">
            <div class="simple-chart__item">
              <div class="simple-chart__plot" data-direction="positive">
                <i class="bar-positive"></i>
              </div>
              <div class="simple-chart__info">
                <span class="simple-chart__month">2026.08</span>
                <strong class="simple-chart__amount">¥100.00</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    const chart = document.querySelector<HTMLElement>('.overview-monthly-chart .simple-chart')!;
    const item = document.querySelector<HTMLElement>('.overview-monthly-chart .simple-chart__item')!;
    const plot = document.querySelector<HTMLElement>('.overview-monthly-chart .simple-chart__plot')!;

    expect(getComputedStyle(chart).height).toBe('254px');
    expect(getComputedStyle(item).display).toBe('grid');
    expect(getComputedStyle(plot).display).toBe('grid');
    expect(getComputedStyle(plot).height).toBe('184px');
  });
});

describe('mobile navigation styles', () => {
  it('replaces the bottom row with an overlay sidebar', () => {
    const mobileRules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules)
        .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
        .filter((rule) => rule.conditionText.includes('max-width: 680px'))
        .flatMap((rule) =>
          Array.from(rule.cssRules).filter(
            (nested): nested is CSSStyleRule => 'selectorText' in nested,
          ),
        ),
    );

    expect(
      mobileRules.some(
        (rule) =>
          rule.selectorText === '.bottom-nav' &&
          rule.style.getPropertyValue('display') === 'none',
      ),
    ).toBe(true);
    expect(
      mobileRules.some(
        (rule) =>
          rule.selectorText === '.mobile-sidebar' &&
          rule.style.getPropertyValue('position') === 'relative' &&
          rule.style.getPropertyValue('width') === 'min(84vw, 340px)',
      ),
    ).toBe(true);
  });
});

describe('mobile status workspace styles', () => {
  it('uses an edge-to-edge list surface instead of a floating desktop window', () => {
    const mobileRules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules)
        .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
        .filter((rule) => rule.conditionText.includes('max-width: 680px'))
        .flatMap((rule) =>
          Array.from(rule.cssRules).filter(
            (nested): nested is CSSStyleRule => 'selectorText' in nested,
          ),
        ),
    );

    expect(
      mobileRules.some(
        (rule) =>
          rule.selectorText === '.self-use-window' &&
          rule.style.getPropertyValue('border-width') === '1px 0' &&
          rule.style.getPropertyValue('box-shadow') === 'none',
      ),
    ).toBe(true);
  });
});

describe('sale dialog price input styles', () => {
  it('keeps the price input from drawing a second focus outline', () => {
    const styleRules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules).filter((rule): rule is CSSStyleRule => 'selectorText' in rule),
    );

    expect(
      styleRules.some(
        (rule) =>
          rule.selectorText === '.sale-dialog .sale-dialog__money-input input:focus' &&
          rule.style.getPropertyValue('outline') === '0',
      ),
    ).toBe(true);
  });
});

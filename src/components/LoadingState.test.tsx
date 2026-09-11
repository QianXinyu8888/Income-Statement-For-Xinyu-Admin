import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LoadingState } from './LoadingState';

afterEach(cleanup);

describe('LoadingState', () => {
  it('uses the shared theme-aware svg for the default loading state', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    expect(screen.getByRole('presentation')).toHaveClass('loading-spinner');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps a custom loading label', () => {
    render(<LoadingState label="正在加载交易" />);

    expect(screen.getByRole('status')).toHaveTextContent('正在加载交易');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from '../src/components/common/Badge';
import Button from '../src/components/common/Button';

describe('Common UI Components', () => {
  it('renders Badge with correct label and variant class', () => {
    render(<Badge variant="admin">ADMIN</Badge>);
    const badge = screen.getByText('ADMIN');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('badge-admin');
  });

  it('renders Badge for owner and viewer variants', () => {
    const { rerender } = render(<Badge variant="owner">OWNER</Badge>);
    expect(screen.getByText('OWNER').className).toContain('badge-owner');

    rerender(<Badge variant="viewer">VIEWER</Badge>);
    expect(screen.getByText('VIEWER').className).toContain('badge-viewer');
  });

  it('renders Button and handles click events', () => {
    let clicked = false;
    render(
      <Button variant="primary" onClick={() => { clicked = true; }}>
        Click Me
      </Button>
    );
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    btn.click();
    expect(clicked).toBe(true);
  });

  it('disables button when loading prop is true', () => {
    render(
      <Button variant="primary" loading>
        Save
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });
});

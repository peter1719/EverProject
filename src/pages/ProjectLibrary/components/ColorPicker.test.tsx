import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPicker } from './ColorPicker';
import { COLOR_PALETTE, COLOR_HEX_MAP } from '@/lib/constants';
import type { ProjectColor } from '@/types';

function setup(value: ProjectColor = 'indigo', onChange = vi.fn()) {
  return { onChange, ...render(<ColorPicker value={value} onChange={onChange} />) };
}

// ── rendering ────────────────────────────────────────────────────────────────

describe('ColorPicker rendering', () => {
  it('renders all 15 color buttons', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(COLOR_PALETTE.length); // 15
  });

  it('each button has an aria-label matching its color name', () => {
    setup();
    for (const color of COLOR_PALETTE) {
      expect(screen.getByRole('button', { name: color })).toBeInTheDocument();
    }
  });

  it('selected button has aria-pressed="true"', () => {
    setup('green');
    expect(screen.getByRole('button', { name: 'green' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('unselected buttons have aria-pressed="false"', () => {
    setup('green');
    const unselected = COLOR_PALETTE.filter(c => c !== 'green');
    for (const color of unselected) {
      expect(screen.getByRole('button', { name: color })).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('selected button shows a checkmark ✓', () => {
    setup('red');
    const selectedBtn = screen.getByRole('button', { name: 'red' });
    expect(selectedBtn).toHaveTextContent('✓');
  });

  it('unselected buttons have no checkmark', () => {
    setup('indigo');
    const unselected = screen.getByRole('button', { name: 'green' });
    expect(unselected).not.toHaveTextContent('✓');
  });

  it('selected button has white border class', () => {
    setup('indigo');
    const btn = screen.getByRole('button', { name: 'indigo' });
    expect(btn.className).toContain('border-on-surface');
  });

  it('unselected buttons have transparent border', () => {
    setup('indigo');
    const btn = screen.getByRole('button', { name: 'green' });
    expect(btn.className).toContain('border-transparent');
  });

  it("button background matches COLOR_HEX_MAP for each color", () => {
    setup('indigo');
    // jsdom normalises hex colours to rgb() in style.backgroundColor,
    // so compare against the rgb form derived from the hex value.
    function hexToRgb(hex: string): string {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    for (const color of COLOR_PALETTE) {
      const btn = screen.getByRole('button', { name: color }) as HTMLButtonElement;
      expect(btn.style.backgroundColor).toBe(hexToRgb(COLOR_HEX_MAP[color]));
    }
  });
});

// ── interaction ──────────────────────────────────────────────────────────────

describe('ColorPicker interaction', () => {
  it('calls onChange with the clicked color', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('indigo');
    await user.click(screen.getByRole('button', { name: 'green' }));
    expect(onChange).toHaveBeenCalledWith('green');
  });

  it('calls onChange with the correct color for each button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="indigo" onChange={onChange} />);
    for (const color of ['red', 'blue', 'violet'] as ProjectColor[]) {
      const btn = screen.queryByRole('button', { name: color });
      if (btn) {
        await user.click(btn);
        expect(onChange).toHaveBeenLastCalledWith(color);
      }
    }
  });

  it('calls onChange once per click', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('indigo');
    await user.click(screen.getByRole('button', { name: 'pink' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

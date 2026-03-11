import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrumPicker } from './DrumPicker';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'form.days': 'days',
        'form.hours': 'hr',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock scrollTo / scrollTop for jsdom
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('DrumPicker', () => {
  it('渲染 days / hours 兩個 wheel 的標籤', () => {
    render(<DrumPicker days={0} hours={0} onChange={vi.fn()} />);
    expect(screen.getByText('days')).toBeTruthy();
    expect(screen.getByText('hr')).toBeTruthy();
  });

  it('鍵盤 ArrowDown 在 days wheel 呼叫 onChange(1, 0)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DrumPicker days={0} hours={0} onChange={onChange} />);

    const daysWheel = screen.getByRole('spinbutton', { name: 'days' });
    daysWheel.focus();
    await user.keyboard('{ArrowDown}');

    expect(onChange).toHaveBeenCalledWith(1, 0);
  });

  it('鍵盤 ArrowUp 在 days wheel 不超出 0（已是最小）', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DrumPicker days={0} hours={0} onChange={onChange} />);

    const daysWheel = screen.getByRole('spinbutton', { name: 'days' });
    daysWheel.focus();
    await user.keyboard('{ArrowUp}');

    // value 0 → 不能再減，onChange 應呼叫 (0, 0) 或不呼叫超出範圍
    expect(onChange).toHaveBeenCalledWith(0, 0);
  });

  it('鍵盤 ArrowDown 在 hours wheel 呼叫 onChange(0, 1)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DrumPicker days={0} hours={0} onChange={onChange} />);

    const hoursWheel = screen.getByRole('spinbutton', { name: 'hr' });
    hoursWheel.focus();
    await user.keyboard('{ArrowDown}');

    expect(onChange).toHaveBeenCalledWith(0, 1);
  });
});

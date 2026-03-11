import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectProgressBar } from './ProjectProgressBar';

const COLOR_HEX = '#6366f1';

describe('ProjectProgressBar', () => {
  it('有限制時顯示百分比', () => {
    render(
      <ProjectProgressBar
        totalMinutes={45}
        projectDurationMinutes={90}
        colorHex={COLOR_HEX}
      />,
    );
    expect(screen.getByText(/50\.00%/)).toBeTruthy();
  });

  it('有限制時左側顯示 totalMinutes / projectDurationMinutes（換算後格式）', () => {
    render(
      <ProjectProgressBar
        totalMinutes={30}
        projectDurationMinutes={120}
        colorHex={COLOR_HEX}
      />,
    );
    // 30m / 2h
    expect(screen.getByText(/30m \/ 2h/)).toBeTruthy();
  });

  it('projectDurationMinutes === 0（無限制）時顯示 ∞', () => {
    render(
      <ProjectProgressBar
        totalMinutes={60}
        projectDurationMinutes={0}
        colorHex={COLOR_HEX}
      />,
    );
    expect(screen.getByText('∞')).toBeTruthy();
  });

  it('無限制時左側只顯示換算後時長（不含 /）', () => {
    render(
      <ProjectProgressBar
        totalMinutes={60}
        projectDurationMinutes={0}
        colorHex={COLOR_HEX}
      />,
    );
    // 60 分 → 1h
    const label = screen.getByText(/1h/);
    expect(label.textContent).not.toContain('/');
  });

  it('傳入 sessionCount 時顯示 session 數量', () => {
    render(
      <ProjectProgressBar
        totalMinutes={30}
        projectDurationMinutes={180}
        colorHex={COLOR_HEX}
        sessionCount={5}
      />,
    );
    expect(screen.getByText(/5 sessions/)).toBeTruthy();
  });

  it('100% 時顯示 success 樣式（文字包含 100.00%）', () => {
    render(
      <ProjectProgressBar
        totalMinutes={180}
        projectDurationMinutes={180}
        colorHex={COLOR_HEX}
      />,
    );
    expect(screen.getByText(/100\.00%/)).toBeTruthy();
  });
});

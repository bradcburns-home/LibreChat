import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import AmbientContext from '../Parts/AmbientContext';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => {
    const translations: Record<string, string> = {
      com_ui_copied_to_clipboard: 'Copied!',
      com_ui_copy_thoughts_to_clipboard: 'Copy to clipboard',
    };
    return translations[key] || key;
  },
}));

jest.mock('~/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('jotai', () => ({
  useAtomValue: () => '',
  useAtom: () => ['', jest.fn()],
  atom: (val: any) => ({ init: val }),
}));

jest.mock('~/store/fontSize', () => ({
  fontSizeAtom: { init: '' },
}));

jest.mock('~/store/showThinking', () => ({
  showThinkingAtom: { init: false },
}));

jest.mock('lucide-react', () => ({
  Activity: (props: any) => <span data-testid="activity-icon" {...props}>Activity</span>,
  ChevronDown: (props: any) => <span data-testid="chevron-down" {...props}>ChevronDown</span>,
  ChevronUp: (props: any) => <span data-testid="chevron-up" {...props}>ChevronUp</span>,
}));

jest.mock('@librechat/client', () => ({
  Clipboard: (props: any) => <span data-testid="clipboard-icon" {...props}>Clipboard</span>,
  CheckMark: (props: any) => <span data-testid="checkmark-icon" {...props}>CheckMark</span>,
  TooltipAnchor: ({ render, description }: any) => (
    <div data-testid="tooltip" aria-label={description}>
      {render}
    </div>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<RecoilRoot>{ui}</RecoilRoot>);
};

describe('AmbientContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with context text', () => {
    renderWithProviders(
      <AmbientContext context="### health-log / query_timeline\nTook Tylenol 500mg at 8am" />,
    );

    expect(screen.getByText('Ambient Context')).toBeInTheDocument();
  });

  it('should start collapsed', () => {
    renderWithProviders(
      <AmbientContext context="Some context data" />,
    );

    const toggleButton = screen.getByRole('button', { name: /Ambient Context/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should expand on click', () => {
    renderWithProviders(
      <AmbientContext context="Some context data" />,
    );

    const toggleButton = screen.getByRole('button', { name: /Ambient Context/i });
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('should collapse on second click', () => {
    renderWithProviders(
      <AmbientContext context="Some context data" />,
    );

    const toggleButton = screen.getByRole('button', { name: /Ambient Context/i });
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should not render when context is empty', () => {
    const { container } = renderWithProviders(
      <AmbientContext context="" />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show correct label text', () => {
    renderWithProviders(
      <AmbientContext context="data" />,
    );

    expect(screen.getByText('Ambient Context')).toBeInTheDocument();
    expect(screen.queryByText('Thoughts')).not.toBeInTheDocument();
  });

  it('should show the Activity icon instead of Lightbulb', () => {
    renderWithProviders(
      <AmbientContext context="data" />,
    );

    expect(screen.getByTestId('activity-icon')).toBeInTheDocument();
  });

  it('should show copy button', () => {
    renderWithProviders(
      <AmbientContext context="Copy me" />,
    );

    const copyButton = screen.getByRole('button', { name: 'Copy to clipboard' });
    expect(copyButton).toBeInTheDocument();
  });

  it('should display context text when expanded', () => {
    renderWithProviders(
      <AmbientContext context="Took Tylenol 500mg at 8am" />,
    );

    const toggleButton = screen.getByRole('button', { name: /Ambient Context/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText('Took Tylenol 500mg at 8am')).toBeInTheDocument();
  });
});

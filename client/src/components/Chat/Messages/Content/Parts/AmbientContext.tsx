import { memo, useMemo, useState, useCallback, useRef, useId } from 'react';
import { Clipboard, CheckMark, TooltipAnchor } from '@librechat/client';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import type { MouseEvent, FocusEvent } from 'react';
import { useAtomValue } from 'jotai';
import { ThinkingContent, FloatingThinkingBar } from './Thinking';
import { fontSizeAtom } from '~/store/fontSize';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type AmbientContextProps = {
  context: string;
};

const AmbientContextButton = memo(
  ({
    isExpanded,
    onClick,
    label,
    content,
    contentId,
  }: {
    isExpanded: boolean;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
    label: string;
    content?: string;
    contentId: string;
  }) => {
    const localize = useLocalize();
    const fontSize = useAtomValue(fontSizeAtom);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (content) {
          navigator.clipboard.writeText(content);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      },
      [content],
    );

    return (
      <div className="group/thinking flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClick}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className={cn(
            'group/button flex flex-1 items-center justify-start rounded-lg leading-[18px]',
            fontSize,
          )}
        >
          <span className="relative mr-1.5 inline-flex h-[18px] w-[18px] items-center justify-center">
            <Activity
              className="icon-sm absolute text-text-secondary opacity-100 transition-opacity group-hover/button:opacity-0"
              aria-hidden="true"
            />
            <ChevronDown
              className={cn(
                'icon-sm absolute transform-gpu text-text-primary opacity-0 transition-all duration-300 group-hover/button:opacity-100',
                isExpanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </span>
          {label}
        </button>
        {content && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={
              isCopied
                ? localize('com_ui_copied_to_clipboard')
                : localize('com_ui_copy_thoughts_to_clipboard')
            }
            className={cn(
              'rounded-lg p-1.5 text-text-secondary-alt',
              isExpanded
                ? 'opacity-0 group-focus-within/thinking-container:opacity-100 group-hover/thinking-container:opacity-100'
                : 'opacity-0',
              'hover:bg-surface-hover hover:text-text-primary',
              'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white',
            )}
          >
            <span className="sr-only">
              {isCopied
                ? localize('com_ui_copied_to_clipboard')
                : localize('com_ui_copy_thoughts_to_clipboard')}
            </span>
            {isCopied ? (
              <CheckMark className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Clipboard size="19" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    );
  },
);

AmbientContextButton.displayName = 'AmbientContextButton';

const AmbientContext = memo(({ context }: AmbientContextProps) => {
  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBarVisible, setIsBarVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const label = useMemo(() => 'Ambient Context', []);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleFocus = useCallback(() => {
    setIsBarVisible(true);
  }, []);

  const handleBlur = useCallback((e: FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsBarVisible(false);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsBarVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!containerRef.current?.contains(document.activeElement)) {
      setIsBarVisible(false);
    }
  }, []);

  if (!context) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="group/reasoning"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="group/thinking-container">
        <div className="mb-2 pb-2 pt-2">
          <AmbientContextButton
            isExpanded={isExpanded}
            onClick={handleClick}
            label={label}
            content={context}
            contentId={contentId}
          />
        </div>
        <div
          id={contentId}
          role="group"
          aria-label={label}
          aria-hidden={!isExpanded || undefined}
          className={cn(
            'grid transition-all duration-300 ease-out',
            isExpanded && 'mb-4',
          )}
          style={{
            gridTemplateRows: isExpanded ? '1fr' : '0fr',
          }}
        >
          <div className="relative overflow-hidden">
            <ThinkingContent>{context}</ThinkingContent>
            <FloatingThinkingBar
              isVisible={isBarVisible && isExpanded}
              isExpanded={isExpanded}
              onClick={handleClick}
              content={context}
              contentId={contentId}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

AmbientContext.displayName = 'AmbientContext';

export default AmbientContext;

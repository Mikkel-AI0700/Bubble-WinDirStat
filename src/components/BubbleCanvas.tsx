import React, { useEffect, useRef, useState } from 'react';
import {
  CATEGORY_COLORS,
  FileCategory,
  formatSize,
  PackedBubble,
  scaleBubblesToViewport,
} from '../utils/bubblePacking';

interface BubbleCanvasProps {
  bubbles: PackedBubble[];
  isScanning: boolean;
  hoveredRank: number | null;
  selectedRank: number | null;
  onHoverBubble: (rank: number | null) => void;
  onSelectBubble: (rank: number | null) => void;
  onOpenDirectory: (path: string) => void;
}

const LEGEND_CATEGORIES: FileCategory[] = [
  'Directory',
  'Media',
  'Document',
  'Archive/App',
  'Code/Data',
  'Other File',
  'Grouped',
];

export const BubbleCanvas: React.FC<BubbleCanvasProps> = ({
  bubbles,
  isScanning,
  hoveredRank,
  selectedRank,
  onHoverBubble,
  onSelectBubble,
  onOpenDirectory,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 780,
    height: 540,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width >= 50 && rect.height >= 50) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const scaledBubbles = scaleBubblesToViewport(
    bubbles,
    dimensions.width,
    dimensions.height,
    36
  );

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-[#1e1e2e] border border-[#313244] rounded-lg overflow-hidden">
      {/* Main Bubble Viewport */}
      <div
        ref={containerRef}
        data-testid="bubble-canvas-viewport"
        className="relative flex-1 min-h-[380px] bg-[#181825] select-none overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as Element).tagName === 'svg') {
            onSelectBubble(null);
          }
        }}
      >
        {isScanning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-base font-bold text-[#89b4fa]">
              Scanning directory sizes...
            </p>
            <p className="text-sm text-[#a6adc8] mt-1">
              Calculating bubble proportions (r ∝ √Size)...
            </p>
          </div>
        ) : scaledBubbles.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-medium text-[#a6adc8]">
              No items match the current filter in this directory.
            </p>
          </div>
        ) : (
          <svg
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="w-full h-full block"
            role="img"
            aria-label="Proportional disk usage bubble chart"
          >
            {scaledBubbles.map((b) => {
              const sx = b.sx ?? 0;
              const sy = b.sy ?? 0;
              const sr = b.sr ?? 10;
              const colors = CATEGORY_COLORS[b.category] || CATEGORY_COLORS['Other File'];
              const isHovered = b.rank === hoveredRank;
              const isSelected = b.rank === selectedRank;
              const strokeColor = isHovered || isSelected ? '#ffffff' : colors.outline;
              const strokeWidth = isHovered || isSelected ? 3 : 1.5;

              const maxChars = Math.max(6, Math.floor(sr / 3.6));
              let displayName = b.name;
              if (displayName.length > maxChars) {
                displayName = displayName.slice(0, Math.max(3, maxChars - 2)) + '..';
              }
              const fontSize = Math.min(12, Math.max(8, Math.floor(sr / 5)));
              const showText = sr >= 24;
              const showSizeLine = sr >= 38;

              return (
                <g
                  key={`${b.rank}-${b.name}`}
                  transform={`translate(${sx}, ${sy})`}
                  className={`${b.is_dir && b.path ? 'cursor-pointer' : 'cursor-pointer'} focus:outline-none`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${b.is_dir ? 'Directory' : 'File'} ${b.name}, ${formatSize(b.size)}, ${b.pct.toFixed(1)}%`}
                  onMouseEnter={() => onHoverBubble(b.rank)}
                  onMouseLeave={() => onHoverBubble(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBubble(b.rank);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (b.is_dir && b.path) {
                      onOpenDirectory(b.path);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (b.is_dir && b.path && isSelected) {
                        onOpenDirectory(b.path);
                      } else {
                        onSelectBubble(b.rank);
                      }
                    }
                  }}
                >
                  <title>{`${b.name} (${b.category}) — ${formatSize(b.size)} (${b.pct.toFixed(2)}%)`}</title>
                  <circle
                    r={sr}
                    fill={colors.fill}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    className="transition-transform duration-150"
                  />
                  {showText && (
                    <text
                      textAnchor="middle"
                      fill={colors.text}
                      fontSize={fontSize}
                      fontWeight={700}
                      className="pointer-events-none select-none"
                    >
                      <tspan x="0" dy={showSizeLine ? '-0.35em' : '0.35em'}>
                        {displayName}
                      </tspan>
                      {showSizeLine && (
                        <tspan
                          x="0"
                          dy="1.25em"
                          fontSize={Math.max(8, fontSize - 1)}
                          fontWeight={600}
                          className="font-mono tabular-nums"
                        >
                          {formatSize(b.size)}
                        </tspan>
                      )}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend Bar below Canvas (matches Tkinter Legend Frame) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 py-2 bg-[#1e1e2e] border-t border-[#313244] text-xs">
        <span className="font-semibold text-[#cdd6f4] whitespace-nowrap shrink-0">
          Legend:
        </span>
        {LEGEND_CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat];
          return (
            <div key={cat} className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span
                className="inline-block w-3 h-3 rounded-xs shrink-0"
                style={{
                  backgroundColor: colors.fill,
                  border: `1px solid ${colors.outline}`,
                }}
                aria-hidden="true"
              />
              <span className="text-[#cdd6f4]">{cat}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

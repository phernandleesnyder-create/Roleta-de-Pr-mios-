import React, { useMemo } from 'react';

interface QrCodeMatrixProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
}

/**
 * Deterministic 25x25 QR-style matrix with standard finder patterns,
 * timing patterns, alignment pattern, and data bits derived from `value`.
 * Works 100% hermetically offline without external image dependencies.
 */
export const QrCodeMatrix: React.FC<QrCodeMatrixProps> = ({
  value,
  size = 180,
  fgColor = '#0F172A',
  bgColor = '#FFFFFF',
}) => {
  const gridSize = 25;

  const matrix = useMemo(() => {
    const grid: boolean[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false)
    );
    const reserved: boolean[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false)
    );

    const drawFinder = (rowOffset: number, colOffset: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = rowOffset + r;
          const cc = colOffset + c;
          if (rr >= 0 && rr < gridSize && cc >= 0 && cc < gridSize) {
            reserved[rr][cc] = true;
            if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
              const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
              const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
              grid[rr][cc] = isBorder || isInner;
            }
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, gridSize - 7);
    drawFinder(gridSize - 7, 0);

    // Alignment pattern at bottom-right (16..20)
    for (let r = 16; r <= 20; r++) {
      for (let c = 16; c <= 20; c++) {
        reserved[r][c] = true;
        const isBorder = r === 16 || r === 20 || c === 16 || c === 20;
        const isCenter = r === 18 && c === 18;
        grid[r][c] = isBorder || isCenter;
      }
    }

    // Timing patterns
    for (let i = 8; i < gridSize - 8; i++) {
      reserved[6][i] = true;
      reserved[i][6] = true;
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Deterministic hash stream from value string
    let seed = 2166136261;
    for (let i = 0; i < value.length; i++) {
      seed ^= value.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!reserved[r][c]) {
          seed ^= (r * 31 + c * 17 + value.charCodeAt((r + c) % Math.max(1, value.length))) & 0xff;
          seed = Math.imul(seed, 16777619);
          grid[r][c] = (Math.abs(seed) % 10) < 5;
        }
      }
    }

    return grid;
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${gridSize + 4} ${gridSize + 4}`}
      className="rounded-lg"
      style={{ backgroundColor: bgColor }}
      role="img"
      aria-label={`QR Code para ${value}`}
    >
      <rect width={gridSize + 4} height={gridSize + 4} fill={bgColor} rx="1.5" />
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + 2}
              y={rIdx + 2}
              width={1}
              height={1}
              fill={fgColor}
               shapeRendering="crispEdges"
            />
          ) : null
        )
      )}
    </svg>
  );
};

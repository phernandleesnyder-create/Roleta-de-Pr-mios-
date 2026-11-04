import React from 'react';

export interface WheelSlice {
  id: number;
  name: string;
  color: string;
  type?: string;
}

interface RouletteWheelProps {
  slices: WheelSlice[];
  rotationDegrees: number;
  isSpinning: boolean;
  primaryColor?: string;
  onCenterClick?: () => void;
  centerLabel?: string;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function createSlicePath(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    x,
    y,
    'L',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    'Z',
  ].join(' ');
}

const FALLBACK_COLORS = [
  '#4F46E5',
  '#16A34A',
  '#D97706',
  '#E11D48',
  '#0284C7',
  '#7C3AED',
  '#EA580C',
  '#0D9488',
];

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  slices,
  rotationDegrees,
  isSpinning,
  primaryColor = '#4F46E5',
  onCenterClick,
  centerLabel = 'GIRAR',
}) => {
  const effectiveSlices: WheelSlice[] =
    slices.length >= 2
      ? slices
      : [
          { id: 1, name: '10% OFF', color: '#4F46E5' },
          { id: 2, name: 'Frete Grátis', color: '#16A34A' },
          { id: 3, name: 'R$15 OFF', color: '#D97706' },
          { id: 4, name: 'Brinde', color: '#E11D48' },
        ];

  const count = effectiveSlices.length;
  const sliceAngle = 360 / count;

  return (
    <div className="relative mx-auto select-none flex items-center justify-center w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]">
      {/* Top Pointer Indicator */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-md">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path
            d="M18 34L6 10C4.5 7 6.8 3 10.2 3H25.8C29.2 3 31.5 7 30 10L18 34Z"
            fill="#0F172A"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          <circle cx="18" cy="11" r="4" fill="#FACC15" />
        </svg>
      </div>

      {/* Outer Rim with decorative LED studs */}
      <div
        className="w-full h-full rounded-full p-3 shadow-2xl border-4 border-white/90 flex items-center justify-center relative"
        style={{ backgroundColor: '#0F172A' }}
      >
        {/* Rotating SVG Wheel */}
        <div
          className="w-full h-full rounded-full overflow-hidden"
          style={{
            transform: `rotate(${rotationDegrees}deg)`,
            transition: isSpinning
              ? 'transform 4.4s cubic-bezier(0.12, 0.8, 0.18, 1)'
              : 'transform 0.3s ease-out',
          }}
        >
          <svg viewBox="0 0 300 300" className="w-full h-full">
            {effectiveSlices.map((slice, index) => {
              const startAngle = index * sliceAngle;
              const endAngle = (index + 1) * sliceAngle;
              const midAngle = startAngle + sliceAngle / 2;
              const color = slice.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

              // Calculate label position and rotation
              const textPos = polarToCartesian(150, 150, 96, midAngle);
              const labelRotation = midAngle - 90;

              return (
                <g key={slice.id || index}>
                  <path
                    d={createSlicePath(150, 150, 148, startAngle, endAngle)}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <g
                    transform={`translate(${textPos.x}, ${textPos.y}) rotate(${labelRotation})`}
                  >
                    <text
                      x="0"
                      y="4"
                      fill="#FFFFFF"
                      fontSize={count > 6 ? '10.5' : '12'}
                      fontWeight="700"
                      textAnchor="middle"
                      className="font-display tracking-tight"
                      style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.45)' }}
                    >
                      {slice.name.length > 15 ? `${slice.name.slice(0, 14)}…` : slice.name}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Center Spin Hub Button */}
        <button
          type="button"
          onClick={onCenterClick}
          disabled={isSpinning}
          style={{ borderColor: primaryColor }}
          className="absolute z-10 w-20 h-20 rounded-full bg-white text-slate-900 font-display font-extrabold text-xs tracking-wider shadow-xl border-4 flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer disabled:cursor-wait"
        >
          <span className="whitespace-nowrap">{isSpinning ? '...' : centerLabel}</span>
        </button>
      </div>
    </div>
  );
};

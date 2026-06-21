import React from 'react';

const wavePaths = [
  'M-160 224C-46 192 60 154 174 162C280 170 366 222 472 234C578 246 690 220 800 188C914 154 1030 112 1158 114C1294 118 1410 172 1534 208C1648 242 1768 256 1920 236V0H-160Z',
  'M-160 304C-36 268 64 236 178 244C292 252 394 302 502 316C612 330 720 308 830 278C948 246 1064 202 1192 206C1322 210 1430 258 1544 294C1654 330 1772 348 1920 334V0H-160Z',
  'M-160 390C-54 362 44 338 148 344C264 350 366 390 474 404C596 420 714 404 826 378C942 352 1054 314 1180 314C1314 314 1434 356 1554 390C1670 422 1782 442 1920 430V0H-160Z',
];

export function WavyBackground({ children, className = '' }) {
  const classes = ['wavy-background', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="wavy-background__visual" aria-hidden="true">
        <div className="wavy-background__glow wavy-background__glow--left" />
        <div className="wavy-background__glow wavy-background__glow--right" />
        <svg className="wavy-background__svg" viewBox="0 0 1600 720" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wavy-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.18" />
              <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.42" />
              <stop offset="68%" stopColor="#2dd4bf" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#faf5ff" stopOpacity="0.12" />
            </linearGradient>
            <filter id="wavy-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          <g className="wavy-background__fills" filter="url(#wavy-blur)">
            {wavePaths.map((path, index) => (
              <path className={`wavy-background__fill wavy-background__fill--${index + 1}`} d={path} key={path} />
            ))}
          </g>
          <g className="wavy-background__lines">
            {wavePaths.map((path, index) => (
              <path className={`wavy-background__line wavy-background__line--${index + 1}`} d={path} key={`${path}-line`} pathLength="1000" />
            ))}
          </g>
        </svg>
      </div>
      <div className="wavy-background__content">{children}</div>
    </div>
  );
}

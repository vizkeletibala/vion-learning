import React from 'react';

const curtainRibbons = [
  {
    className: 'aurora-background__ribbon aurora-background__ribbon--soft aurora-background__ribbon--primary',
    d: 'M 1640 48 C 1510 28, 1426 78, 1338 140 C 1244 206, 1148 272, 1030 274 C 912 276, 824 212, 742 154 C 650 88, 546 52, 432 86 C 302 124, 198 238, 74 312 C -26 372, -110 384, -200 350',
  },
  {
    className: 'aurora-background__ribbon aurora-background__ribbon--spark aurora-background__ribbon--primary',
    d: 'M 1640 48 C 1510 28, 1426 78, 1338 140 C 1244 206, 1148 272, 1030 274 C 912 276, 824 212, 742 154 C 650 88, 546 52, 432 86 C 302 124, 198 238, 74 312 C -26 372, -110 384, -200 350',
  },
  {
    className: 'aurora-background__ribbon aurora-background__ribbon--soft aurora-background__ribbon--mid',
    d: 'M 1700 130 C 1560 88, 1478 144, 1390 214 C 1292 292, 1202 332, 1096 320 C 980 308, 902 240, 812 198 C 708 150, 598 148, 488 186 C 356 230, 248 322, 122 390 C 16 446, -74 462, -168 430',
  },
  {
    className: 'aurora-background__ribbon aurora-background__ribbon--spark aurora-background__ribbon--mid',
    d: 'M 1700 130 C 1560 88, 1478 144, 1390 214 C 1292 292, 1202 332, 1096 320 C 980 308, 902 240, 812 198 C 708 150, 598 148, 488 186 C 356 230, 248 322, 122 390 C 16 446, -74 462, -168 430',
  },
  {
    className: 'aurora-background__ribbon aurora-background__ribbon--soft aurora-background__ribbon--deep',
    d: 'M 1600 12 C 1508 62, 1460 120, 1404 178 C 1332 254, 1248 286, 1156 272 C 1078 260, 1020 214, 956 176 C 882 132, 804 110, 716 118 C 620 128, 538 176, 458 236 C 344 320, 214 408, 72 452 C -30 484, -112 486, -186 468',
  },
  {
    className: 'aurora-background__ribbon aurora-background__ribbon--spark aurora-background__ribbon--deep',
    d: 'M 1600 12 C 1508 62, 1460 120, 1404 178 C 1332 254, 1248 286, 1156 272 C 1078 260, 1020 214, 956 176 C 882 132, 804 110, 716 118 C 620 128, 538 176, 458 236 C 344 320, 214 408, 72 452 C -30 484, -112 486, -186 468',
  },
];

const curtainVeils = [
  {
    className: 'aurora-background__veil-band aurora-background__veil-band--one',
    d: 'M 1680 22 C 1548 22, 1442 68, 1322 122 C 1202 176, 1076 202, 946 184 C 822 166, 716 112, 606 88 C 490 62, 370 74, 260 132 C 160 186, 70 252, -68 292 L -96 356 C 58 316, 156 248, 268 188 C 382 126, 502 104, 620 132 C 736 160, 842 214, 964 228 C 1088 242, 1218 214, 1342 160 C 1458 110, 1564 68, 1680 66 Z',
  },
  {
    className: 'aurora-background__veil-band aurora-background__veil-band--two',
    d: 'M 1704 112 C 1580 98, 1476 132, 1382 188 C 1282 248, 1180 278, 1074 268 C 966 258, 874 216, 786 182 C 692 146, 596 140, 496 170 C 396 200, 302 262, 194 320 C 96 372, -2 406, -126 420 L -126 494 C -2 474, 100 440, 208 384 C 318 326, 412 266, 508 236 C 606 206, 700 214, 792 250 C 882 286, 972 328, 1080 334 C 1192 340, 1298 306, 1398 244 C 1494 184, 1600 144, 1704 162 Z',
  },
  {
    className: 'aurora-background__veil-band aurora-background__veil-band--three',
    d: 'M 1648 236 C 1560 214, 1462 228, 1370 278 C 1274 330, 1190 360, 1100 352 C 1006 344, 928 306, 858 274 C 782 240, 706 228, 628 242 C 540 258, 458 302, 382 360 C 292 430, 190 488, 78 522 L 112 586 C 222 548, 320 492, 402 430 C 484 368, 564 324, 652 308 C 738 292, 816 304, 892 338 C 964 370, 1044 408, 1140 416 C 1234 424, 1328 394, 1428 342 C 1524 292, 1620 274, 1712 288 Z',
  },
];

const waveBands = [
  {
    className: 'aurora-background__wave aurora-background__wave--deep',
    d: 'M -80 470 C 120 408, 262 352, 424 370 C 548 386, 648 442, 780 448 C 924 456, 1040 402, 1166 352 C 1288 306, 1410 286, 1580 326 L 1660 720 L -80 720 Z',
  },
  {
    className: 'aurora-background__wave aurora-background__wave--mid',
    d: 'M -100 520 C 86 452, 220 406, 378 428 C 508 446, 602 514, 744 522 C 886 530, 1018 476, 1160 422 C 1292 372, 1416 354, 1600 390 L 1660 748 L -100 748 Z',
  },
  {
    className: 'aurora-background__wave aurora-background__wave--crest',
    d: 'M -120 410 C 48 368, 176 320, 320 332 C 466 344, 558 410, 696 424 C 836 438, 966 380, 1098 334 C 1236 286, 1370 276, 1548 312 L 1660 590 L -120 590 Z',
  },
];

export function AuroraBackground({ children, className = '', showRadialGradient = true }) {
  const classes = ['aurora-background', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="aurora-background__beam" aria-hidden="true" />
      <div className="aurora-background__waves" aria-hidden="true">
        <svg className="aurora-background__waves-svg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="aurora-wave-turquoise" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#46f0df" stopOpacity="0.94" />
              <stop offset="38%" stopColor="#27c4da" stopOpacity="0.78" />
              <stop offset="72%" stopColor="#115e90" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#061f54" stopOpacity="0.94" />
            </linearGradient>
            <linearGradient id="aurora-wave-sun" x1="84%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff0b8" stopOpacity="0.8" />
              <stop offset="42%" stopColor="#ffd77a" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#ffd77a" stopOpacity="0" />
            </linearGradient>
            <filter id="aurora-wave-soft" x="-18%" y="-28%" width="136%" height="156%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
            <filter id="aurora-wave-crest" x="-18%" y="-28%" width="136%" height="156%">
              <feGaussianBlur stdDeviation="1.75" />
            </filter>
          </defs>
          <g className="aurora-background__wave-glow">
            {waveBands.map((wave, index) => (
              <path key={`${wave.className}-${index}`} className={wave.className} d={wave.d} />
            ))}
          </g>
          <g className="aurora-background__wave-highlights">
            {waveBands.map((wave, index) => (
              <path key={`${wave.className}-highlight-${index}`} className={`${wave.className} aurora-background__wave--highlight`} d={wave.d} />
            ))}
          </g>
        </svg>
      </div>
      <div className="aurora-background__curtain" aria-hidden="true">
        <svg className="aurora-background__curtain-svg" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="aurora-curtain-gradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff7ce" stopOpacity="0.95" />
              <stop offset="18%" stopColor="#f8fff6" stopOpacity="0.56" />
              <stop offset="46%" stopColor="#62f5ff" stopOpacity="0.36" />
              <stop offset="100%" stopColor="#62f5ff" stopOpacity="0.04" />
            </linearGradient>
            <filter id="aurora-curtain-soft" x="-20%" y="-30%" width="140%" height="160%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          <g className="aurora-background__veil-ribbons">
            {curtainVeils.map((veil, index) => (
              <path key={`${veil.className}-${index}`} className={veil.className} d={veil.d} />
            ))}
          </g>
          <g className="aurora-background__curtain-ribbons">
            {curtainRibbons.map((ribbon, index) => (
              <path
                key={`${ribbon.className}-${index}`}
                className={ribbon.className}
                d={ribbon.d}
                pathLength="1000"
                stroke="url(#aurora-curtain-gradient)"
                filter={ribbon.className.includes('--soft') ? 'url(#aurora-curtain-soft)' : undefined}
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="aurora-background__caustics" aria-hidden="true" />
      <div
        className={showRadialGradient ? 'aurora-background__depth aurora-background__depth--radial' : 'aurora-background__depth'}
        aria-hidden="true"
      />
      <div className="aurora-background__content">{children}</div>
    </div>
  );
}

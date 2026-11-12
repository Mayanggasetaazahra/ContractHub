import React from 'react';

interface HarborIllustrationProps {
  variant?: 'hero' | 'login';
  className?: string;
}

export const HarborIllustration: React.FC<HarborIllustrationProps> = ({
  variant = 'hero',
  className = '',
}) => {
  const isHero = variant === 'hero';

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      <svg
        viewBox={isHero ? '0 0 760 440' : '0 0 540 240'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto block"
        role="img"
        aria-label="Ilustrasi Pelabuhan Cirebon dengan kapal kargo, gudang logistik, dan derek peti kemas"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0F2F1" stopOpacity="0.95" />
            <stop offset="68%" stopColor="#CBE7E8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#9ED0D8" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5FA3B4" />
            <stop offset="55%" stopColor="#387D93" />
            <stop offset="100%" stopColor="#004C6D" />
          </linearGradient>
          <linearGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E0F2F1" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Sky Background */}
        <rect
          width={isHero ? 760 : 540}
          height={isHero ? 320 : 170}
          fill="url(#skyGrad)"
        />

        {/* Soft Sun Disc */}
        <circle
          cx={isHero ? 595 : 420}
          cy={isHero ? 105 : 54}
          r={isHero ? 54 : 34}
          fill="#FFFFFF"
          fillOpacity="0.72"
        />

        {/* Cirebon Mega Mendung Stylized Clouds */}
        <g opacity="0.82" transform={isHero ? 'translate(470, 62) scale(1.05)' : 'translate(320, 26) scale(0.75)'}>
          <path
            d="M16 44C6 44 0 38 0 30C0 22 7 16 17 16C20 7 30 0 43 0C57 0 68 8 71 19C76 17 82 17 87 19C94 22 98 28 98 35C98 41 92 44 84 44H16Z"
            fill="#F4F8F9"
            stroke="#8FB9C4"
            strokeWidth="1.6"
          />
          <path
            d="M20 35C14 35 11 31 11 26C11 21 16 18 23 19C26 12 34 8 44 8C54 8 62 14 64 22C69 20 75 21 79 24"
            stroke="#A5C8D1"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M28 29C27 24 32 19 39 19C46 19 52 24 53 29"
            stroke="#8FB9C4"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>

        {/* Secondary distant cloud + seagulls */}
        <g opacity="0.6" transform={isHero ? 'translate(90, 74)' : 'translate(48, 36) scale(0.7)'}>
          <path d="M12 24C5 24 0 19 0 14C0 9 5 5 12 5C16 1 23 0 30 2C35 3 39 7 40 12C45 12 49 16 49 20C49 23 45 24 40 24H12Z" fill="#FFFFFF" />
          <path d="M140 10C144 6 149 6 152 10C155 6 160 6 164 10" stroke="#004C6D" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
          <path d="M168 18C171 15 175 15 178 18C181 15 185 15 188 18" stroke="#004C6D" strokeWidth="1.4" strokeLinecap="round" opacity="0.35" />
        </g>

        {/* Distant Cirebon Coastline & Terminal Silhouette */}
        <g transform={isHero ? 'translate(0, 212)' : 'translate(0, 108) scale(0.71, 0.68)'}>
          {/* Terminal Pier Concrete */}
          <rect x="0" y="96" width="760" height="22" fill="#B6D3DA" />
          <rect x="0" y="108" width="760" height="6" fill="#004C6D" fillOpacity="0.22" />

          {/* Port Warehouses (Gudang D3, D2, D1) */}
          <g>
            <path d="M120 96V56L165 38L210 56V96H120Z" fill="#D9EAEF" stroke="#7EAAB8" strokeWidth="1.5" />
            <rect x="136" y="68" width="22" height="28" fill="#8FB9C4" />
            <rect x="170" y="68" width="24" height="28" fill="#A6C9D2" />

            <path d="M220 96V52L272 32L324 52V96H220Z" fill="#E6F3F5" stroke="#7EAAB8" strokeWidth="1.5" />
            <rect x="236" y="62" width="28" height="34" fill="#6F9FAB" />
            <rect x="276" y="62" width="28" height="34" fill="#8FB9C4" />

            <path d="M336 96V60L376 44L416 60V96H336Z" fill="#D0E5EB" stroke="#7EAAB8" strokeWidth="1.5" />
            <rect x="352" y="70" width="24" height="26" fill="#7EAAB8" />
          </g>

          {/* Container Stacks */}
          <g>
            <rect x="442" y="78" width="26" height="18" rx="1" fill="#004C6D" />
            <rect x="470" y="78" width="26" height="18" rx="1" fill="#3B839B" />
            <rect x="456" y="60" width="26" height="18" rx="1" fill="#E07A5F" />
            <rect x="498" y="78" width="26" height="18" rx="1" fill="#002B36" />
          </g>

          {/* Gantry Crane (Derek Peti Kemas) */}
          <g>
            {/* Crane Legs */}
            <path d="M558 96L574 10L594 10L610 96" stroke="#002B36" strokeWidth="4.2" strokeLinejoin="round" />
            <path d="M565 62H603" stroke="#002B36" strokeWidth="3" />
            <path d="M570 36H598" stroke="#002B36" strokeWidth="3" />
            {/* Crane Boom */}
            <path d="M525 14H666" stroke="#002B36" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M574 10L538 14" stroke="#004C6D" strokeWidth="2.2" />
            <path d="M594 10L656 14" stroke="#004C6D" strokeWidth="2.2" />
            {/* Crane Trolley & Hoist */}
            <rect x="618" y="14" width="16" height="7" fill="#004C6D" />
            <line x1="626" y1="21" x2="626" y2="54" stroke="#002B36" strokeWidth="1.8" />
            <rect x="615" y="54" width="22" height="12" rx="1" fill="#004C6D" />
            {/* Secondary Distant Crane */}
            <g opacity="0.45" transform="translate(88, 16) scale(0.78)">
              <path d="M558 96L574 10L594 10L610 96" stroke="#004C6D" strokeWidth="3.5" />
              <path d="M532 14H650" stroke="#004C6D" strokeWidth="4" />
            </g>
          </g>

          {/* Cargo Vessel (Kapal Kargo Nusantara) */}
          <g transform="translate(175, 42)">
            {/* Containers on Deck */}
            <rect x="58" y="34" width="26" height="14" fill="#004C6D" />
            <rect x="86" y="34" width="26" height="14" fill="#5FA3B4" />
            <rect x="114" y="34" width="26" height="14" fill="#D97706" />
            <rect x="142" y="34" width="26" height="14" fill="#004C6D" />
            <rect x="72" y="20" width="26" height="14" fill="#E0F2F1" stroke="#004C6D" strokeWidth="1" />
            <rect x="100" y="20" width="26" height="14" fill="#002B36" />
            <rect x="128" y="20" width="26" height="14" fill="#3B839B" />

            {/* Ship Bridge / Superstructure */}
            <path d="M180 48V12H208L214 48H180Z" fill="#FFFFFF" stroke="#002B36" strokeWidth="1.6" />
            <rect x="186" y="18" width="16" height="6" fill="#004C6D" />
            <rect x="188" y="28" width="12" height="4" fill="#9ED0D8" />
            {/* Funnel */}
            <path d="M204 12V3H212L214 12H204Z" fill="#004C6D" />
            <rect x="204" y="3" width="8" height="3" fill="#D97706" />

            {/* Ship Hull */}
            <path d="M14 48H226L212 72H32L14 48Z" fill="#002B36" />
            <path d="M24 62H217L212 72H32L24 62Z" fill="#991B1B" />
            <line x1="19" y1="54" x2="222" y2="54" stroke="#E0F2F1" strokeWidth="1.6" />
          </g>
        </g>

        {/* Sea Surface & Layered Coastal Waves */}
        <rect
          y={isHero ? 318 : 170}
          width={isHero ? 760 : 540}
          height={isHero ? 122 : 70}
          fill="url(#seaGrad)"
        />
        <path
          d={
            isHero
              ? 'M0 330C90 322 180 338 270 330C360 322 450 338 540 330C630 322 700 336 760 330'
              : 'M0 182C70 176 140 188 210 182C280 176 350 188 420 182C470 177 510 185 540 182'
          }
          stroke="#E0F2F1"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={
            isHero
              ? 'M40 364C140 356 240 372 340 364C440 356 540 372 640 364C690 360 730 364 760 362'
              : 'M24 205C94 199 164 211 234 205C304 199 374 211 444 205C484 202 516 205 540 204'
          }
          stroke="#E0F2F1"
          strokeOpacity="0.28"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d={
            isHero
              ? 'M0 398C110 390 210 406 320 398C430 390 540 406 660 398C705 395 735 398 760 396'
              : 'M0 224C80 219 160 229 240 224C320 219 400 229 480 224C505 222 525 224 540 223'
          }
          stroke="#FFFFFF"
          strokeOpacity="0.18"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

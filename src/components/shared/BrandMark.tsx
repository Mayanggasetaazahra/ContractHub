import React from 'react';

interface BrandMarkProps {
  className?: string;
  size?: number;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', size = 36 }) => (
  <div
    className={`inline-flex items-center justify-center rounded-lg bg-white border border-[#004C6D]/15 overflow-hidden shadow-xs shrink-0 ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src="/assets/aistudio/logo_contracthub_a69ff9d1.jpg"
      alt="Logo CONTRACTHUB Pelindo Cirebon"
      referrerPolicy="no-referrer"
      className="w-full h-full object-contain p-0.5"
    />
  </div>
);

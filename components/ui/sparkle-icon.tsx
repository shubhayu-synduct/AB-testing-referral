import React from 'react';

interface SparkleIconProps {
  className?: string;
  fill?: string;
}

export const SparkleIcon: React.FC<SparkleIconProps> = ({ className = "w-[14px] h-[14px]", fill = "currentColor" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 1L15 10L23 12L15 14L12 23L9 14L1 12L9 10L12 1Z" fill="currentColor" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.8" />
    </svg>
  );
};
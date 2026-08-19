import React from "react";

interface HomelyLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textClassName?: string;
}

export const HomelyLogo: React.FC<HomelyLogoProps> = ({
  className = "w-9 h-9",
  size,
  showText = true,
  textClassName = "text-white",
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src="/homely-logo.svg"
        alt="Homely Custom Logo"
        className={`rounded-full object-contain shrink-0 shadow-md ${className}`}
        style={style}
        referrerPolicy="no-referrer"
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1">
            <span className={`text-base font-bold tracking-tight ${textClassName}`}>
              Homely<span className="text-indigo-400 font-extrabold">Custom</span>
            </span>
          </div>
          <span className="text-[9px] font-semibold tracking-wider uppercase text-[#888]">
            Design Your Dream Space
          </span>
        </div>
      )}
    </div>
  );
};

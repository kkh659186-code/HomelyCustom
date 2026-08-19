import React, { useEffect, useRef } from "react";
import { SolarTimeSettings } from "../types";
import {
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Play,
  Pause,
  Lightbulb,
} from "lucide-react";

interface DayNightLightingControlsProps {
  solarSettings: SolarTimeSettings;
  onChangeSolarSettings: (settings: Partial<SolarTimeSettings>) => void;
}

export const DayNightLightingControls: React.FC<DayNightLightingControlsProps> = ({
  solarSettings,
  onChangeSolarSettings,
}) => {
  const { hour, season, isPlaying, speed, artificialLights } = solarSettings;
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Automatic Timeline Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const step = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const hoursToAdd = delta * speed * 0.4;
      onChangeSolarSettings({
        hour: (hour + hoursToAdd) % 24,
      });

      animationRef.current = requestAnimationFrame(step);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, hour, speed, onChangeSolarSettings]);

  // Format display time
  const formatTimeStr = (hr: number) => {
    const totalMin = Math.floor(hr * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return {
      time: `${displayH}:${m.toString().padStart(2, "0")}`,
      ampm,
    };
  };

  // Sun Altitude calculation
  const getSunAltitude = (h: number, s: "spring" | "summer" | "winter") => {
    const maxAlt = s === "summer" ? 72 : s === "winter" ? 32 : 52;
    const normalizedTime = Math.sin(((h - 6) / 12) * Math.PI);
    return Math.max(0, Math.round(normalizedTime * maxAlt));
  };

  const altitude = getSunAltitude(hour, season);
  const isDaylight = hour >= 6 && hour <= 19.5;

  // Mood determination
  let kelvin = 5500;
  let moodName = "Daylight";
  let moodTagColor = "bg-[#1E2342] border-[#384074] text-[#8CA4F8]";

  if (hour < 5.5 || hour > 21) {
    kelvin = 8500;
    moodName = "Night / Ambient";
    moodTagColor = "bg-[#181D35] border-[#2E365E] text-[#8699E8]";
  } else if (hour >= 5.5 && hour < 7.2) {
    kelvin = 2800;
    moodName = "Dawn Sunrise";
    moodTagColor = "bg-[#331C24] border-[#683444] text-[#F692AA]";
  } else if (hour >= 7.2 && hour < 11) {
    kelvin = 4800;
    moodName = "Morning Light";
    moodTagColor = "bg-[#2A2616] border-[#5E522E] text-[#F4D77A]";
  } else if (hour >= 11 && hour < 14) {
    kelvin = 6500;
    moodName = "Solar Noon";
    moodTagColor = "bg-[#2E2812] border-[#6E5D24] text-[#FDE047]";
  } else if (hour >= 14 && hour < 17) {
    kelvin = 5200;
    moodName = "Afternoon Daylight";
    moodTagColor = "bg-[#2A2416] border-[#5E4C2A] text-[#F6C66D]";
  } else if (hour >= 17 && hour < 19) {
    kelvin = 2400;
    moodName = "Golden Hour";
    moodTagColor = "bg-[#352014] border-[#723E20] text-[#FB923C]";
  } else {
    kelvin = 7800;
    moodName = "Blue Hour / Twilight";
    moodTagColor = "bg-[#1E2342] border-[#384074] text-[#8CA4F8]";
  }

  const timeFormatted = formatTimeStr(hour);

  // 6 Presets matching the user's uploaded image
  const PRESET_HOURS = [
    { label: "Dawn", hr: 6.2, iconType: "dawn" },
    { label: "Morning", hr: 9.5, iconType: "morning" },
    { label: "Noon", hr: 12.0, iconType: "noon" },
    { label: "Golden Hour", hr: 17.5, iconType: "golden" },
    { label: "Dusk", hr: 19.8, iconType: "dusk" },
    { label: "Night", hr: 23.0, iconType: "night" },
  ];

  return (
    <div className="w-full bg-[#141518] border border-[#2A2B33] rounded-[22px] p-4 text-[#E5E5E5] select-none space-y-4 shadow-xl">
      {/* Top Row: Icon Badge, Time, Mood & Metrics */}
      <div className="flex items-start gap-3">
        {/* Left Glowing Icon Badge */}
        <div className="w-11 h-11 shrink-0 rounded-2xl bg-[#222543] border border-[#353965] flex items-center justify-center text-[#8C8BFF] shadow-md shadow-[#222543]/40">
          {isDaylight ? (
            <Sun className="w-5 h-5 text-amber-300" />
          ) : (
            <Moon className="w-5 h-5 text-[#8C8BFF]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-extrabold text-white tracking-tight font-sans">
              {timeFormatted.time} <span className="text-sm font-bold text-white/90">{timeFormatted.ampm}</span>
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${moodTagColor} whitespace-nowrap`}>
              {moodName}
            </span>
          </div>

          {/* Sub-row metrics */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#8A8E9E] mt-1 font-medium flex-wrap">
            <span>
              Sun Alt: <strong className="text-white font-bold">{altitude}°</strong>
            </span>
            <span className="text-[#4E5263]">•</span>
            <span>
              Temp: <strong className="text-white font-bold">{kelvin}K</strong>
            </span>
            <span className="text-[#4E5263]">•</span>
            <span>
              Illuminance:{" "}
              <strong className="text-white font-bold">
                {isDaylight ? `${altitude * 950} Lux` : "35 Lux"}
              </strong>{" "}
              <span className="text-[#727685]">{isDaylight ? "" : "(Indoor)"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Season Toggle, Lamps ON/OFF Button, Play/Speed Toggle */}
      <div className="flex items-center justify-between gap-1.5 pt-0.5 flex-wrap">
        {/* Season Segmented Control */}
        <div className="flex items-center bg-[#1D1E24] rounded-xl border border-[#2E303B] p-0.5 text-xs">
          {(["Summer", "Spring", "Winter"] as const).map((s) => {
            const val = s.toLowerCase() as "summer" | "spring" | "winter";
            const isActive = season === val;
            return (
              <button
                key={s}
                onClick={() => onChangeSolarSettings({ season: val })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  isActive
                    ? "bg-[#5B50F6] text-white shadow-md shadow-[#5B50F6]/30"
                    : "text-[#8A8E9E] hover:text-white"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Lamps ON / OFF Button */}
        <button
          onClick={() => onChangeSolarSettings({ artificialLights: !artificialLights })}
          className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
            artificialLights
              ? "bg-[#382F16] border-[#A17C2A] text-[#F9C351] shadow-sm shadow-[#A17C2A]/20"
              : "bg-[#1D1E24] border-[#2E303B] text-[#8A8E9E] hover:text-white"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-[#F9C351]" />
          <span>Lamps {artificialLights ? "ON" : "OFF"}</span>
        </button>

        <div className="flex items-center gap-1">
          {/* Speed Toggle */}
          <button
            onClick={() =>
              onChangeSolarSettings({ speed: speed === 1 ? 2 : speed === 2 ? 4 : 1 })
            }
            className="px-2.5 py-1 bg-[#1D1E24] hover:bg-[#262830] text-white border border-[#2E303B] rounded-xl text-[11px] font-bold font-mono transition-colors"
            title="Cycle Playback Speed"
          >
            {speed}x
          </button>

          {/* Play/Pause Playback */}
          <button
            onClick={() => onChangeSolarSettings({ isPlaying: !isPlaying })}
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold transition-all shadow-md ${
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-[#5B50F6] hover:bg-[#4E44E0] text-white shadow-[#5B50F6]/30"
            }`}
            title={isPlaying ? "Pause Sun Cycle" : "Simulate 24H Day-to-Night Cycle"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* 24-Hour Slider with Smooth Day-to-Night Gradient */}
      <div className="space-y-1 pt-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="24"
            step="0.05"
            value={hour}
            onChange={(e) =>
              onChangeSolarSettings({ hour: parseFloat(e.target.value), isPlaying: false })
            }
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-[#746CF5]"
            style={{
              background:
                "linear-gradient(to right, #242247 0%, #353366 18%, #EAB308 50%, #353366 82%, #242247 100%)",
            }}
          />
        </div>

        {/* 24-Hour Time Scale Labels */}
        <div className="flex items-center justify-between text-[10px] text-[#787C8F] font-medium pt-0.5">
          <div className="flex flex-col items-start">
            <span className="font-mono text-white/90">00:00</span>
            <span className="text-[9px] text-[#636677]">(Midnight)</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono text-white/90">06:00</span>
            <span className="text-[9px] text-[#636677]">(Dawn)</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono text-white/90">12:00</span>
            <span className="text-[9px] text-[#636677]">(Noon)</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-mono text-white/90">18:00</span>
            <span className="text-[9px] text-[#636677]">(Sunset)</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-white/90">24:00</span>
          </div>
        </div>
      </div>

      {/* 6 Bottom Presets Grid matching the image */}
      <div className="grid grid-cols-6 gap-1.5 pt-1">
        {PRESET_HOURS.map((p) => {
          const isCurrent = Math.abs(hour - p.hr) < 1.1;

          return (
            <button
              key={p.label}
              onClick={() => onChangeSolarSettings({ hour: p.hr, isPlaying: false })}
              className={`py-2 px-0.5 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all border ${
                isCurrent
                  ? "bg-[#252852] border-[#5B50F6] text-white font-extrabold shadow-md shadow-[#5B50F6]/20"
                  : "bg-[#1B1C22] border-[#2C2D37] text-[#7E8294] hover:text-white hover:border-[#3E404D]"
              }`}
            >
              {p.iconType === "dawn" && (
                <div className="flex items-center justify-center w-4 h-4 text-amber-300">
                  <Sunrise className="w-3.5 h-3.5" />
                </div>
              )}
              {p.iconType === "morning" && (
                <div className="flex items-center justify-center w-4 h-4 text-amber-200">
                  <Sun className="w-3.5 h-3.5" />
                </div>
              )}
              {p.iconType === "noon" && (
                <div className="flex items-center justify-center w-4 h-4 text-yellow-300">
                  <Sun className="w-3.5 h-3.5" />
                </div>
              )}
              {p.iconType === "golden" && (
                <div className="flex items-center justify-center w-4 h-4 text-orange-400">
                  <Sunset className="w-3.5 h-3.5" />
                </div>
              )}
              {p.iconType === "dusk" && (
                <div className="flex items-center justify-center w-4 h-4 text-[#8C8BFF]">
                  <Moon className="w-3.5 h-3.5" />
                </div>
              )}
              {p.iconType === "night" && (
                <div className="flex items-center justify-center w-4 h-4 text-indigo-300">
                  <Moon className="w-3.5 h-3.5" />
                </div>
              )}

              <span className="text-[10px] leading-none whitespace-nowrap">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};


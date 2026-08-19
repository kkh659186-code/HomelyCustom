import React, { useState } from "react";
import { AIAssistantChat } from "./AIAssistantChat";
import { ShoppingCartPanel } from "./ShoppingCartPanel";
import { PlacedItem, RoomSettings, RoomTheme } from "../types";
import { Sparkles, ShoppingBag } from "lucide-react";

interface RightPanelProps {
  roomSettings: RoomSettings;
  placedItems: PlacedItem[];
  currentTheme: RoomTheme;
  onThemeChange: (theme: RoomTheme) => void;
  onSpawnProduct: (productId: string) => void;
  onUpdateRoomSettings: (settings: Partial<RoomSettings>) => void;
  onRemoveItem: (instanceId: string) => void;
  onOpenCheckout: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  roomSettings,
  placedItems,
  currentTheme,
  onThemeChange,
  onSpawnProduct,
  onUpdateRoomSettings,
  onRemoveItem,
  onOpenCheckout,
}) => {
  const [activeTab, setActiveTab] = useState<"ai_assistant" | "shopping_cart">("ai_assistant");

  return (
    <aside className="w-72 lg:w-80 h-full border-l border-[#2D2D2D] bg-[#121212] flex flex-col text-[#E5E5E5] select-none overflow-hidden z-20 transition-colors">
      {/* Top Tab Switcher */}
      <div className="p-3 border-b border-[#2D2D2D]">
        <div className="flex gap-1.5 p-1 bg-[#1A1A1A] rounded-lg border border-[#2D2D2D] text-xs font-medium">
          <button
            onClick={() => setActiveTab("ai_assistant")}
            className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 rounded transition-all ${
              activeTab === "ai_assistant"
                ? "bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/30"
                : "text-[#888] hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab("shopping_cart")}
            className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 rounded transition-all ${
              activeTab === "shopping_cart"
                ? "bg-indigo-600/15 text-indigo-400 font-semibold border border-indigo-500/30"
                : "text-[#888] hover:text-white"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Shopping ({placedItems.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "ai_assistant" ? (
        <AIAssistantChat
          roomSettings={roomSettings}
          placedItems={placedItems}
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          onSpawnProduct={onSpawnProduct}
          onUpdateRoomSettings={onUpdateRoomSettings}
        />
      ) : (
        <ShoppingCartPanel
          placedItems={placedItems}
          onRemoveItem={onRemoveItem}
          onOpenCheckout={onOpenCheckout}
        />
      )}
    </aside>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { AIChatMessage, PlacedItem, ProductItem, RoomSettings, RoomTheme } from "../types";
import { MOCK_PRODUCTS, STYLE_THEMES } from "../data/mockProducts";
import { Sparkles, Send, Bot, User, PlusCircle, Check } from "lucide-react";
import { HomelyLogo } from "./HomelyLogo";

interface AIAssistantChatProps {
  roomSettings: RoomSettings;
  placedItems: PlacedItem[];
  currentTheme: RoomTheme;
  onThemeChange: (theme: RoomTheme) => void;
  onSpawnProduct: (productId: string) => void;
  onUpdateRoomSettings: (settings: Partial<RoomSettings>) => void;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  roomSettings,
  placedItems,
  currentTheme,
  onThemeChange,
  onSpawnProduct,
  onUpdateRoomSettings,
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text: `Hello! I'm **Homely AI Design Assistant**, your Senior Architect and Interior Space Planner for **${roomSettings.type}** in **${currentTheme}** aesthetic.\n\nAsk me anything about **architectural clearances**, **daylighting & window orientation**, **structural layout**, **bed/mattress/pillow stacking**, or **curated furniture specifications**!`,
      timestamp: "Just now",
      suggestedActions: [
        { label: "Analyze Walkway Clearances", actionType: "optimize_layout", payload: null },
        { label: "Window & Daylight Guide", actionType: "optimize_layout", payload: null },
        { label: "Add Master Bed Frame", actionType: "add_furniture", payload: "prod-cb2-drommen-bed" },
        { label: "Add Aeron Task Chair", actionType: "add_furniture", payload: "prod-herman-miller-aeron" },
        { label: "Add HAY Dining Table", actionType: "add_furniture", payload: "prod-hay-cph30-table" },
        { label: "Add Menu Brass Clock", actionType: "add_furniture", payload: "prod-menu-hanging-clock" },
      ],
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim()) return;

    const userMsg: AIChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: "Now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/gemini/design-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          roomType: roomSettings.type,
          currentStyle: currentTheme,
          placedItems: placedItems.map((p) => {
            const prod = MOCK_PRODUCTS.find((m) => m.id === p.productId);
            return { name: prod?.name, brand: prod?.brand, x: p.x, y: p.y, rotation: p.rotation };
          }),
        }),
      });

      const data = await response.json();

      const botMsg: AIChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: "assistant",
        text: data.text || "Here are my design recommendations for your room.",
        timestamp: "Now",
        suggestedActions: data.suggestedActions || (data.suggestedStyle
          ? [{ label: `Apply ${data.suggestedStyle} Style`, actionType: "apply_style", payload: data.suggestedStyle }]
          : undefined),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.suggestedStyle && STYLE_THEMES[data.suggestedStyle as RoomTheme]) {
        onThemeChange(data.suggestedStyle as RoomTheme);
      }
    } catch (err) {
      console.error("AI Assistant response error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-bot-${Date.now()}`,
          sender: "assistant",
          text: `I've analyzed your **${roomSettings.type}** layout. Your furniture placements maintain ideal sightlines and generous walking paths!`,
          timestamp: "Now",
          suggestedActions: [
            { label: "Add Menu Brass Clock", actionType: "add_furniture", payload: "prod-menu-hanging-clock" },
            { label: "Add Wishbone Chair", actionType: "add_furniture", payload: "prod-wishbone-dining-chair" },
          ],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionClick = (action: { label: string; actionType: string; payload: any }) => {
    if (action.actionType === "apply_style" && action.payload) {
      onThemeChange(action.payload as RoomTheme);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-sys-${Date.now()}`,
          sender: "system",
          text: `Applied **${action.payload}** aesthetic to room palette and materials.`,
          timestamp: "Now",
        },
      ]);
    } else if (action.actionType === "add_furniture" && action.payload) {
      onSpawnProduct(action.payload);
      const prod = MOCK_PRODUCTS.find((m) => m.id === action.payload);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-sys-${Date.now()}`,
          sender: "system",
          text: `Placed **${prod?.name || "furniture piece"}** directly onto your 3D canvas!`,
          timestamp: "Now",
        },
      ]);
    } else if (action.actionType === "optimize_layout") {
      handleSendMessage("Analyze my furniture layout and suggest optimal spacing.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121212]">
      {/* Header bar */}
      <div className="px-4 py-2.5 border-b border-[#2D2D2D] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/homely-logo.svg"
            alt="Homely AI Assistant"
            className="w-5 h-5 rounded-full object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400">
            Homely AI Design Assistant
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-600/20 text-indigo-300 font-mono">
            Gemini 3.7
          </span>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="p-2 border-b border-[#2D2D2D] flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] bg-[#161616]">
        {[
          "Analyze architectural clearances",
          "Window & daylight orientation",
          "Suggest bed & mattress setup",
          "Add Aeron office chair",
          "Kitchen work triangle",
          "Recommend dining tables",
          "Suggest hanging clocks",
          "Acoustic & NRC rating",
          "Apply Japandi aesthetic",
        ].map((chip, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(chip)}
            className="px-2.5 py-1 rounded-md bg-[#1F1F1F] hover:bg-[#2A2A2A] text-[#AAA] hover:text-white border border-[#2D2D2D] whitespace-nowrap text-[10px] font-medium transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs shadow-sm overflow-hidden ${
                msg.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : msg.sender === "assistant"
                  ? "bg-[#1A1A1A] text-indigo-400 border border-[#2D2D2D]"
                  : "bg-[#1A1A1A] text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {msg.sender === "user" ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <img
                  src="/homely-logo.svg"
                  alt="Homely AI"
                  className="w-4 h-4 object-contain rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div
              className={`max-w-[90%] rounded-lg p-3 leading-relaxed text-xs space-y-2 ${
                msg.sender === "user"
                  ? "bg-indigo-600/20 border border-indigo-500/40 text-indigo-100"
                  : msg.sender === "assistant"
                  ? "bg-[#1A1A1A] border border-[#2D2D2D] text-[#E5E5E5]"
                  : "bg-emerald-950/20 border border-emerald-500/30 text-emerald-300"
              }`}
            >
              <div className="whitespace-pre-line font-sans space-y-1">
                {msg.text.split("\n").map((line, idx) => {
                  if (line.startsWith("### ")) {
                    return <h4 key={idx} className="font-bold text-white text-xs pt-1">{line.replace("### ", "")}</h4>;
                  }
                  if (line.startsWith("## ")) {
                    return <h3 key={idx} className="font-bold text-white text-sm pt-1">{line.replace("## ", "")}</h3>;
                  }
                  if (line.startsWith("- ")) {
                    const content = line.replace("- ", "");
                    return (
                      <div key={idx} className="flex items-start gap-1.5 pl-1 text-[11.5px] text-[#CCC]">
                        <span className="text-indigo-400 mt-1">•</span>
                        <span>{content}</span>
                      </div>
                    );
                  }
                  return <p key={idx} className="text-[11.5px]">{line}</p>;
                })}
              </div>

              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#2D2D2D] flex flex-wrap gap-1.5">
                  {msg.suggestedActions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => handleActionClick(act)}
                      className="px-2.5 py-1 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 rounded-md text-[10px] font-semibold border border-indigo-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <PlusCircle className="w-3 h-3 text-indigo-400" />
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-[#1A1A1A] text-indigo-400 border border-[#2D2D2D] flex items-center justify-center text-xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg p-2.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-[#2D2D2D] bg-[#121212]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask Homely AI about architecture, clearances, daylighting, or styling..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg px-3 py-2 text-xs text-white placeholder-[#666] focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg transition-colors shadow-sm"
            title="Send to AI Assistant"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

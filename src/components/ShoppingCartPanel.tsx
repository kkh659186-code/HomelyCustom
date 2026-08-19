import React from "react";
import { PlacedItem, ProductItem, ShoppingCartItem } from "../types";
import { getProductById } from "../data/mockProducts";
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  CheckCircle,
  Trash2,
  Zap,
} from "lucide-react";

interface ShoppingCartPanelProps {
  placedItems: PlacedItem[];
  onRemoveItem: (instanceId: string) => void;
  onOpenCheckout: () => void;
}

export const ShoppingCartPanel: React.FC<ShoppingCartPanelProps> = ({
  placedItems,
  onRemoveItem,
  onOpenCheckout,
}) => {
  const cartMap = new Map<string, ShoppingCartItem>();

  placedItems.forEach((placed) => {
    const product = getProductById(placed.productId);
    if (!product) return;

    if (cartMap.has(product.id)) {
      const existing = cartMap.get(product.id)!;
      existing.quantity += 1;
      existing.instances.push(placed.instanceId);
    } else {
      cartMap.set(product.id, {
        product,
        quantity: 1,
        instances: [placed.instanceId],
      });
    }
  });

  const cartItems = Array.from(cartMap.values());
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const originalSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.originalPrice * item.quantity,
    0
  );
  const totalSavings = originalSubtotal - subtotal;
  const estimatedTax = subtotal * 0.0825;
  const shippingCost = subtotal > 1500 || subtotal === 0 ? 0 : 199;
  const finalTotal = subtotal + estimatedTax + shippingCost;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121212]">
      {/* Top Header */}
      <div className="p-3 border-b border-[#2D2D2D] flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-bold text-[#666]">
          Shopping List ({placedItems.length})
        </span>
        {totalSavings > 0 && (
          <span className="text-[10px] text-emerald-400 font-bold">
            Save ${totalSavings.toLocaleString()}
          </span>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#666] space-y-2">
            <ShoppingBag className="w-8 h-8 stroke-1 text-[#444]" />
            <p className="text-xs font-semibold text-[#888]">No items in current layout</p>
            <p className="text-[10px] text-[#666] max-w-[180px]">
              Add items from the catalog to build your consolidated order.
            </p>
          </div>
        ) : (
          cartItems.map(({ product, quantity, instances }) => (
            <div
              key={product.id}
              className="flex items-center gap-3 bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg p-2.5 transition-colors"
            >
              <div className="w-10 h-10 bg-[#242424] rounded overflow-hidden flex-shrink-0">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-white truncate">{product.name}</div>
                <div className="text-[10px] text-[#666] truncate">
                  {product.brand} • {quantity} {quantity === 1 ? "Unit" : "Units"}
                </div>
              </div>

              <div className="text-right flex items-center gap-2">
                <span className="text-[11px] font-bold text-white font-mono">
                  ${(product.price * quantity).toLocaleString()}
                </span>
                <button
                  onClick={() => onRemoveItem(instances[instances.length - 1])}
                  className="text-[#666] hover:text-red-400 p-0.5 rounded transition-colors"
                  title="Remove one"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout Footer */}
      {cartItems.length > 0 && (
        <div className="p-3 border-t border-[#2D2D2D] space-y-3 bg-[#121212]">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-[#888]">Total Est. Delivery In 3-5 Days</span>
            <span className="text-sm font-bold text-white font-mono">
              ${Math.round(finalTotal).toLocaleString()}
            </span>
          </div>

          <button
            onClick={onOpenCheckout}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg text-xs font-bold text-white uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>1-Click Checkout</span>
          </button>
        </div>
      )}
    </div>
  );
};

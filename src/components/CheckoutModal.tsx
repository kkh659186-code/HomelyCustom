import React, { useState } from "react";
import { PlacedItem, ProductItem } from "../types";
import { MOCK_PRODUCTS } from "../data/mockProducts";
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  CheckCircle,
  X,
  CreditCard,
  Building2,
  Lock,
  ArrowRight,
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  placedItems: PlacedItem[];
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  placedItems,
}) => {
  const [orderComplete, setOrderComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Group items by brand
  const itemsWithProducts = placedItems
    .map((p) => MOCK_PRODUCTS.find((m) => m.id === p.productId))
    .filter((p): p is ProductItem => !!p);

  const brandGroups = new Map<string, { brand: string; items: ProductItem[] }>();
  itemsWithProducts.forEach((prod) => {
    if (brandGroups.has(prod.brand)) {
      brandGroups.get(prod.brand)!.items.push(prod);
    } else {
      brandGroups.set(prod.brand, { brand: prod.brand, items: [prod] });
    }
  });

  const subtotal = itemsWithProducts.reduce((sum, item) => sum + item.price, 0);
  const originalSubtotal = itemsWithProducts.reduce((sum, item) => sum + item.originalPrice, 0);
  const totalSavings = originalSubtotal - subtotal;
  const estimatedTax = subtotal * 0.0825;
  const shipping = subtotal > 1500 || subtotal === 0 ? 0 : 199;
  const finalTotal = subtotal + estimatedTax + shipping;

  const handlePlaceOrder = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setOrderComplete(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2D2D2D] rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[#E5E5E5]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2D2D2D] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-indigo-600 text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                1-Click Multi-Brand Checkout
              </h2>
              <p className="text-[11px] text-[#888]">
                Consolidated cart across {brandGroups.size} verified trade manufacturers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888] hover:text-white hover:bg-[#1A1A1A] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {orderComplete ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Order Confirmed & Dispatched to Manufacturers!
            </h3>
            <p className="text-xs text-[#888] max-w-md mx-auto">
              Thank you for designing with Realize Custom. Your order #RC-98421 has been submitted directly to {brandGroups.size} trade manufacturers with consolidated white-glove delivery scheduled.
            </p>
            <div className="pt-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-600/20"
              >
                Return to 3D Canvas
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Price Match Banner */}
            <div className="p-3 bg-emerald-600/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Trade Price Match Guarantee Active</span>
              </div>
              <span className="font-bold text-white font-mono">
                -${totalSavings.toLocaleString()} Total Savings
              </span>
            </div>

            {/* Manufacturer Groups */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#666]">
                Consolidated Shipments ({brandGroups.size} Manufacturers)
              </div>

              <div className="space-y-2">
                {Array.from(brandGroups.values()).map(({ brand, items }) => (
                  <div key={brand} className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs border-b border-[#2D2D2D] pb-1.5">
                      <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {brand}
                      </span>
                      <span className="text-[10px] text-[#888]">Direct Manufacturer Fulfillment</span>
                    </div>

                    <div className="space-y-1.5">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-[#E5E5E5]">{it.name}</span>
                          <span className="font-mono text-white font-semibold">${it.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-lg p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-[#888]">
                <span>Items Subtotal</span>
                <span className="font-mono text-[#E5E5E5]">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#888]">
                <span>Estimated Tax (8.25%)</span>
                <span className="font-mono text-[#E5E5E5]">${Math.round(estimatedTax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#888]">
                <span>Consolidated White-Glove Delivery</span>
                <span className="font-mono text-emerald-400">
                  {shipping === 0 ? "FREE" : `$${shipping}`}
                </span>
              </div>
              <div className="border-t border-[#2D2D2D] pt-2 flex justify-between font-bold text-sm text-white">
                <span>Grand Total</span>
                <span className="font-mono">${Math.round(finalTotal).toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || placedItems.length === 0}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 uppercase tracking-widest transition-all"
            >
              {isSubmitting ? (
                <span>Routing to Manufacturers...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Place Multi-Brand Order (${Math.round(finalTotal).toLocaleString()})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

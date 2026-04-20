// app/product/[id]/page.js
import OstadMagnifier from "@/components/ui/OstadMagnifier";

export default function ProductPage({ params }) {
  // This would come from your API
  const product = {
    id: "wrench-set-304",
    name: "آچار بوکس استیل ۳۰۴",
    brand: "FA-TOOLS",
    engraving: "FA-304 STAINLESS JAPAN",
    image: "/images/tools/wrench-304-detail.jpg",
    price: 2850000,
  };

  return (
    <div className="parsian-container py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Magnifier */}
        <div>
          <OstadMagnifier
            imageSrc={product.image}
            imageAlt={product.name}
            expectedEngraving={product.engraving}
          />

          {/* Thumbnail Strip */}
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-20 h-20 flex-shrink-0 rounded-lg border border-parsian-border overflow-hidden cursor-pointer hover:border-parsian-gold transition-colors"
              >
                <img
                  src={`/images/tools/wrench-304-${i}.jpg`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Product Info */}
        <div className="space-y-6">
          {/* Ostad Warning Box */}
          <div className="parsian-warning">
            <h3 className="parsian-warning-title">⚠️ هشدار استادکار</h3>
            <p className="parsian-warning-text">
              نمونه‌های تقلبی این محصول فاقد حکاکی لیزری با عمق مناسب هستند.
              لطفاً قبل از خرید، با ذره‌بین، حکاکی را بررسی کنید.
            </p>
          </div>

          {/* Product Title & Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="parsian-badge-genuine">
                <span>✓</span>
                <span>کالای اورجینال</span>
              </span>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl text-parsian-blue">
              {product.name}
            </h1>
            <p className="font-body text-parsian-steel/60 mt-1">
              برند: {product.brand}
            </p>
          </div>

          {/* Price */}
          <div className="bg-parsian-concrete rounded-xl p-4">
            <div className="flex items-end gap-3">
              <span className="parsian-price">۲,۸۵۰,۰۰۰</span>
              <span className="font-body text-sm text-parsian-steel/60">
                تومان
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="parsian-price-old">۳,۲۰۰,۰۰۰</span>
              <span className="parsian-price-discount">۱۱٪ تخفیف</span>
            </div>
          </div>

          {/* Add to Cart */}
          <button className="w-full parsian-btn-primary text-lg py-4">
            <span className="flex items-center justify-center gap-2">
              <span>🛒</span>
              <span>افزودن به سبد خرید</span>
            </span>
          </button>

          {/* Ostad Comment */}
          <div className="border-t border-parsian-border pt-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-parsian-blue/10 flex items-center justify-center flex-shrink-0">
                <span className="font-heading text-parsian-blue">ا</span>
              </div>
              <div>
                <p className="font-heading text-sm text-parsian-blue">
                  استاد کریمی
                </p>
                <p className="font-body text-sm text-parsian-steel/80 mt-1">
                  "حکاکیش عمق خوبی داره. جنس استیلش هم از صداش مشخصه. من ۱۵ ساله
                  از این برند استفاده می‌کنم."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

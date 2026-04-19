export default function Home() {
  return (
    <div>
      <div className="ostad-container min-h-screen py-8">
        <div className="ostad-card p-6">
          <h1 className="font-heavy text-4xl text-ostad-blue mb-4">
            تست Tailwind v3
          </h1>

          <div className="space-y-4">
            <p className="font-body text-lg">
              اگر این متن با فونت کلمه نمایش داده شود، تنظیمات صحیح است
            </p>

            <p className="font-heavy text-ostad-rust">
              اگر این متن با فونت تیتر و رنگ قرمز نمایش داده شود، همه چیز عالی
              است
            </p>

            <div className="ostad-warning-box">
              <p className="ostad-warning-text">
                باکس هشدار استاد با Border Right
              </p>
            </div>

            <button className="ostad-button-primary w-full md:w-auto">
              دکمه اصلی استاد
            </button>

            <button className="ostad-button-gold w-full md:w-auto">
              دکمه طلایی
            </button>
          </div>

          {/* Responsive Test */}
          <div className="mt-8 p-4 bg-ostad-dark text-white rounded-lg">
            <p className="text-xs xs:text-sm sm:text-base md:text-lg">
              سایز صفحه نمایش:
              <span className="block xs:hidden">موبایل</span>
              <span className="hidden xs:block sm:hidden">XS (475px+)</span>
              <span className="hidden sm:block md:hidden">SM (640px+)</span>
              <span className="hidden md:block">MD+ (768px+)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

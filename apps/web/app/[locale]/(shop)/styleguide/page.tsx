"use client";

import { useState } from "react";
import {
  Badge,
  Breadcrumb,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Chip,
  Drawer,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Radio,
  Select,
  Skeleton,
  Spinner,
  Tabs,
  Textarea,
  Toaster,
  Tooltip,
} from "@/components/primitives";
// By file path, not the barrel -- see the note in primitives/index.ts: these
// six cost every client-tree consumer of the barrel +8KB if exported there.
// P11.S3: by file path, same barrel rule -- see primitives/index.ts.
import { RadioGroup } from "@/components/primitives/RadioGroup";
import { SearchField } from "@/components/primitives/SearchField";
import { Switch } from "@/components/primitives/Switch";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Sheet } from "@/components/primitives/Sheet";
import { Receipt } from "@/components/primitives/Receipt";
import { PriceTag } from "@/components/primitives/PriceTag";
import { LinkPagination } from "@/components/primitives/LinkPagination";
import { OrderStatusRail } from "@/components/account/OrderStatus";
import { CountUp, Marquee, Reveal, Stagger } from "@/components/motion";
import { useToastStore } from "@/stores/toast-store";

// P1.S7 proof-of-wiring page: every primitive, real Persian copy (not
// lorem), reachable and legible in both themes. Not a shipped storefront
// route -- kept for regression-checking the primitives as more land.
export default function StyleguidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [shipping, setShipping] = useState("courier");
  const [searching, setSearching] = useState(false);
  const showToast = useToastStore((state) => state.show);

  return (
    <main className="mx-auto flex max-w-container flex-col gap-8 p-6">
      <Breadcrumb items={[{ label: "پارسیان", href: "/" }, { label: "راهنمای اجزا" }]} />

      <section className="flex flex-col gap-2">
        <h1 className="font-display text-h1 font-black text-text">راهنمای اجزا</h1>
        <p className="text-body text-text-muted">
          هر جزء پایه با متن فارسی واقعی، هر دو تم و پیمایش صفحه‌کلید.
        </p>
      </section>

      <Card className="flex flex-wrap gap-3">
        <Button variant="brand">افزودن به گاراژ</Button>
        <Button variant="cta">افزودن به سبد خرید</Button>
        <Button variant="ghost">جزئیات بیشتر</Button>
        <Button variant="outline">مقایسه</Button>
        <Button variant="brand" disabled>
          غیرفعال
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        <Input label="جستجوی قطعه" placeholder="مثلاً لنت ترمز" />
        <Input label="کد فنی" error="این فیلد الزامی است." />
        <Select label="سیستم خودرو" defaultValue="brake">
          <option value="engine">موتوری</option>
          <option value="brake">ترمز</option>
          <option value="electric">برقی</option>
        </Select>
        <Textarea label="یادداشت سفارش" helperText="اختیاری" />
        <div className="flex flex-wrap gap-4">
          <Checkbox label="اطلاع‌رسانی موجودی مجدد" defaultChecked />
          <Radio label="پرداخت در محل" name="payment" defaultChecked />
          <Radio label="پرداخت آنلاین" name="payment" />
        </div>
      </Card>

      {/* P11.S3 — the form primitives the design system was missing. */}
      <Card className="gap-5 flex flex-col">
        <h2 className="text-h3 font-semibold text-text">اجزای فرم</h2>

        <SearchField
          label="جستجوی قطعه با کد فنی"
          placeholder="مثلاً 0K9A03328Z"
          loading={searching}
          onClear={() => showToast("جستجو پاک شد", "neutral")}
        />
        <Button variant="ghost" size="sm" onClick={() => setSearching((busy) => !busy)}>
          {searching ? "پایان حالت جستجو" : "نمایش حالت جستجو"}
        </Button>

        <RadioGroup
          name="shipping-demo"
          legend="روش ارسال"
          value={shipping}
          onChange={setShipping}
          required
          options={[
            {
              value: "courier",
              label: "پیک درون‌شهری",
              description: "تحویل تا ۳ ساعت — ۱۵۰٬۰۰۰ ریال",
            },
            {
              value: "post",
              label: "پست پیشتاز",
              description: "تحویل ۲ تا ۴ روز کاری — ۲۵۰٬۰۰۰ ریال",
            },
            { value: "pickup", label: "تحویل حضوری", description: "انبار مرکزی، تهران" },
          ]}
        />

        <RadioGroup
          name="warranty-demo"
          legend="نوع ضمانت"
          orientation="horizontal"
          defaultValue="seller"
          error="برای ادامه، یک گزینه را انتخاب کنید."
          options={[
            { value: "seller", label: "ضمانت فروشنده" },
            { value: "manufacturer", label: "ضمانت کارخانه" },
          ]}
        />

        <div className="flex flex-col gap-3">
          <Switch
            label="اطلاع‌رسانی پیامکی"
            helperText="برای تغییر وضعیت سفارش پیامک دریافت کنید."
            defaultChecked
          />
          <Switch label="نمایش قیمت عمده" />
          <Switch label="حالت غیرفعال" disabled />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="cta" loading>
            در حال ثبت سفارش…
          </Button>
          <Button variant="outline" loading>
            در حال بررسی…
          </Button>
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" />
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-3">
        <Badge tone="brand">سازگار</Badge>
        <Badge tone="warning">بررسی شود</Badge>
        <Badge tone="danger">ناموجود</Badge>
        <Badge tone="info">جدید</Badge>
        <Chip onRemove={() => showToast("فیلتر حذف شد", "neutral")}>برند: بوش</Chip>
        <Tooltip label="ضمانت اصالت کالا">
          <Button variant="ghost">نشان اصالت</Button>
        </Tooltip>
      </Card>

      <Card className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </Card>

      <Card>
        <Tabs defaultValue="fitment">
          <Tabs.List>
            <Tabs.Trigger value="fitment">سازگاری</Tabs.Trigger>
            <Tabs.Trigger value="specs">مشخصات</Tabs.Trigger>
            <Tabs.Trigger value="reviews">نظرات</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Panel value="fitment">این قطعه با پراید ۱۳۱ سازگار است.</Tabs.Panel>
          <Tabs.Panel value="specs">جنس: سرامیکی — وزن: ۴۲۰ گرم</Tabs.Panel>
          <Tabs.Panel value="reviews">هنوز نظری ثبت نشده است.</Tabs.Panel>
        </Tabs>
      </Card>

      <Card className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setModalOpen(true)}>
          باز کردن پنجره
        </Button>
        <Button variant="outline" onClick={() => setDrawerOpen(true)}>
          باز کردن کشو
        </Button>
        <Button variant="outline" onClick={() => showToast("تغییرات ذخیره شد", "success")}>
          نمایش اعلان
        </Button>
      </Card>

      <Pagination page={page} pageCount={5} onPageChange={setPage} />

      <EmptyState
        title="هیچ قطعه‌ای یافت نشد"
        description="فیلترها را تغییر دهید یا با کارشناسان تماس بگیرید."
        action={<Button variant="brand">تماس با پشتیبانی</Button>}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="تأیید عملیات">
        <p className="text-body text-text">آیا از انجام این عملیات مطمئن هستید؟</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            انصراف
          </Button>
          <Button variant="brand" onClick={() => setModalOpen(false)}>
            تأیید
          </Button>
        </div>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="فیلترها" side="end">
        <p className="text-body text-text-muted">فیلترهای دسته‌بندی در اینجا قرار می‌گیرند.</p>
      </Drawer>

      <Reveal>
        <Card>
          <p className="text-body text-text">
            این کارت هنگام ورود به دید، محو و کمی جابه‌جا نمایان می‌شود.
          </p>
        </Card>
      </Reveal>

      <Stagger className="grid grid-cols-3 gap-3">
        <Stagger.Item>
          <Card>موتوری</Card>
        </Stagger.Item>
        <Stagger.Item>
          <Card>ترمز</Card>
        </Stagger.Item>
        <Stagger.Item>
          <Card>برقی</Card>
        </Stagger.Item>
      </Stagger>

      <Card className="flex items-center gap-2">
        <CountUp value={12000} className="font-display text-h1 text-brand" />
        <span className="text-body text-text-muted">قطعه در انبار</span>
      </Card>

      <Marquee>
        {["بوش", "والئو", "NGK", "دنسو", "ساچمی"].map((brand) => (
          <span key={brand} className="text-h3 font-semibold text-text-muted">
            {brand}
          </span>
        ))}
      </Marquee>

      {/* ---- Workshop Docket: the document surfaces added for the
           account/commerce design pass. Kept here so e2e/styleguide-a11y
           covers them for free, and so the emphasis scale is visible in one
           place rather than inferred from call sites. */}
      <section className="flex flex-col gap-6">
        <PageHeader
          code="STY-01"
          titleAs="h2"
          title="سطوح سندی"
          meta={
            <Badge variant="dot" tone="info">
              نمونه
            </Badge>
          }
          actions={<ButtonLink href="/styleguide">اقدام اصلی</ButtonLink>}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Sheet>
            <Sheet.Header code="ITM" title="ردیف‌های سند" />
            <Sheet.Rows>
              <Sheet.Row href="/styleguide">
                <span className="flex flex-1 flex-col">
                  <span className="font-mono text-body font-medium text-text">PS-۱۴۰۴-۰۴۸۲۱</span>
                  <span className="text-caption text-text-muted">ردیف قابل کلیک</span>
                </span>
                <PriceTag priceRial={12500000} size="lg" />
              </Sheet.Row>
              <Sheet.Row>
                <span className="flex flex-1 flex-col">
                  <span className="text-body text-text">ردیف ساده</span>
                  <span className="font-mono text-caption text-text-muted">SKU-00912</span>
                </span>
                <PriceTag
                  priceRial={4200000}
                  compareAtRial={5100000}
                  isWholesale
                  wholesaleLabel="قیمت همکار"
                />
              </Sheet.Row>
            </Sheet.Rows>
          </Sheet>

          <Receipt title="جمع سفارش" code="SUM">
            <Receipt.Line label="جمع کالاها" value="۱۶٬۷۰۰٬۰۰۰ تومان" mono />
            <Receipt.Line label="تخفیف" value="-۱٬۲۰۰٬۰۰۰ تومان" mono emphasis="muted" />
            <Receipt.Line label="ارسال" value="۳۵۰٬۰۰۰ تومان" mono />
            <Receipt.Total label="مبلغ قابل پرداخت" value="۱۵٬۸۵۰٬۰۰۰ تومان" />
          </Receipt>
        </div>

        <Sheet>
          <Sheet.Header code="TRK" title="روند سفارش" />
          <div className="p-4">
            <OrderStatusRail
              currentStatus="shipped"
              currentLabel="وضعیت فعلی"
              labels={{
                pending: "در انتظار پرداخت",
                paid: "پرداخت شد",
                processing: "در حال آماده‌سازی",
                shipped: "ارسال شد",
                delivered: "تحویل شد",
                cancelled: "لغو شد",
                refunded: "مسترد شد",
              }}
              history={[
                { status: "pending", at: "2026-07-30T09:12:00.000Z" },
                { status: "paid", at: "2026-07-30T09:14:00.000Z" },
                { status: "processing", at: "2026-07-31T07:40:00.000Z" },
                { status: "shipped", at: "2026-08-01T11:05:00.000Z", note: "کد رهگیری صادر شد" },
              ]}
            />
          </div>
        </Sheet>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline">
            کوچک
          </Button>
          <Button size="md">متوسط</Button>
          <Button size="lg" variant="cta">
            بزرگ
          </Button>
          <Button size="icon" variant="ghost" aria-label="افزودن">
            +
          </Button>
        </div>

        <LinkPagination
          page={2}
          pageCount={5}
          hrefFor={(target) => `/styleguide?page=${target}`}
          labels={{ previous: "قبلی", next: "بعدی", status: "صفحه‌بندی نمونه" }}
        />
      </section>

      <Toaster />
    </main>
  );
}

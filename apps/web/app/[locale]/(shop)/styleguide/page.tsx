"use client";

import { useState } from "react";
import {
  Badge,
  Breadcrumb,
  Button,
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
  Tabs,
  Textarea,
  Toaster,
  Tooltip,
} from "@/components/primitives";
import { CountUp, Marquee, Reveal, Stagger } from "@/components/motion";
import { useToastStore } from "@/stores/toast-store";

// P1.S7 proof-of-wiring page: every primitive, real Persian copy (not
// lorem), reachable and legible in both themes. Not a shipped storefront
// route -- kept for regression-checking the primitives as more land.
export default function StyleguidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
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

      <Toaster />
    </main>
  );
}

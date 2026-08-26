"use client"; // Interactive demos -- every control below is stateful.

import { useState } from "react";
import {
  Alert,
  AlertTitle,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsIcon from "@mui/icons-material/Notifications";

const MONO = "var(--font-mono), ui-monospace, monospace";

/**
 * The MUI half of the system: what the 37 components under (admin)
 * actually build from, shown in every state a staff screen puts them in.
 *
 * All of it renders through lib/mui-theme.ts, whose palette mirrors
 * tokens.css value-for-value -- MUI's palette parser only understands
 * hex/rgb/hsl and throws on a var(), which is why those 24 literals exist
 * there and nowhere else. So a color change in tokens.css must be mirrored
 * in mui-theme.ts by hand; that is the one place in the system where drift
 * is possible, and it is why this tab sits next to the foundations tab.
 */
function Demo({
  code,
  title,
  note,
  children,
}: {
  code: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 4 }}>
      <Stack spacing={0.5} sx={{ mb: 1.5 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: 12, color: "text.secondary" }}>
          {code}
        </Typography>
        <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {note && (
          <Typography variant="body2" color="text.secondary">
            {note}
          </Typography>
        )}
      </Stack>
      <Paper variant="outlined" sx={{ p: 2 }}>
        {children}
      </Paper>
    </Box>
  );
}

export function AdminDesignSystemComponents() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(true);
  const [choice, setChoice] = useState("retail");
  const [status, setStatus] = useState("paid");
  const [page, setPage] = useState(1);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: "72ch" }}>
        نیمهٔ MUI سیستم — همان اجزایی که صفحه‌های پنل مدیریت از آن‌ها ساخته شده‌اند، در همهٔ
        حالت‌هایی که یک صفحهٔ واقعی به آن‌ها می‌رسد. رنگ‌ها از{" "}
        <code style={{ fontFamily: MONO }}>lib/mui-theme.ts</code> می‌آیند که مقدار به مقدار آینهٔ
        tokens.css است.
      </Typography>

      <Demo
        code="MUI-BUTTON"
        title="دکمه"
        note="پرشده برای کنش اصلی، خط‌دار برای کنش ثانویه، متنی برای کنش کم‌اهمیت. حالت «در حال انجام» با غیرفعال‌سازی و چرخنده ساخته می‌شود، نه با تعویض متن."
      >
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ alignItems: "center" }}>
          <Button variant="contained">ذخیره</Button>
          <Button variant="outlined">انصراف</Button>
          <Button variant="text">جزئیات</Button>
          <Button variant="contained" color="error">
            حذف
          </Button>
          <Button variant="contained" disabled>
            غیرفعال
          </Button>
          {/* aria-hidden, not aria-label: the button's own text already says
              it is saving, so an announced progressbar would duplicate it. */}
          <Button
            variant="contained"
            disabled
            startIcon={<CircularProgress size={16} aria-hidden />}
          >
            در حال ذخیره…
          </Button>
          <Button variant="contained" size="small">
            کوچک
          </Button>
          <Button variant="contained" size="large">
            بزرگ
          </Button>
          {/* describeChild: without it MUI's Tooltip becomes the button's
              accessible NAME, so this would announce as "حذف ردیف" instead
              of "حذف" -- the real defect caught at P8.S4. */}
          <Tooltip title="حذف ردیف" describeChild>
            <IconButton aria-label="حذف" color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Demo>

      <Demo
        code="MUI-INPUT"
        title="ورودی متن"
        note="هر ورودی برچسب دارد؛ پیام خطا جای متن راهنما را می‌گیرد، کنارش نمی‌نشیند."
      >
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <TextField label="نام محصول" defaultValue="لنت ترمز جلو" size="small" />
          <TextField label="کد قطعه" helperText="اختیاری" size="small" />
          <TextField
            label="قیمت (ریال)"
            defaultValue="۰"
            error
            helperText="قیمت باید بزرگ‌تر از صفر باشد."
            size="small"
          />
          <TextField label="شناسه" defaultValue="PS-1404-04821" size="small" disabled />
          <TextField label="توضیح" multiline rows={2} size="small" sx={{ minWidth: 240 }} />
        </Stack>
      </Demo>

      <Demo
        code="MUI-SELECT"
        title="انتخاب"
        note="هر Select باید برچسب یا نام دسترس‌پذیر داشته باشد."
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="ds-status-label">وضعیت سفارش</InputLabel>
          <Select
            labelId="ds-status-label"
            label="وضعیت سفارش"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <MenuItem value="pending">در انتظار پرداخت</MenuItem>
            <MenuItem value="paid">پرداخت‌شده</MenuItem>
            <MenuItem value="shipped">ارسال‌شده</MenuItem>
            <MenuItem value="delivered">تحویل‌شده</MenuItem>
          </Select>
        </FormControl>
      </Demo>

      <Demo code="MUI-CHOICE" title="انتخاب دوحالته و گروهی">
        <Stack spacing={2}>
          <Stack direction="row" flexWrap="wrap" gap={2} sx={{ alignItems: "center" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={checked}
                  onChange={(event) => setChecked(event.target.checked)}
                />
              }
              label="فقط کالاهای موجود"
            />
            <FormControlLabel control={<Checkbox disabled />} label="غیرفعال" />
            <FormControlLabel
              control={
                <Switch
                  checked={switched}
                  onChange={(event) => setSwitched(event.target.checked)}
                />
              }
              label="نمایش در فروشگاه"
            />
          </Stack>
          <FormControl>
            <FormLabel id="ds-account-type">نوع حساب</FormLabel>
            <RadioGroup
              row
              aria-labelledby="ds-account-type"
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
            >
              <FormControlLabel value="retail" control={<Radio />} label="خرده‌فروشی" />
              <FormControlLabel value="wholesale" control={<Radio />} label="عمده‌فروشی" />
            </RadioGroup>
          </FormControl>
        </Stack>
      </Demo>

      <Demo
        code="MUI-STATUS"
        title="چیپ وضعیت"
        note="هشدار همیشه خط‌دار است، نه پرشده — چون رنگ هشدار به همیشه‌بهار نزدیک است و شکل، نه رنگ، است که آن را از «خرید» جدا نگه می‌دارد."
      >
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Chip label="تحویل‌شده" color="success" size="small" />
          <Chip label="پرداخت‌شده" color="primary" size="small" />
          <Chip label="لغو‌شده" color="error" size="small" />
          {/* The BORDER carries the warning hue; the label uses normal text
              ink. MUI's outlined chip would otherwise paint the label
              warning.main, which measures 2.16:1 on --surface -- a real AA
              failure. §6.3's rule is that SHAPE (outline, not fill) keeps
              warning from reading as a CTA, and that holds with a legible
              label. The storefront's own Badge tone="warning" still paints
              its text --color-warning and has the same 2.16:1 problem;
              fixing that needs a contrast-safe warning ink token, which is
              a palette decision deferred to P11.S6, not invented here. */}
          <Chip
            label="کم‌موجود"
            color="warning"
            variant="outlined"
            size="small"
            sx={{ color: "text.primary" }}
          />
          <Chip label="پیش‌نویس" size="small" />
          <Badge badgeContent={4} color="error">
            <NotificationsIcon />
          </Badge>
          <Avatar sx={{ width: 32, height: 32 }}>ر</Avatar>
        </Stack>
      </Demo>

      <Demo code="MUI-FEEDBACK" title="پیام‌ها">
        <Stack spacing={1}>
          <Alert severity="success">تغییرات ذخیره شد.</Alert>
          <Alert severity="info">این مشتری هنوز سفارشی ثبت نکرده است.</Alert>
          <Alert severity="warning">
            <AlertTitle>موجودی کم</AlertTitle>۳ محصول زیر حد هشدار موجودی هستند.
          </Alert>
          <Alert severity="error">دریافت گزارش‌ها ناموفق بود.</Alert>
        </Stack>
      </Demo>

      <Demo
        code="MUI-LOADING"
        title="حالت بارگذاری و خالی"
        note="اسکلت وقتی شکل نتیجه از پیش معلوم است؛ چرخنده وقتی معلوم نیست."
      >
        <Stack spacing={2}>
          <Box>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="rectangular" height={48} sx={{ mt: 1, borderRadius: 1 }} />
          </Box>
          <Divider />
          {/* role="progressbar" needs an accessible name -- MUI renders the
              role but supplies no label, so an unnamed spinner is a real
              axe violation wherever we choose to render one. */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <CircularProgress size={24} aria-label="در حال بارگذاری" />
            <Box sx={{ flex: 1 }}>
              <LinearProgress aria-label="پیشرفت بارگذاری" />
            </Box>
          </Stack>
        </Stack>
      </Demo>

      <Demo code="MUI-OVERLAY" title="گفت‌وگو و صفحه‌بندی">
        <Stack direction="row" flexWrap="wrap" gap={2} sx={{ alignItems: "center" }}>
          <Button variant="outlined" onClick={() => setDialogOpen(true)}>
            نمایش گفت‌وگوی تأیید
          </Button>
          <Pagination count={8} page={page} onChange={(_, value) => setPage(value)} size="small" />
        </Stack>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
          <DialogTitle>حذف این برند؟</DialogTitle>
          <DialogContent>
            <DialogContentText>
              این کار برند را بایگانی می‌کند. محصول‌های متصل به آن دست‌نخورده می‌مانند و بازگرداندنش
              ممکن است.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>انصراف</Button>
            <Button color="error" variant="contained" onClick={() => setDialogOpen(false)}>
              حذف
            </Button>
          </DialogActions>
        </Dialog>
      </Demo>
    </Box>
  );
}

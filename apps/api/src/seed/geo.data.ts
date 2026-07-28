export interface CitySeed {
  name: { fa: string; en: string };
  slug: string;
}

export interface ProvinceSeed {
  name: { fa: string; en: string };
  slug: string;
  cities: CitySeed[];
}

// All 31 Iranian provinces (ostān), current administrative division since
// Alborz split from Tehran province in 2010. Each province lists its
// capital plus its handful of largest/most relevant cities for a
// checkout-address dropdown — not an exhaustive gazetteer (Iran has
// thousands of towns/villages, most irrelevant to shipping-address UX).
// Names and administrative groupings per standard Iranian provincial
// geography, cross-checked against Wikipedia's per-province articles.
export const GEO_SEED_DATA: ProvinceSeed[] = [
  {
    name: { fa: "تهران", en: "Tehran" },
    slug: "tehran",
    cities: [
      { name: { fa: "تهران", en: "Tehran" }, slug: "tehran" },
      { name: { fa: "ری", en: "Rey" }, slug: "rey" },
      { name: { fa: "اسلامشهر", en: "Eslamshahr" }, slug: "eslamshahr" },
      { name: { fa: "ورامین", en: "Varamin" }, slug: "varamin" },
      { name: { fa: "پاکدشت", en: "Pakdasht" }, slug: "pakdasht" },
      { name: { fa: "دماوند", en: "Damavand" }, slug: "damavand" },
    ],
  },
  {
    name: { fa: "البرز", en: "Alborz" },
    slug: "alborz",
    cities: [
      { name: { fa: "کرج", en: "Karaj" }, slug: "karaj" },
      { name: { fa: "فردیس", en: "Fardis" }, slug: "fardis" },
      { name: { fa: "نظرآباد", en: "Nazarabad" }, slug: "nazarabad" },
      { name: { fa: "اشتهارد", en: "Eshtehard" }, slug: "eshtehard" },
    ],
  },
  {
    name: { fa: "قزوین", en: "Qazvin" },
    slug: "qazvin",
    cities: [
      { name: { fa: "قزوین", en: "Qazvin" }, slug: "qazvin" },
      { name: { fa: "تاکستان", en: "Takestan" }, slug: "takestan" },
      { name: { fa: "آبیک", en: "Abyek" }, slug: "abyek" },
    ],
  },
  {
    name: { fa: "قم", en: "Qom" },
    slug: "qom",
    cities: [{ name: { fa: "قم", en: "Qom" }, slug: "qom" }],
  },
  {
    name: { fa: "مرکزی", en: "Markazi" },
    slug: "markazi",
    cities: [
      { name: { fa: "اراک", en: "Arak" }, slug: "arak" },
      { name: { fa: "ساوه", en: "Saveh" }, slug: "saveh" },
      { name: { fa: "خمین", en: "Khomein" }, slug: "khomein" },
      { name: { fa: "محلات", en: "Mahallat" }, slug: "mahallat" },
    ],
  },
  {
    name: { fa: "اصفهان", en: "Isfahan" },
    slug: "isfahan",
    cities: [
      { name: { fa: "اصفهان", en: "Isfahan" }, slug: "isfahan" },
      { name: { fa: "کاشان", en: "Kashan" }, slug: "kashan" },
      { name: { fa: "نجف‌آباد", en: "Najafabad" }, slug: "najafabad" },
      { name: { fa: "خمینی‌شهر", en: "Khomeinishahr" }, slug: "khomeinishahr" },
      { name: { fa: "شاهین‌شهر", en: "Shahin Shahr" }, slug: "shahin-shahr" },
    ],
  },
  {
    name: { fa: "یزد", en: "Yazd" },
    slug: "yazd",
    cities: [
      { name: { fa: "یزد", en: "Yazd" }, slug: "yazd" },
      { name: { fa: "میبد", en: "Meybod" }, slug: "meybod" },
      { name: { fa: "اردکان", en: "Ardakan" }, slug: "ardakan" },
    ],
  },
  {
    name: { fa: "فارس", en: "Fars" },
    slug: "fars",
    cities: [
      { name: { fa: "شیراز", en: "Shiraz" }, slug: "shiraz" },
      { name: { fa: "مرودشت", en: "Marvdasht" }, slug: "marvdasht" },
      { name: { fa: "جهرم", en: "Jahrom" }, slug: "jahrom" },
      { name: { fa: "کازرون", en: "Kazerun" }, slug: "kazerun" },
      { name: { fa: "فسا", en: "Fasa" }, slug: "fasa" },
    ],
  },
  {
    name: { fa: "کهگیلویه و بویراحمد", en: "Kohgiluyeh and Boyer-Ahmad" },
    slug: "kohgiluyeh-and-boyer-ahmad",
    cities: [
      { name: { fa: "یاسوج", en: "Yasuj" }, slug: "yasuj" },
      { name: { fa: "گچساران", en: "Gachsaran" }, slug: "gachsaran" },
    ],
  },
  {
    name: { fa: "چهارمحال و بختیاری", en: "Chaharmahal and Bakhtiari" },
    slug: "chaharmahal-and-bakhtiari",
    cities: [
      { name: { fa: "شهرکرد", en: "Shahrekord" }, slug: "shahrekord" },
      { name: { fa: "بروجن", en: "Borujen" }, slug: "borujen" },
      { name: { fa: "فارسان", en: "Farsan" }, slug: "farsan" },
    ],
  },
  {
    name: { fa: "خوزستان", en: "Khuzestan" },
    slug: "khuzestan",
    cities: [
      { name: { fa: "اهواز", en: "Ahvaz" }, slug: "ahvaz" },
      { name: { fa: "آبادان", en: "Abadan" }, slug: "abadan" },
      { name: { fa: "خرمشهر", en: "Khorramshahr" }, slug: "khorramshahr" },
      { name: { fa: "دزفول", en: "Dezful" }, slug: "dezful" },
      { name: { fa: "بندر ماهشهر", en: "Bandar-e Mahshahr" }, slug: "bandar-e-mahshahr" },
    ],
  },
  {
    name: { fa: "بوشهر", en: "Bushehr" },
    slug: "bushehr",
    cities: [
      { name: { fa: "بوشهر", en: "Bushehr" }, slug: "bushehr" },
      { name: { fa: "برازجان", en: "Borazjan" }, slug: "borazjan" },
      { name: { fa: "گناوه", en: "Genaveh" }, slug: "genaveh" },
    ],
  },
  {
    name: { fa: "هرمزگان", en: "Hormozgan" },
    slug: "hormozgan",
    cities: [
      { name: { fa: "بندرعباس", en: "Bandar Abbas" }, slug: "bandar-abbas" },
      { name: { fa: "میناب", en: "Minab" }, slug: "minab" },
      { name: { fa: "قشم", en: "Qeshm" }, slug: "qeshm" },
    ],
  },
  {
    name: { fa: "کرمان", en: "Kerman" },
    slug: "kerman",
    cities: [
      { name: { fa: "کرمان", en: "Kerman" }, slug: "kerman" },
      { name: { fa: "رفسنجان", en: "Rafsanjan" }, slug: "rafsanjan" },
      { name: { fa: "سیرجان", en: "Sirjan" }, slug: "sirjan" },
      { name: { fa: "بم", en: "Bam" }, slug: "bam" },
      { name: { fa: "جیرفت", en: "Jiroft" }, slug: "jiroft" },
    ],
  },
  {
    name: { fa: "سیستان و بلوچستان", en: "Sistan and Baluchestan" },
    slug: "sistan-and-baluchestan",
    cities: [
      { name: { fa: "زاهدان", en: "Zahedan" }, slug: "zahedan" },
      { name: { fa: "چابهار", en: "Chabahar" }, slug: "chabahar" },
      { name: { fa: "ایرانشهر", en: "Iranshahr" }, slug: "iranshahr" },
      { name: { fa: "زابل", en: "Zabol" }, slug: "zabol" },
    ],
  },
  {
    name: { fa: "خراسان جنوبی", en: "South Khorasan" },
    slug: "south-khorasan",
    cities: [
      { name: { fa: "بیرجند", en: "Birjand" }, slug: "birjand" },
      { name: { fa: "قائن", en: "Qaen" }, slug: "qaen" },
    ],
  },
  {
    name: { fa: "خراسان رضوی", en: "Razavi Khorasan" },
    slug: "razavi-khorasan",
    cities: [
      { name: { fa: "مشهد", en: "Mashhad" }, slug: "mashhad" },
      { name: { fa: "نیشابور", en: "Neyshabur" }, slug: "neyshabur" },
      { name: { fa: "سبزوار", en: "Sabzevar" }, slug: "sabzevar" },
      { name: { fa: "تربت حیدریه", en: "Torbat-e Heydarieh" }, slug: "torbat-e-heydarieh" },
      { name: { fa: "کاشمر", en: "Kashmar" }, slug: "kashmar" },
    ],
  },
  {
    name: { fa: "خراسان شمالی", en: "North Khorasan" },
    slug: "north-khorasan",
    cities: [
      { name: { fa: "بجنورد", en: "Bojnourd" }, slug: "bojnourd" },
      { name: { fa: "شیروان", en: "Shirvan" }, slug: "shirvan" },
    ],
  },
  {
    name: { fa: "سمنان", en: "Semnan" },
    slug: "semnan",
    cities: [
      { name: { fa: "سمنان", en: "Semnan" }, slug: "semnan" },
      { name: { fa: "شاهرود", en: "Shahroud" }, slug: "shahroud" },
      { name: { fa: "دامغان", en: "Damghan" }, slug: "damghan" },
    ],
  },
  {
    name: { fa: "گلستان", en: "Golestan" },
    slug: "golestan",
    cities: [
      { name: { fa: "گرگان", en: "Gorgan" }, slug: "gorgan" },
      { name: { fa: "گنبد کاووس", en: "Gonbad-e Kavus" }, slug: "gonbad-e-kavus" },
      { name: { fa: "علی‌آباد کتول", en: "Aliabad-e Katul" }, slug: "aliabad-e-katul" },
    ],
  },
  {
    name: { fa: "مازندران", en: "Mazandaran" },
    slug: "mazandaran",
    cities: [
      { name: { fa: "ساری", en: "Sari" }, slug: "sari" },
      { name: { fa: "بابل", en: "Babol" }, slug: "babol" },
      { name: { fa: "آمل", en: "Amol" }, slug: "amol" },
      { name: { fa: "قائم‌شهر", en: "Qaem Shahr" }, slug: "qaem-shahr" },
      { name: { fa: "چالوس", en: "Chalus" }, slug: "chalus" },
    ],
  },
  {
    name: { fa: "گیلان", en: "Gilan" },
    slug: "gilan",
    cities: [
      { name: { fa: "رشت", en: "Rasht" }, slug: "rasht" },
      { name: { fa: "بندر انزلی", en: "Bandar-e Anzali" }, slug: "bandar-e-anzali" },
      { name: { fa: "لاهیجان", en: "Lahijan" }, slug: "lahijan" },
      { name: { fa: "آستارا", en: "Astara" }, slug: "astara" },
    ],
  },
  {
    name: { fa: "اردبیل", en: "Ardabil" },
    slug: "ardabil",
    cities: [
      { name: { fa: "اردبیل", en: "Ardabil" }, slug: "ardabil" },
      { name: { fa: "مشگین‌شهر", en: "Meshgin Shahr" }, slug: "meshgin-shahr" },
      { name: { fa: "پارس‌آباد", en: "Parsabad" }, slug: "parsabad" },
    ],
  },
  {
    name: { fa: "آذربایجان شرقی", en: "East Azerbaijan" },
    slug: "east-azerbaijan",
    cities: [
      { name: { fa: "تبریز", en: "Tabriz" }, slug: "tabriz" },
      { name: { fa: "مراغه", en: "Maragheh" }, slug: "maragheh" },
      { name: { fa: "میانه", en: "Mianeh" }, slug: "mianeh" },
      { name: { fa: "مرند", en: "Marand" }, slug: "marand" },
    ],
  },
  {
    name: { fa: "آذربایجان غربی", en: "West Azerbaijan" },
    slug: "west-azerbaijan",
    cities: [
      { name: { fa: "ارومیه", en: "Urmia" }, slug: "urmia" },
      { name: { fa: "خوی", en: "Khoy" }, slug: "khoy" },
      { name: { fa: "میاندوآب", en: "Miandoab" }, slug: "miandoab" },
      { name: { fa: "بوکان", en: "Bukan" }, slug: "bukan" },
    ],
  },
  {
    name: { fa: "زنجان", en: "Zanjan" },
    slug: "zanjan",
    cities: [
      { name: { fa: "زنجان", en: "Zanjan" }, slug: "zanjan" },
      { name: { fa: "ابهر", en: "Abhar" }, slug: "abhar" },
      { name: { fa: "خرمدره", en: "Khorramdarreh" }, slug: "khorramdarreh" },
    ],
  },
  {
    name: { fa: "کردستان", en: "Kurdistan" },
    slug: "kurdistan",
    cities: [
      { name: { fa: "سنندج", en: "Sanandaj" }, slug: "sanandaj" },
      { name: { fa: "سقز", en: "Saqqez" }, slug: "saqqez" },
      { name: { fa: "مریوان", en: "Marivan" }, slug: "marivan" },
      { name: { fa: "بانه", en: "Baneh" }, slug: "baneh" },
    ],
  },
  {
    name: { fa: "همدان", en: "Hamadan" },
    slug: "hamadan",
    cities: [
      { name: { fa: "همدان", en: "Hamadan" }, slug: "hamadan" },
      { name: { fa: "ملایر", en: "Malayer" }, slug: "malayer" },
      { name: { fa: "نهاوند", en: "Nahavand" }, slug: "nahavand" },
      { name: { fa: "تویسرکان", en: "Tuyserkan" }, slug: "tuyserkan" },
    ],
  },
  {
    name: { fa: "کرمانشاه", en: "Kermanshah" },
    slug: "kermanshah",
    cities: [
      { name: { fa: "کرمانشاه", en: "Kermanshah" }, slug: "kermanshah" },
      { name: { fa: "اسلام‌آباد غرب", en: "Eslamabad-e Gharb" }, slug: "eslamabad-e-gharb" },
      { name: { fa: "سنقر", en: "Sonqor" }, slug: "sonqor" },
    ],
  },
  {
    name: { fa: "ایلام", en: "Ilam" },
    slug: "ilam",
    cities: [
      { name: { fa: "ایلام", en: "Ilam" }, slug: "ilam" },
      { name: { fa: "دهلران", en: "Dehloran" }, slug: "dehloran" },
      { name: { fa: "آبدانان", en: "Abdanan" }, slug: "abdanan" },
    ],
  },
  {
    name: { fa: "لرستان", en: "Lorestan" },
    slug: "lorestan",
    cities: [
      { name: { fa: "خرم‌آباد", en: "Khorramabad" }, slug: "khorramabad" },
      { name: { fa: "بروجرد", en: "Borujerd" }, slug: "borujerd" },
      { name: { fa: "دورود", en: "Dorud" }, slug: "dorud" },
      { name: { fa: "الیگودرز", en: "Aligudarz" }, slug: "aligudarz" },
    ],
  },
];

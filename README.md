# حساباتي

تطبيق دفتر حسابات عربي مبني بـ Vue + Vite.

## التخزين
- في نسخة الويب/التطوير: `localStorage`.
- داخل Android/Capacitor: SQLite محلية عبر `@capacitor-community/sqlite`.
- عند أول تشغيل لنسخة Android بعد النقل، يتم نقل البيانات القديمة الموجودة في localStorage إلى SQLite إذا كانت قاعدة SQLite فارغة.

## تشغيل الويب
```bash
npm install
npm run dev
```

## تجهيز Android
بعد تثبيت Android Studio وفتح المشروع:

```bash
npm install
npx cap add android
npm run cap:sync
npx cap open android
```

ثم شغّل المشروع من Android Studio على جهاز حقيقي أو Emulator.

> ملاحظة: بيئة العمل التي تم تجهيز المشروع فيها لم يكن بها وصول ناجح إلى npm registry، لذلك لم يتم تنفيذ `npm install` أو بناء APK هنا. الملفات والتبعيات الخاصة بـ Capacitor + SQLite مضافة للمشروع، ويجب تنفيذ `npm install` على جهازك قبل `npx cap sync`.

# TODO — Nebulife

Незакриті задачі / known issues, що виявились під час роботи над Android нативом.

---

## 🚨 Критично (блокує production деплой)

### Vercel build падає на `57ee23e` (CORS middleware)
**Помилка:**
```
[vite]: Rollup failed to resolve import "@capacitor/core"
from "/vercel/path0/node_modules/@capacitor/app/dist/esm/index.js"
```

**Причина:**
Після того як `@codetrix-studio/capacitor-google-auth` додано в `packages/client/package.json`,
Rollup на Vercel не може зрезолвити `@capacitor/core` у транзитивних залежностях
(`@capacitor/app`, `@capacitor/google-auth`). Локально працює бо є hoisted `node_modules`.

**Що робити:**
1. Відкрити `packages/client/vite.config.ts`
2. В `build.rollupOptions.external` додати:
   - `@capacitor/core`
   - `@capacitor/app`
   - `@capacitor-community/admob`
   - `@revenuecat/purchases-capacitor`
3. Переконатись що всі ці модулі **динамічно імпортуються** з перевіркою `Capacitor.isNativePlatform()`
4. Закомітити, задеплоїти, перевірити що Vercel успішно будує (state: READY)

**Без цього фіксу:** нові API зміни (у тому числі CORS middleware) НЕ потрапляють на прод.

---

## 🔧 Необхідно доробити

### Push notifications на native
Зараз Web FCM вимкнений на Android (бо WebView не підтримує). Тогл push нотифікацій
в Player Page сховано на native через `getPushPermissionStatus() === 'unsupported'`.

**Щоб увімкнути push на мобільному:**
1. `npm install @capacitor/push-notifications -w @nebulife/client`
2. Створити `packages/client/src/notifications/native-push-service.ts`
   з `PushNotifications.register()`, `addListener('registration', ...)` тощо
3. У `App.tsx` при `Capacitor.isNativePlatform()` використовувати native-push-service
   замість Web FCM
4. Додати AndroidManifest.xml permissions:
   `POST_NOTIFICATIONS` (Android 13+) + Firebase messaging service declaration
5. Backend: `/api/player/fcm-token` вже існує — приймає native FCM token теж

### Google Sign-in на iOS
Зараз Google Sign-in працює лише на Android + Web. Для iOS треба:
1. В `ios/App/App/Info.plist` додати `CFBundleURLSchemes`
2. В `AppDelegate.swift` додати `GoogleAuth.handleOpenUrl`
3. Firebase Console → додати iOS Bundle ID + SHA якщо потрібно

### Release keystore для Play Store
- `nebulife-release.keystore` вже є в корні проекту (password: `nebulife2026`)
- SHA-1 RELEASE keystore треба додати у:
  - Firebase Console → Project Settings → Android app → Add fingerprint
  - Google Cloud Console → OAuth 2.0 clients → Android (якщо треба окремий release client)
- Без цього Google Sign-in буде ламатися в signed APK (тільки debug працює)

---

## 🧹 Cleanup / технічний борг

### Video codec помилки в logcat (шум)
- `MediaCodec Media Quality Service not found` — AdMob
- `BufferQueueProducer cancelBuffer slot N not owned` — AdMob video cleanup
- `chromium Guessed coded size incorrectly 1920x1080 vs 1920x1088` — AdMob кодек
- Не впливає на гру. Ігнорувати.

### WebGL RENDER WARNING у logcat
- PixiJS renderer попереджає про unbound texture units 16-31 при scene swap
- Не критично, але захаращує логи. Можна подивитись чи можна pin 32 texture units в PixiJS init

### `[object Object]` console spam
- В deployed bundle є якийсь плагін який логує Object без stringify на Line 330
- Global error handler `main.tsx` вже ловить помилки але цей конкретний — через
  `console.error(obj)` в якомусь плагіні/модулі
- Варто пройтись по `console.error` в App.tsx і обгорнути Object-аргументи в JSON.stringify

### `@capacitor/core` версійний конфлікт
- `@capacitor/core@8.3.0` vs `@capacitor/android@8.3.0` — ОК
- Але `capacitor sync` warning: "Consider updating to a matching version"
- Перевірити: `npm ls @capacitor/core` — має бути єдина версія

### `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4`
- Release candidate, не stable. Після stable-версії оновити.

---

## 💡 Покращення (nice to have)

### Bundle size (2.5 MB index JS)
Vite warning: "Some chunks are larger than 500 kB after minification"
- Додати `build.rollupOptions.output.manualChunks` в `vite.config.ts`
- Розділити: `pixi`, `three`, `babylon`, `firebase`, `i18n` по окремим chunks
- Допоможе initial load time

### Dynamic imports у `App.tsx`
Попередження Vite: модуль `@capacitor/app` і `@capacitor-community/admob`
імпортуються ОДНОЧАСНО статично і динамічно. Це ламає code-splitting.
Треба вибрати один стиль (бажано dynamic import + await).

### Tests
- Юніт-тести для `resolveApiUrl`, `isGoogleSignInAvailable`
- E2E тести для auth flow (guest → email → google)
- CORS middleware integration test

---

## 📝 Довідка

**Поточні credentials:**
- Google OAuth Web Client: `702900049376-e7k1574lfpjri29a9j3kde7pmio68h0a.apps.googleusercontent.com`
- AdMob App ID: `ca-app-pub-3504252081237345~9129352922`
- Production domains: `nebulife.space`, `www.nebulife.space`, `*.vercel.app`

**SHA-1 в google-services.json (Android `app.nebulife.game`):**
- `b5e78aa2fff9828f7e9884c86718cfaebaabf3d5`
- `dfce69c9511bae1ed123bf825b31ebfcd7e61611`
- `330602a08c265d306a7ebacae94d5e5e6fa2e505`

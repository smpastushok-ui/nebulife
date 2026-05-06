# Cosmic Encyclopedia — Authoring Guide (read FIRST before writing any lesson)

> Тексти озвучуються через ElevenLabs TTS (модель `eleven_multilingual_v2`,
> голос A.S.T.R.A.). Стиль і обмеження нижче — ОБОВ'ЯЗКОВІ.

## 1. Чим керуватися

Audience: дорослі люди що цікавляться космосом. Студенти, дорослі чоловіки і
жінки, старші школярі. Не випадкові гравці. Розумні допитливі читачі — НЕ діти.

Tone:
- Експертний, але доступний. Складне простими словами.
- БЕЗ снобізму, БЕЗ пафосу, БЕЗ емодзі.
- БЕЗ canned filler ("важливо зазначити", "необхідно підкреслити", "варто розуміти").
- Концепції, наративи, аналогії, масштаби, порівняння. НЕ хронології.

Length: 1800-2400 слів на мову (paragraphs combined).

Date currency: травень 2026 року.

## 2. NO ABBREVIATIONS — пиши ВСЕ повністю

Скорочення TTS вимовляє неправильно. Замінюй усі:

**Українські:**
- "до нашої ери" (не "до н.е.")
- "року" / "році" / "роки" / "роках" (не "р." / "рр.")
- "близько" (не "бл.")
- "тисяч" / "мільйонів" / "мільярдів" (не "тис." / "млн." / "млрд.")
- "століття" (не "ст.")
- "приблизно" (не "~" перед числом)
- "тощо" (не "т. д." / "т. п.")

**Англійські:**
- "before common era" (не BCE), "of the common era" (не CE)
- "circa" (не c. / ca.), "approximately" (не approx.)
- "kilometers" (не km), "kilograms" (не kg)
- "for example" (не e.g.), "that is" (не i.e.), "and so on" (не etc.), "versus" (не vs.)

Дозволено залишати скорочення в `sources` array — вони НЕ озвучуються.
Власні імена з "S" / "*" (M87*, Sgr A*) залишаються.

## 3. CENTURY-FIRST — людям нудно від цифр

Користувач прямо сказав: "одні цифри, можна заснути, не грузи людей цифрами".

**Default mode:** століття + наратив про ідеї.
- "У XVII столітті Галілей вперше навів телескоп у небо"
- "Наприкінці XIX століття спектроскопія розкрила хімічний склад зір"
- "У середині XX століття радіоастрономія відкрила квазари"
- "На початку 2020-х JWST переписав уявлення про ранній Всесвіт"

**Specific years OK only for major modern milestones** (≤ 5-7 на урок):
- запуск JWST (2021)
- перше зображення тіні чорної діри M87 (2019)
- висадка Аполлон-11 на Місяць (1969)
- перший виявлений сигнал гравітаційних хвиль (2015)
- перший політ Гагаріна (1961)
- + 1-2 ключові точки конкретно по темі

**Заборонено:**
- "у 1929 X, у 1932 Y, у 1947 Z" — рядки років без концептуального зв'язку
- хронологічні переліки виду "1900: ... 1910: ... 1920: ..."
- "у 1543 році Коперник опублікував..." (краще: "У XVI столітті Коперник першим повернув Сонце в центр")
- історичні дати які не суттєві для розуміння концепту

## 4. Структура файлу

```ts
import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: '...',          // kebab-case
  language: 'uk' | 'en',
  section: 'astronomy' | 'astrophysics' | 'cosmology' | 'planetology' |
           'astrobiology' | 'space-tech' | 'crewed-missions' | 'robotic-missions' |
           'applied-space',
  order: <number>,
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'current2026',
  readingTimeMin: <number>,
  title: '...',
  subtitle: '...',
  hero: { cacheKey, prompt, alt, caption?, aspectRatio? },
  body: [
    { paragraphs: ['...', '...'] },           // лід 2-3 абзаци
    { heading: '...', level: 2, paragraphs: [...] },
    { image: { cacheKey, prompt, alt, caption?, aspectRatio? } },
    { heading: '...', level: 3, paragraphs: [...] },
    { diagram: { title, svg, caption? } },
    // ...
  ],
  glossary: [{ term, definition }],     // 7-10 термінів
  quiz: [{ question, options[4], correctIndex, explanation? }],   // 4-5 питань
  sources: [{ title, url, meta? }],     // 8-10 першоджерел
  lastVerified: '2026-05-03',
};

export default lesson;
```

## 5. Image prompts (`<GenImage>` через Gemini Imagen)

- Кожен `cacheKey` — kebab-case, унікальний у межах уроку, спільний uk+en.
- Prompt: "Photorealistic illustration for a science encyclopedia: <subject>. Hard sci-fi style, dark space background. Add the following text labels on the image: 'Label 1', 'Label 2'." (Gemini підтримує текст-на-фото)
- aspectRatio: '16:9' для hero, '4:3' для inline, '1:1' для іконок.
- Якщо містить людей — БЕЗ облич (силует, вид зі спини, далекий план).

## 6. SVG diagrams — Game Bible палітра

Background: `rgba(10,15,25,0.5)`, лінії `#cc4444 / #44ff88 / #7bb8ff / #ff8844 / #aabbcc`,
текст: `monospace 11-12px`, fill `#aabbcc / #8899aa`.

## 7. Cross-language consistency

uk + en версії:
- однаковий `slug`, `section`, `order`, `difficulty`, `readingTimeMin`
- однаковий `cacheKey` для кожного зображення (картинки шаряться)
- однакова кількість блоків body, термінів, питань, джерел
- ОДНАКОВА структура — переклад, не самостійна стаття

## 8. Common reference

Найкращий приклад поточного стилю — `astrophysics/black-holes-intro.uk.ts`
(вже відредагований по новим правилам).

Файл `_template.example.ts` показує абстрактну структуру.

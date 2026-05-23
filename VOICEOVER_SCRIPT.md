# Сценарій Озвучення ШІ-Асистента A.S.T.R.A. // Nebulife Voiceover Script

Цей файл містить повний упорядкований список реплік персонального ШІ-асистента **A.S.T.R.A.** для обох мов (української та англійської). 

Кожна репліка відповідає конкретному кроку інтерактивного онбордингу в грі. Шлях завантаження записаних аудіофайлів наведено під назвою кожної репліки. Формат аудіофайлів має бути `.mp3`, бітрейт — `128kbps` або вище.

---

## 🌌 ФАЗА 1: ПЕРШІ СИГНАЛИ (Існуючі кроки)

### Крок 1: Пробудження
* **ID кроку**: `awakening`
* **Файл озвучення (UK)**: `/public/astra/voice/probudzhennya_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Awakening_en.mp3`
* **Контекст**: Командор прокидається на капітанському містку. Екран мерехтить.
* **Тексти**:
  * **UK**: *"Командоре, зв'язок встановлено. Я A.S.T.R.A., адаптивний бiоробот навiгацiї та наукового аналiзу. Ваша домашня планета пiд загрозою. У нас обмежений час, щоб знайти новий придатний свiт."*
  * **EN**: *"Commander, connection established. I am A.S.T.R.A., your adaptive biobot for navigation and scientific analysis. Your home world is in danger. We have limited time to find a new habitable planet."*

---

### Крок 2: Вхід у Термінал
* **ID кроку**: `terminal`
* **Файл озвучення (UK)**: `/public/astra/voice/terminal_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Terminal_en.mp3`
* **Контекст**: Підсвічування головного комп'ютера (Терміналу) на містку.
* **Тексти**:
  * **UK**: *"Це Центр управлiння. Тут ви бачите ресурси, данi дослiджень, системи, колонiї та всi сигнали галактики. Вiдкрийте Термiнал, i я проведу перше сканування."*
  * **EN**: *"This is the Command Center. Here you will track resources, research data, systems, colonies and every signal we receive from the galaxy. Open the Terminal, and I will guide the first scan."*

---

### Крок 3: Вибір Системи
* **ID кроку**: `go-systems`
* **Файл озвучення (UK)**: `/public/astra/voice/pershii_vybir_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/First_Choice_en.mp3`
* **Контекст**: Перед капітаном відкривається список зоряних систем поблизу.
* **Тексти**:
  * **UK**: *"Перед вами найближчi зорянi системи. Кожна може приховувати планети, ресурси або аномалiї. Оберiть доступну систему для першого сканування. Ми шукаємо шанс на виживання."*
  * **EN**: *"These are the nearest star systems. Each one may hide planets, resources or anomalies. Choose an available system for the first scan. We are looking for a chance to survive."*

---

### Крок 4: Перше дослідження
* **ID кроку**: `first-research`
* **Файл озвучення (UK)**: `/public/astra/voice/pershe_scanuvannya_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/First_Scan_en.mp3`
* **Контекст**: Спрямування телескопа на обрану зорю. Смужка прогресу починає рух.
* **Тексти**:
  * **UK**: *"Обсерваторiя починає збирати данi. Спершу мы бачимо слабкi сигнали: клас зорi, можливi планети та приблизнi умови. Чим бiльший прогрес, тим точнiша картина."*
  * **EN**: *"The observatory is starting to collect data. At first we only see weak signals: star class, possible planets and rough conditions. The higher the research progress, the clearer the picture becomes."*

---

### Крок 5: Пояснення Прогресу (HUD)
* **ID кроку**: `hud-info` (Суб-крок 1)
* **Файл озвучення (UK)**: `/public/astra/voice/pershi_rezultat_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/First_Result_en.mp3`
* **Контекст**: Фокусування уваги на показниках обсерваторій у верхній частині HUD.
* **Тексти**:
  * **UK**: *"Данi надходять. Цей прогрес — не просто смужка, а нашi очi в темрявi. Кожен вiдсоток може вiдкрити температуру, воду або шлях до нового дому."*
  * **EN**: *"Data is coming in. This progress is not just a bar; it is our vision in the dark. Every percent can reveal temperature, water, or a possible path to a new home."*

*(Примітка: Другий суб-крок про накопичення даних дослiджень (Research Data) озвучення за замовчуванням не потребує)*

---

### Крок 7: Виявлення Аномалії
* **ID кроку**: `anomaly`
* **Файл озвучення (UK)**: `/public/astra/voice/persha_znahidka_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/First_Discovery_en.mp3`
* **Контекст**: Раптовий сильний сигнал на радарах — виявлено невідомий об'єкт.
* **Тексти**:
  * **UK**: *"Сигнал пiдтверджено. У цiй системi є об'єкт, який варто вивчити ближче. Якщо данi стабiльнi, я пiдготую вiзуальну реконструкцiю першого вiдкриття."*
  * **EN**: *"Signal confirmed. This system contains an object worth a closer look. If the data is stable enough, I can prepare a visual reconstruction of your first discovery."*

---

### Крок 8: Квантове Фокусування
* **ID кроку**: `quantum`
* **Файл озвучення (UK)**: `/public/astra/voice/quantum_focus_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Quantum_Focus_en.mp3`
* **Контекст**: Пропозиція запустити промальовку зображення (генерацію Kling) з хмари.
* **Тексти**:
  * **UK**: *"Оберiть Квантове фокусування для детального аналiзу. Воно перетворить сирi сигнали на чiткий вiзуальний артефакт. Перше дослiдження безкоштовне."*
  * **EN**: *"Choose Quantum Focus for detailed analysis. This will turn raw signals into a clear visual artifact. Your first discovery analysis is free."*

---

### Крок 9: Збереження в Галерею
* **ID кроку**: `save-gallery`
* **Файл озвучення (UK)**: `/public/astra/voice/pershe_photo_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/First_Photo_en.mp3`
* **Контекст**: Космічне фото згенероване, воно неймовірної якості.
* **Тексти**:
  * **UK**: *"Ось воно: свiт або явище, якого до вас не бачив нiхто в цьому кластерi. Збережiть зображення до Галереї, щоб воно стало частиною вашої iсторiї дослiдження."*
  * **EN**: *"There it is: a world or phenomenon no one in this cluster has seen before you. Save the image to your Gallery so it becomes part of your exploration history."*

---

### Крок 10: Секція Галереї
* **ID кроку**: `gallery-final`
* **Файл озвучення (UK)**: `/public/astra/voice/galery_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/gallery_en.mp3`
* **Контекст**: Огляд збереженого файлу в Галереї Космосу.
* **Тексти**:
  * **UK**: *"Галерея — це архiв ваших вiдкриттiв: планети, аномалiї, форми життя i майбутнi експедицiї. З часом вона стане вашим особистим атласом галактики."*
  * **EN**: *"The Gallery is your archive of discoveries: planets, anomalies, life forms and future expeditions. Over time it will become your personal atlas of the galaxy."*

---

### Крок 11: Активація Чат-Зв'язку
* **ID кроку**: `astra-handoff`
* **Файл озвучення (UK)**: `/public/astra/voice/peredacha_chat_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Chat_Handoff_en.mp3`
* **Контекст**: На нижній панелі розблоковується кнопка персонального терміналу зв'язку (чату).
* **Тексти**:
  * **UK**: *"Командоре, першу фазу активацiї завершено. Тепер я доступна у вашому каналi зв'язку як персональний асистент."*
  * **EN**: *"Commander, the first activation phase is complete. From now on, I remain in your communication channel as your personal assistant."*

---

## 📡 ФАЗА 2: РОЗШИРЕННЯ ОНБОРДИНГУ (Нові кроки)

### Крок 12: Ознайомлення з вкладками чату
* **ID кроку**: `astra-chat-tabs`
* **Файл озвучення (UK)**: `/public/astra/voice/chat_tabs_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Chat_Tabs_en.mp3`
* **Контекст**: Чат відкрито. Підсвічується верхня панель вкладок месенджера.
* **Тексти**:
  * **UK**: *"Мiй дiалоговий модуль має кiлька вкладок: А.С.Т.Р.А. для бесiд зi мною, Загальний чат (доступний з 10-го рiвня) для спiлкування з iншими дослiдниками, Особистi повiдомлення (DM) та Системнi сповiщення. Кнопка '_' згортає чат."*
  * **EN**: *"My dialog module has several tabs: A.S.T.R.A. for chatting with me, Global chat (available from level 10) to chat with other explorers, DMs (Direct Messages), and System notifications. The '_' button collapses the chat."*

---

### Крок 13: Закриття Чату
* **ID кроку**: `astra-chat-close`
* **Файл озвучення (UK)**: `/public/astra/voice/chat_close_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Chat_Close_en.mp3`
* **Контекст**: Прожектор підсвічує символ згортання `_` у верхньому правому кутку чату.
* **Тексти**:
  * **UK**: *"Давайте згорнемо чат за допомогою кнопки '_', щоб повернутися до навiгацiї у вiдкритому космосi."*
  * **EN**: *"Let's collapse the chat using the '_' button to return to navigating in deep space."*

---

### Крок 14: Огляд тривимірного Всесвіту (3D Галактика)
* **ID кроку**: `galaxy-intro`
* **Файл озвучення (UK)**: `/public/astra/voice/galaxy_intro_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Galaxy_Intro_en.mp3`
* **Контекст**: Камера плавно злітає вгору, відкриваючи грандіозну 3D модель спіральної галактики з чорною дірою по центру.
* **Тексти**:
  * **UK**: *"галактика - найвищий рівень. Ви бачите чорну діру, навколо неї зоряні кластери по 1450 зірок в кожному. Це місце для досліджень 50ти командорів. Там близько 8000 планет. На цьому рівні ви можете бачити як галактика небулайф розростається. 1 сукупність = 50 гравців."*
  * **EN**: *"Galaxy is the highest level. You see a black hole, with stellar clusters of 1,450 stars around it. This is a place of exploration for 50 commanders, hosting around 8,000 planets. On this level you can see how the Nebulife galaxy grows. 1 cluster represents 50 players."*

---

### Крок 15: Огляд Зоряного Кластера (3D)
* **ID кроку**: `cluster-intro`
* **Файл озвучення (UK)**: `/public/astra/voice/cluster_intro_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Cluster_Intro_en.mp3`
* **Контекст**: Камера фокусується на хмарі зірок, що формує сектор на 50 активних гравців.
* **Тексти**:
  * **UK**: *"Зоряний кластер. Натисни, подивись в якому кластері твоя рідна зоряна система. Це маленька на первый погляд хмара зірок містить в собі тисячі обʼєктів. Розсунь двома пальцями щоб побачити ближче. Роздивись ближче, тут також є чорна діра."*
  * **EN**: *"Star cluster. Click and see which cluster your home star system belongs to. This seemingly small cloud of stars contains thousands of objects. Pinch outward to zoom in closer. Look closely, there is also a black hole here."*

---

### Крок 16: Ознайомлення з Зоряною Групою (2D)
* **ID кроку**: `galaxy-map-intro`
* **Файл озвучення (UK)**: `/public/astra/voice/galaxy_map_intro_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Galaxy_Map_Intro_en.mp3`
* **Контекст**: Безшовний перехід на плоску 2D карту з лініями тріангуляції Делоне, що сполучають сусідні зірки.
* **Тексти**:
  * **UK**: *"Зоряна група. Це основна сцена твоїх досліджень. Тут ти бачиш найближчі зоряні системи, які тобі потрібно дослідити. Так, їх 1450. Крок за кроком ти дослідиш всі. Якщо вистачить сміливості. По центру твоя зоряна система, від неї розвиваються шляхи твоєї довгої подорожі."*
  * **EN**: *"Star Group. This is the main stage of your exploration. Here you see the nearest star systems that you need to explore. Yes, there are 1,450 of them. Step by step, you will explore them all, if you have the courage. In the center is your home system, from which the paths of your long journey unfold."*

---

### Крок 17: Кнопка центрування карти
* **ID кроку**: `galaxy-map-center`
* **Файл озвучення (UK)**: `/public/astra/voice/galaxy_map_center_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Galaxy_Map_Center_en.mp3`
* **Контекст**: Прожектор підсвічує круглу іконку з прицілом зліва на панелі керування камерою.
* **Тексти**:
  * **UK**: *"Натисни \"Центрувати\" в лівому меню керування (якщо загубишся серед відкритого космосу). Також тут є зум, відображення досліджених та особлива кнопка повернення додому."*
  * **EN**: *"Click \"Center\" on the left control menu (if you get lost in open space). There is also zoom, toggles for explored systems, and a special home return button."*

---

### Крок 18: Перехід у систему через меню зірки
* **ID кроку**: `system-radial-select`
* **Файл озвучення (UK)**: `/public/astra/voice/system_radial_select_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/System_Radial_Select_en.mp3`
* **Контекст**: Командор вибирає домашню зірку. Відкривається кругле радіальне меню. Миготить кнопка зі стрілкою входу.
* **Тексти**:
  * **UK**: *"Тепер натисни на рідну зорю в центрі, побачиш меню зоряної системи. Справа в тебе є кнопка Альфа меню — вона для тих, хто хоче досліджувати всесвіт швидше та отримати доступ до преміальних інструментів та фотографічних зображень. А зліва біля зірки ти бачиш стрілку 'Перейти в систему' — натисни на неї."*
  * **EN**: *"Now click on your home star system in the center of the map to see the system menu. On the right, you have the Alpha menu button for faster exploration and premium features, realistic photos. On the left is the arrow 'Enter System' — click on it to go inside."*

---

### Крок 19: Огляд зоряної системи
* **ID кроку**: `system-scene-intro`
* **Файл озвучення (UK)**: `/public/astra/voice/system_scene_intro_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/System_Scene_Intro_en.mp3`
* **Context**: На екрані орбітальна карта системи. Вибрано домашню планету, інформаційна панель зліва показує характеристики.
* **Тексти**:
  * **UK**: *"Ти потрапив в не менш красиве та захопливе місце. Це рівень зоряної системи. Тут планети кружляють в танці по своїм орбітам навколо своєї зорі, чи можливо двох. Всі зорі унікальні, як і планети. В них різний розмір, склад, ресурси та температура. Натисни на будь-яку планету, щоб відкрити її меню."*
  * **EN**: *"You have entered an equally beautiful and fascinating place. This is the star system level. Here, planets dance along their orbits around their star, or maybe two. All stars are unique, as are planets. They differ in size, composition, resources, and temperature. Click on any planet to open its menu."*

---

### Крок 20: Клік на кнопку Екзосфера
* **ID кроку**: `exosphere-btn-click`
* **Файл озвучення (UK)**: `/public/astra/voice/exosphere_btn_click_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Exosphere_Btn_Click_en.mp3`
* **Контекст**: У контекстному меню обраної планети підсвічується кнопка «Екзосфера».
* **Тексти**:
  * **UK**: *"Натисни в меню планети кнопку \"Екзосфера\" і зачекай трішки."*
  * **EN**: *"Click the \"Exosphere\" button in the planet menu and wait a bit."*

---

### Крок 21: Ознайомлення з Екзосферою планети
* **ID кроку**: `exosphere-scene-explain`
* **Файл озвучення (UK)**: `/public/astra/voice/exosphere_scene_explain_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Exosphere_Scene_Explain_en.mp3`
* **Контекст**: Камера наближається до планети у WebGL режимі, показуючи атмосферу, текстури, рельєф та орбітальну красу.
* **Тексти**:
  * **UK**: *"Ти бачиш цю красу? Це рівень екзосфери окремої планети. Сотні різних типів планет і безмежна кількість варіацій, що максимально приближено до реальності виглядають на сьогодні і будуть покращуватися по мірі розвитку людських технологій. Якщо в тебе потужний пристрій, клікни справа в нижньому кутку на шеврон, і зміни на максимальний рівень. Зліва є \"зірочка\", якою ти зможеш додати планету в обрані."*
  * **EN**: *"Do you see this beauty? This is the exosphere level of a planet. Hundreds of different planet types and limitless variations that look highly realistic today and will improve as human technology evolves. If you have a powerful device, click the chevron in the bottom-right corner to set graphics to maximum. On the left is a star icon to add the planet to Favorites."*

---

### Крок 22: Шлях до Космічної Академії
* **ID кроку**: `academy-intro`
* **Файл озвучення (UK)**: `/public/astra/voice/academy_intro_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Academy_Intro_en.mp3`
* **Контекст**: На нижній панелі управління CommandBar яскраво підсвічується кнопка з книгою (Академія).
* **Тексти**:
  * **UK**: *"Забула сказати головне. Внизу по центру зліва ти бачиш кнопку Академії — це місце, де знаходиться 100 уроків з астрономії, астрофізики, космічних місій і багато іншого цікавого для тебе. Абсолютно безкоштовно. Аудіоуроки та читання з ілюстраціями."*
  * **EN**: *"I forgot to tell you the most important thing. Below, slightly to the left, you see the Academy button — this is where 100 lessons on astronomy, astrophysics, space missions, and much more are located. Absolutely free. Audio lessons and reading with illustrations."*

---

### Крок 23: Космічна Енциклопедія та завершення (Фінал)
* **ID кроку**: `encyclopedia-explain`
* **Файл озвучення (UK)**: `/public/astra/voice/encyclopedia_explain_ua.mp3`
* **Файл озвучення (EN)**: `/public/astra/voice/Encyclopedia_Explain_en.mp3`
* **Контекст**: Фокус на заголовку «Космічна енциклопедія» у відкритому кабінеті Академії.
* **Тексти**:
  * **UK**: *"Ось і все. Ти тепер знаєш достатньо щоб почати освоєння цього безмежного всесвіту разом зі мною."*
  * **EN**: *"That's all. You now know enough to begin exploring this boundless universe with me."*

import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'planetary-defense',
  language: 'en',
  section: 'applied-space',
  order: 7,
  difficulty: 'intermediate',
  readingTimeMin: 12,
  title: 'Planetary Defense — Redirecting Asteroids',
  subtitle: 'From the Tunguska explosion to the first real deflection of a celestial body: how humanity is learning to protect itself from cosmic impacts.',

  hero: {
    cacheKey: 'planetary-defense-hero',
    prompt:
      'Photorealistic science encyclopedia illustration: a spacecraft approaching a small rocky asteroid in deep space for an impact mission. ' +
      'The spacecraft is a compact boxy probe, moving at high velocity toward a rough, cratered asteroid surface. ' +
      'A bright debris plume begins to erupt from the impact point. ' +
      'Hard sci-fi style, dark space background, dramatic lighting from the sun at an angle. ' +
      'Add the following text labels on the image: "kinetic impactor", "Dimorphos", "debris plume", "orbit deflection".',
    alt: 'A kinetic impactor spacecraft collides with the surface of asteroid Dimorphos — a bright debris plume erupts into space',
    caption:
      'In September 2022, a spacecraft developed by the United States aerospace research agency deliberately collided with Dimorphos — the moonlet of asteroid Didymos — at over six kilometers per second. The orbital period of Dimorphos shortened by 32 minutes instead of the predicted seven. Humanity changed the trajectory of a natural celestial body for the first time.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'Approximately 66 million years ago, an asteroid roughly ten kilometers across struck the Yucatan Peninsula. ' +
        'The explosion released energy billions of times greater than the most powerful nuclear weapon. ' +
        'Dust and soot lofted into the atmosphere blocked sunlight for months. ' +
        'Three quarters of all species — including every non-avian dinosaur — ' +
        'vanished from the face of the Earth. Geologists call this the Cretaceous-Paleogene extinction. ' +
        'One impact erased 165 million years of evolution.',

        'But Earth is not defenseless. Unlike the dinosaurs, we understand the physics, we have telescopes, ' +
        'and we know how to launch rockets. The question is not whether humanity can do anything about an asteroid. ' +
        'The question is whether we will have enough time to detect the threat and act. ' +
        'The answer: it depends. That is precisely why planetary defense is not science fiction — ' +
        'it is a real engineering discipline.',

        'In the late 2010s and early 2020s, planetary defense moved from theory to practice. ' +
        'In September 2022, an event occurred that astronomers had until recently considered purely hypothetical: ' +
        'a spacecraft developed by the United States aerospace research agency deliberately struck an asteroid ' +
        'and changed its orbit. This was the first successful test of planetary defense under real space conditions.',
      ],
    },

    {
      heading: 'The threat hierarchy: from airbursts to global catastrophe',
      level: 2,
      paragraphs: [
        'Not every asteroid is the end of the world. Objects of different sizes represent qualitatively different categories of threat, and understanding this hierarchy is the first step toward rational defense.',

        'Bodies up to roughly 30 meters across enter the atmosphere and mostly explode in the air — these are called _airbursts_. They leave no craters but release tremendous energy. ' +
        'In February 2013, a meteoroid approximately 20 meters across exploded over Chelyabinsk, Russia. ' +
        'The atmospheric explosion released energy equivalent to roughly 500 thousand tons of conventional explosive — ' +
        'more than thirty times the Hiroshima bomb. The shock wave shattered windows in thousands of buildings ' +
        'and injured over a thousand people from flying glass. Had the object been 60 meters across, ' +
        'Chelyabinsk might have been destroyed.',

        'The Tunguska event of 1908 marks the upper limit of this class. An object estimated at 50 to 60 meters across exploded over the Siberian taiga. The shock wave flattened over two thousand square kilometers of forest — an area comparable to a large European city and its suburbs. Fortunately, it was taiga, not a metropolis.',

        'Objects from 100 to 500 meters are city-killers. A single strike in a densely populated region ' +
        'could destroy an entire city or trigger a catastrophic tsunami. This category is considered the most ' +
        'practically dangerous: such bodies are numerous, and most have not yet been discovered.',

        'Objects larger than one kilometer could cause a global-scale catastrophe: ' +
        'climate disruption, crop failure, collapse of civilization-level systems. ' +
        'Current surveys have catalogued more than 95 percent of objects in this size range, ' +
        'and none of them poses a verified threat to Earth for centuries to come. ' +
        'The ten-kilometer impactor of 66 million years ago is a separate class: ' +
        'an event of that magnitude happens once every tens of millions of years.',
      ],
    },

    {
      image: {
        cacheKey: 'planetary-defense-threat-scale',
        prompt:
          'Scientific infographic for a space encyclopedia: four asteroid impact scenarios compared by size, from left to right: ' +
          '20-meter airburst (Chelyabinsk-class), 60-meter ground devastation (Tunguska-class), 300-meter city-killer, 1-kilometer+ global catastrophe. ' +
          'Each scenario shown as a silhouette of an asteroid above an Earth surface cross-section with an approximate damage radius circle. ' +
          'Hard sci-fi style, dark space background, orange and red accent colors, monospace labels. ' +
          'Add the following text labels on the image: "airburst 20m", "Tunguska 60m", "city-killer 300m", "global 1km+".',
        alt: 'Comparison of four classes of asteroid threats by size — from airbursts to global catastrophes',
        caption:
          'Object size determines the nature of the threat. Meteoroids under 30 meters detonate in the atmosphere. Bodies above 100 meters can destroy a city. Kilometer-scale asteroids threaten global catastrophe. Most objects above one kilometer are already catalogued; the largest gap remains in the 100 to 300 meter range.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'How we search: planetary defense telescopes',
      level: 2,
      paragraphs: [
        'To defend against an asteroid, you first have to find it. Detection is the first and most critical element of any defense system: without early warning, no deflection method will have time to work.',

        'Planetary defense today relies on several networked survey systems. ' +
        'The Wide-field Infrared Survey Explorer, repurposed as a near-Earth object hunter, ' +
        'has discovered thousands of asteroids invisible in visible light — ' +
        'including dark carbonaceous bodies that reflect very little sunlight. ' +
        'The Asteroid Terrestrial-impact Last Alert System — a ground-based telescope network in Hawaii, ' +
        'Chile, and South Africa — can detect newly identified close-approach objects two to three weeks before ' +
        'a potential encounter. The Panoramic Survey Telescope and Rapid Response System in Hawaii scans the ' +
        'entire visible sky every night searching for new moving objects. ' +
        'The European Space Agency\'s Flyeye telescope network is designed for even wider sky coverage.',

        'But the most consequential system is on the horizon: an orbital infrared telescope for near-Earth ' +
        'object surveying, with launch planned for approximately 2027, promises to discover most of the ' +
        'currently unknown asteroids larger than 140 meters within its first few years of operation. ' +
        'It will operate in the infrared from an orbit between Earth and the Sun — ' +
        'positioned to see objects approaching from the sunward direction that remain hidden from ground telescopes. ' +
        'At current rates of progress, by approximately 2030 humanity will have catalogued more than ' +
        '95 percent of all near-Earth asteroids larger than 140 meters. ' +
        'More than 35 thousand such objects are already known.',
      ],
    },

    {
      heading: 'Apophis: a rehearsal alert',
      level: 3,
      paragraphs: [
        'Among all known near-Earth asteroids, one — Apophis — attracts particular attention. ' +
        'Not because it is currently dangerous, but because it will pass fantastically close to Earth ' +
        'and become a living laboratory for science.',

        'In April 2029, Apophis — a body roughly 370 meters in diameter — will pass at a distance of ' +
        'only about 32 thousand kilometers from Earth\'s surface. For scale: the satellites of ' +
        'the global navigation system orbit at approximately 20 thousand kilometers altitude. ' +
        'Apophis will thus pass below the belt of navigation satellites. ' +
        'With the naked eye it will be visible as a slowly moving star.',

        'Refined trajectory calculations have ruled out any collision probability in 2029 and in 2068. ' +
        'But the scientific interest remains: Earth\'s gravity will deform the shape of Apophis and ' +
        'alter its orbit — providing a unique opportunity to test models of asteroid behavior near ' +
        'large planets. Several space agencies are planning to send spacecraft to study the flyby.',
      ],
    },

    {
      image: {
        cacheKey: 'planetary-defense-apophis-flyby',
        prompt:
          'Photorealistic science illustration for an encyclopedia: a large rocky asteroid passing extremely close to Earth, ' +
          'Earth visible below as a blue marble with continents and cloud cover. ' +
          'The asteroid is a rough elongated grey body. ' +
          'The Moon is visible in the background at greater distance. ' +
          'Hard sci-fi style, accurate orbital geometry suggested by the scene composition. ' +
          'Add the following text labels on the image: "Apophis", "32,000 km altitude", "GPS orbit ~20,000 km", "April 2029".',
        alt: 'Asteroid Apophis passes 32 thousand kilometers from Earth in April 2029 — below the altitude of navigation satellites',
        caption:
          'The April 2029 flyby of Apophis will be the closest confirmed approach of a large asteroid to Earth in all of recorded history. There is no impact threat — but it is a unique event for science and for testing observation infrastructure at close range.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'The first real test: the Double Asteroid Redirection Test',
      level: 2,
      paragraphs: [
        'In September 2022, an event without precedent in the history of spaceflight took place. ' +
        'The spacecraft of the Double Asteroid Redirection Test mission, developed by the United States ' +
        'aerospace research agency, struck Dimorphos — a small moonlet roughly 160 meters in diameter ' +
        'orbiting the larger asteroid Didymos — with accuracy to within a few meters.',

        'This was not an accident. It was a deliberate impact at more than six kilometers per second, ' +
        'designed to test the simplest practical deflection method: the _kinetic impactor_. ' +
        'The concept is straightforward: if you strike an asteroid with a sufficiently massive and fast object, ' +
        'its orbit will change. But by how much? And would real measurements confirm the theoretical predictions?',

        'The result surpassed the most optimistic expectations. Before the impact, Dimorphos ' +
        'completed one orbit around Didymos in 11 hours and 55 minutes. ' +
        'After the impact, that period shortened by approximately 32 minutes. ' +
        'The predicted minimum effect had been about seven minutes. ' +
        'The actual effect was four to five times greater.',

        'The reason for this amplification is the concept of _beta enhancement_. ' +
        'The spacecraft struck the surface and blasted a massive cloud of rock and dust into space. ' +
        'This material flew outward in the direction opposite to the impact — and together with the ' +
        'reaction from the collision itself, formed a combined momentum transfer several times ' +
        'greater than the spacecraft\'s mechanical contact alone. ' +
        'The jet reaction from the excavated regolith amplified the deflection far beyond the direct hit.',
      ],
    },

    {
      diagram: {
        title: 'Double Asteroid Redirection Test: orbital period change of Dimorphos',
        svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg">
  <rect width="700" height="360" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="350" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Dimorphos orbit change after kinetic impact (September 2022)</text>

  <!-- Didymos center -->
  <circle cx="350" cy="195" r="18" fill="#ff8844" opacity="0.9"/>
  <text x="350" y="228" fill="#ff8844" font-family="monospace" font-size="10" text-anchor="middle">Didymos</text>
  <text x="350" y="240" fill="#8899aa" font-family="monospace" font-size="9" text-anchor="middle">(780 m)</text>

  <!-- Original orbit (dashed, larger) -->
  <ellipse cx="350" cy="195" rx="160" ry="55" fill="none" stroke="#667788" stroke-width="1.5" stroke-dasharray="6,5" opacity="0.7"/>
  <text x="520" y="165" fill="#667788" font-family="monospace" font-size="9" text-anchor="start">before impact</text>
  <text x="520" y="177" fill="#667788" font-family="monospace" font-size="9" text-anchor="start">11h 55min</text>

  <!-- New orbit (solid, slightly smaller) -->
  <ellipse cx="350" cy="195" rx="148" ry="50" fill="none" stroke="#44ff88" stroke-width="2" opacity="0.9"/>
  <text x="510" y="215" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="start">after impact</text>
  <text x="510" y="227" fill="#44ff88" font-family="monospace" font-size="9" text-anchor="start">11h 23min</text>

  <!-- Dimorphos position before impact -->
  <circle cx="510" cy="195" r="7" fill="#7bb8ff" opacity="0.8"/>
  <text x="510" y="180" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Dimorphos</text>
  <text x="510" y="170" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">(~160 m)</text>

  <!-- Impact arrow -->
  <line x1="610" y1="195" x2="522" y2="195" stroke="#cc4444" stroke-width="2.5" marker-end="url(#arr)"/>
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <polygon points="0,0 8,4 0,8" fill="#cc4444"/>
    </marker>
  </defs>
  <text x="660" y="191" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">impactor</text>
  <text x="660" y="203" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">6+ km/s</text>

  <!-- Ejecta cone -->
  <line x1="514" y1="191" x2="540" y2="165" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>
  <line x1="514" y1="199" x2="540" y2="225" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>
  <circle cx="540" cy="165" r="2" fill="#ff8844" opacity="0.6"/>
  <circle cx="548" cy="155" r="1.5" fill="#ff8844" opacity="0.5"/>
  <circle cx="545" cy="225" r="2" fill="#ff8844" opacity="0.6"/>
  <circle cx="552" cy="235" r="1.5" fill="#ff8844" opacity="0.5"/>
  <text x="560" y="145" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="start">ejecta</text>
  <text x="560" y="157" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="start">plume</text>

  <!-- Beta enhancement annotation -->
  <text x="60" y="55" fill="#aabbcc" font-family="monospace" font-size="10">Beta enhancement:</text>
  <text x="60" y="70" fill="#8899aa" font-family="monospace" font-size="9">Predicted minimum effect: ~7 minutes</text>
  <text x="60" y="84" fill="#44ff88" font-family="monospace" font-size="9">Actual effect: 32 minutes</text>
  <text x="60" y="98" fill="#7bb8ff" font-family="monospace" font-size="9">Beta coefficient = 2.2 to 4.0 (regolith ejecta jet)</text>

  <!-- Orbit direction arrows -->
  <text x="350" y="130" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">orbital motion</text>
  <path d="M 320 140 Q 350 125 380 140" fill="none" stroke="#8899aa" stroke-width="1" marker-end="url(#sarr)"/>
  <defs>
    <marker id="sarr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
      <polygon points="0,0 6,3 0,6" fill="#8899aa"/>
    </marker>
  </defs>
</svg>`,
        caption:
          'Dimorphos orbited Didymos in 11 hours and 55 minutes before the impact. After the kinetic impactor strike in September 2022, the orbital period shortened by 32 minutes — four to five times the predicted minimum of seven minutes. The ejecta plume from the surface added a reactive impulse — the beta enhancement effect, with a coefficient of 2.2 to 4.0.',
      },
    },

    {
      heading: 'The Hera mission: auditing the first strike',
      level: 3,
      paragraphs: [
        'The Double Asteroid Redirection Test spacecraft carried no orbital cameras to document the ' +
        'aftermath in detail. Precise measurements of the crater, the internal structure of Dimorphos, ' +
        'and the exact mechanics of the deflection remained uncharted. That role fell to the Hera mission — ' +
        'a spacecraft of the European Space Agency, launched in October 2024.',

        'Hera is expected to arrive at the Didymos system in 2027 and conduct detailed imaging of the ' +
        'crater left by the impactor, measurements of the mass and internal structure of Dimorphos using ' +
        'onboard radars and gravimeters. Together with two small cubesat companions, it will gather the data ' +
        'needed to calibrate all future models of kinetic deflection. ' +
        'The Hera mission will transform one concrete practical result into a quantitatively measured ' +
        'scientific foundation for planetary defense.',
      ],
    },

    {
      heading: 'Deflection methods: from a gentle nudge to the nuclear option',
      level: 2,
      paragraphs: [
        'The kinetic impactor is the simplest and best-tested deflection method. But it is not the only one. ' +
        'The choice of method depends on the size of the object, the time remaining before a potential impact, ' +
        'and the precision of the known trajectory.',

        'The **gravity tractor** is a spacecraft that flies alongside the asteroid and uses its own ' +
        'gravitational attraction to slowly but precisely pull the body away from a dangerous orbit. ' +
        'No physical contact — only gravity and time. The method is highly accurate and predictable, ' +
        'but extremely slow. For bodies several hundred meters across it requires years or decades ' +
        'of continuous operation. The critical requirement is decades of advance warning.',

        'The **ion beam shepherd** is a related approach: the spacecraft directs an ion thruster toward ' +
        'the asteroid surface, and the ion stream gradually ablates regolith, altering the orbit. ' +
        'Similar precision, similar timescale.',

        'The **nuclear standoff detonation** is the method of last resort. A nuclear device detonated ' +
        'near the asteroid surface instantly vaporizes a thin layer of material. ' +
        'The escaping vapor acts as a rocket engine. The method can deflect even large bodies in a short time. ' +
        'But it is legally complex under international treaties, carries the risk of fragmenting the asteroid ' +
        'into multiple dangerous pieces, and is an absolute last option when available time is critically short.',

        'The key lesson from all methods is **lead time**. A small trajectory change applied decades before ' +
        'the encounter means a miss by millions of kilometers. The same change applied one month before impact ' +
        'means only a few kilometers. The more time available, the lighter and cheaper the method that works.',
      ],
    },

    {
      image: {
        cacheKey: 'planetary-defense-deflection-methods',
        prompt:
          'Scientific infographic comparing four asteroid deflection methods for a space encyclopedia: ' +
          '1) Kinetic impactor: spacecraft crashing into asteroid with debris cloud. ' +
          '2) Gravity tractor: spacecraft hovering near asteroid with gravitational influence arrows. ' +
          '3) Ion beam shepherd: spacecraft directing ion beam at asteroid surface. ' +
          '4) Nuclear standoff: explosion near asteroid surface vaporizing material. ' +
          'Each method shown in a separate panel, hard sci-fi style, dark space background, monospace labels, orange and cyan accents. ' +
          'Add the following text labels on the image: "kinetic impactor", "gravity tractor", "ion beam shepherd", "nuclear standoff".',
        alt: 'Four asteroid deflection methods: kinetic impactor, gravity tractor, ion beam shepherd, nuclear standoff',
        caption:
          'Each deflection method has its niche. The kinetic impactor is fast and proven. The gravity tractor is precise but requires decades. The nuclear option handles critical situations with minimal reaction time. The choice depends on object size and the time remaining before potential impact.',
        aspectRatio: '16:9',
      },
    },

    {
      heading: 'Impact frequency and statistics: the scale of the problem',
      level: 2,
      paragraphs: [
        'Asteroid impacts are a statistical phenomenon. Tiny bodies arrive on Earth every day as micrometeorites. ' +
        'Meter-scale meteors enter the atmosphere several times per year. ' +
        'A Tunguska-type object arrives a few times per millennium. ' +
        'An Apophis-class body passes nearby once every tens of thousands of years. ' +
        'A global catastrophe from a kilometer-scale body occurs once every several million years.',

        'This leads to the central paradox of planetary defense: the probability of a serious impact ' +
        'during any individual lifetime is extremely small, but the consequences of even one such impact ' +
        'on a densely populated region would be catastrophic. The rational response is therefore not to ' +
        'wait for a discovered threat and then react — but to continuously maintain the catalogue ' +
        'and build early-response systems, the way that fire alarms are installed before fires start.',
      ],
    },

    {
      diagram: {
        title: 'Impact frequency versus asteroid size (logarithmic scale)',
        svg: `<svg viewBox="0 0 680 330" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="330" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Impact frequency versus object size (logarithmic scale)</text>

  <!-- Axes -->
  <line x1="80" y1="260" x2="640" y2="260" stroke="#334455" stroke-width="1.5"/>
  <line x1="80" y1="260" x2="80" y2="40" stroke="#334455" stroke-width="1.5"/>

  <!-- X axis label -->
  <text x="360" y="295" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle">Object size (log scale)</text>
  <!-- X axis size labels -->
  <text x="130" y="275" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">1 m</text>
  <text x="215" y="275" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">10 m</text>
  <text x="305" y="275" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">100 m</text>
  <text x="395" y="275" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">1 km</text>
  <text x="485" y="275" fill="#8899aa" font-family="monospace" font-size="8" text-anchor="middle">10 km</text>

  <!-- Y axis label -->
  <text x="20" y="155" fill="#8899aa" font-family="monospace" font-size="10" text-anchor="middle" transform="rotate(-90,20,155)">Frequency</text>
  <!-- Y axis ticks -->
  <text x="75" y="260" fill="#8899aa" font-family="monospace" font-size="7" text-anchor="end">daily</text>
  <text x="75" y="220" fill="#8899aa" font-family="monospace" font-size="7" text-anchor="end">yearly</text>
  <text x="75" y="185" fill="#8899aa" font-family="monospace" font-size="7" text-anchor="end">1/100 yr</text>
  <text x="75" y="150" fill="#8899aa" font-family="monospace" font-size="7" text-anchor="end">1/1000 yr</text>
  <text x="75" y="115" fill="#8899aa" font-family="monospace" font-size="7" text-anchor="end">1/100K yr</text>
  <text x="75" y="80" fill="#8899aa" font-family="monospace" font-size="7" text-anchor="end">1/1M yr</text>

  <!-- Frequency curve (inverse relationship, log-log linear) -->
  <polyline
    points="130,255 215,225 305,180 395,130 485,80 575,52"
    fill="none" stroke="#7bb8ff" stroke-width="2.5"/>

  <!-- Annotation: Chelyabinsk 20m -->
  <line x1="236" y1="215" x2="236" y2="260" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>
  <circle cx="236" cy="215" r="4" fill="#ff8844" opacity="0.9"/>
  <text x="238" y="205" fill="#ff8844" font-family="monospace" font-size="8">Chelyabinsk</text>
  <text x="238" y="215" fill="#ff8844" font-family="monospace" font-size="8">(~20 m, 2013)</text>

  <!-- Annotation: Tunguska 60m -->
  <line x1="270" y1="197" x2="270" y2="260" stroke="#ff8844" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>
  <circle cx="270" cy="197" r="4" fill="#ff8844" opacity="0.9"/>
  <text x="272" y="187" fill="#ff8844" font-family="monospace" font-size="8">Tunguska</text>
  <text x="272" y="197" fill="#ff8844" font-family="monospace" font-size="8">(~60 m, 1908)</text>

  <!-- Annotation: 1km global -->
  <line x1="395" y1="130" x2="395" y2="260" stroke="#cc4444" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
  <circle cx="395" cy="130" r="4" fill="#cc4444" opacity="0.9"/>
  <text x="397" y="120" fill="#cc4444" font-family="monospace" font-size="8">1 km</text>
  <text x="397" y="132" fill="#cc4444" font-family="monospace" font-size="8">global</text>

  <!-- Annotation: K-Pg 10km -->
  <line x1="485" y1="80" x2="485" y2="260" stroke="#cc4444" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
  <circle cx="485" cy="80" r="4" fill="#cc4444" opacity="0.9"/>
  <text x="487" y="70" fill="#cc4444" font-family="monospace" font-size="8">10 km</text>
  <text x="487" y="82" fill="#cc4444" font-family="monospace" font-size="8">extinction</text>
  <text x="487" y="94" fill="#8899aa" font-family="monospace" font-size="8">66 million yr ago</text>
</svg>`,
        caption:
          'Logarithmic plot: as object size increases, impact frequency drops sharply. Meter-scale meteors enter the atmosphere every year. A Tunguska-class body arrives once every few thousand years. A kilometer-scale asteroid hits once per million years. But even one rare strike in a populated region could be catastrophic.',
      },
    },

    {
      heading: 'Why lead time decides everything',
      level: 2,
      paragraphs: [
        'To understand why early detection is the key to defense, consider an analogy. ' +
        'If a freight train is heading toward a crossing one hour from a collision, a gentle push on the track ' +
        'ahead will redirect it safely. If impact is one minute away, emergency brakes may not be enough.',

        'In orbital mechanics it works the same way. A small deflection applied to an asteroid ' +
        'twenty to thirty years before a potential impact means that at the point of closest approach ' +
        'it will miss by hundreds of thousands or millions of kilometers. ' +
        'Apply the same deflection one year before impact and the offset is only thousands of kilometers. ' +
        'A month before impact — kilometers — and that may no longer be sufficient.',

        'The primary priority of planetary defense is therefore not the deflection arsenal, ' +
        'but the detection infrastructure. The near-Earth object survey telescope and similar systems ' +
        'perform the same function as a smoke alarm: they must alert you to the danger long before ' +
        'the fire grows beyond control. ' +
        'Detect early. Deflect methodically. That is the entire formula of planetary defense.',
      ],
    },

    {
      image: {
        cacheKey: 'planetary-defense-lead-time',
        prompt:
          'Scientific diagram showing asteroid deflection effectiveness versus lead time for a space encyclopedia: ' +
          'a timeline horizontal axis from 1 month to 30 years of warning time. ' +
          'A decreasing curve shows required spacecraft mass and energy as warning time increases. ' +
          'At 30 years: small kinetic impactor labeled. At 1 year: large kinetic impactor. At 1 month: nuclear option labeled. ' +
          'Hard sci-fi style, dark background, monospace labels, green-to-red color gradient along the curve. ' +
          'Add the following text labels on the image: "30 years: small impactor", "1 year: heavy impactor", "1 month: nuclear option", "detection is the key".',
        alt: 'Diagram of deflection effort required versus warning time — from decades to one month',
        caption:
          'The more lead time between detection and impact, the less energy the deflection requires. At thirty years, a kinetic impactor of a few hundred kilograms may suffice. At one month, a nuclear device may be required. Early detection is the most effective element of the entire system.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'From tabletop exercises to planetary readiness',
      level: 2,
      paragraphs: [
        'Alongside telescopes and missions, a third component of planetary defense is developing: ' +
        'coordinated response. The United States aerospace research agency, the European Space Agency, ' +
        'and the International Astronomical Union regularly conduct tabletop exercises — ' +
        'simulated drills of asteroid threat scenarios. These exercises work through decisions: ' +
        'who evacuates the population, who launches the deflection mission, who authorizes the nuclear option.',

        'The Sentry automated risk analysis system, maintained by the Jet Propulsion Laboratory of ' +
        'the United States aerospace research agency, continuously tracks the orbits of thousands of known ' +
        'near-Earth objects and updates collision probabilities in real time. ' +
        'In the entire operational history of the system, no catalogued object has retained a non-zero ' +
        'impact probability with Earth after orbit refinement — but the ability to rapidly update a ' +
        'risk assessment is critically important.',

        'Humanity has never before had the means to consciously and deliberately protect its planet ' +
        'from a cosmic impact. Now it does. Not against everything, and not always — ' +
        'but the first real test in September 2022 demonstrated that the physics works, the engineering ' +
        'succeeded, and the result exceeded expectations. That is not a reason for complacency, ' +
        'but it is no longer a hypothesis.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Near-Earth object',
      definition:
        'An asteroid or comet with an orbit that brings it within 1.3 astronomical units of the Sun, placing it in the vicinity of Earth\'s orbit. A subset — potentially hazardous objects — includes bodies that can approach within 7.5 million kilometers of Earth.',
    },
    {
      term: 'Kinetic impactor',
      definition:
        'An asteroid deflection method in which a spacecraft deliberately strikes the target body at high velocity. The transferred momentum changes the orbit. Successfully tested in real space conditions during the Double Asteroid Redirection Test in September 2022.',
    },
    {
      term: 'Beta enhancement',
      definition:
        'The amplification of a kinetic impact\'s deflection effect due to the reactive impulse of excavated regolith. The cloud of rock and dust ejected from the impact site flies outward in the direction opposite the strike, adding momentum beyond the mechanical contact alone. The beta coefficient quantifies this amplification.',
    },
    {
      term: 'Gravity tractor',
      definition:
        'A deflection method in which a spacecraft hovers near an asteroid and uses its own gravitational attraction to slowly alter the body\'s trajectory. No physical contact is required. Highly precise but requires years to decades of operation and correspondingly long warning times.',
    },
    {
      term: 'Airburst',
      definition:
        'The atmospheric explosion of a celestial body before it reaches the ground. Bodies up to roughly 25 to 30 meters across are destroyed by aerodynamic pressure and release their energy as a shock wave. The Chelyabinsk meteoroid of 2013 is a definitive example.',
    },
    {
      term: 'Cretaceous-Paleogene extinction',
      definition:
        'The mass extinction approximately 66 million years ago that eliminated three quarters of all species, including all non-avian dinosaurs. Linked to the impact of an asteroid roughly ten kilometers in diameter near what is now the Yucatan Peninsula. The best-documented catastrophe of this magnitude in Earth\'s geological record.',
    },
    {
      term: 'Sentry system',
      definition:
        'An automated system maintained by the Jet Propulsion Laboratory of the United States aerospace research agency that continuously monitors the orbits of near-Earth objects and calculates their probability of collision with Earth.',
    },
    {
      term: 'Nuclear standoff deflection',
      definition:
        'A last-resort deflection method in which a nuclear device detonated near an asteroid\'s surface vaporizes a thin layer of material, which acts as a rocket exhaust. Capable of deflecting large bodies quickly, but legally complex and carries the risk of fragmenting the target into multiple dangerous pieces.',
    },
    {
      term: 'Warning time',
      definition:
        'The interval between the discovery of a hazardous asteroid and the moment of potential impact. The critical variable of planetary defense: given decades, small kinetic nudges suffice; given months, nuclear options may be necessary. Maximizing warning time is the primary goal of detection systems.',
    },
  ],

  quiz: [
    {
      question: 'What was the outcome of the Double Asteroid Redirection Test kinetic impact on Dimorphos in September 2022?',
      options: [
        'The orbital period of Dimorphos increased by 7 minutes, matching predictions',
        'The orbital period shortened by 32 minutes — four to five times greater than the minimum predicted',
        'Dimorphos fragmented into several pieces and the mission was deemed a partial failure',
        'The orbital change was below measurement precision and was not officially confirmed',
      ],
      correctIndex: 1,
      explanation:
        'Before impact, Dimorphos completed one orbit of Didymos every 11 hours and 55 minutes. After impact the period shortened by 32 minutes — far exceeding the predicted minimum of seven minutes. The cause was beta enhancement: the plume of regolith excavated from the surface added a reactive impulse that amplified the total momentum transfer.',
    },
    {
      question: 'How close will Apophis pass to Earth during its April 2029 flyby?',
      options: [
        'Approximately 380 thousand kilometers — roughly the distance to the Moon',
        'Approximately 32 thousand kilometers — below the altitude of navigation satellites',
        'Approximately 150 million kilometers — about the average Earth-Sun distance',
        'Approximately 1 million kilometers — four times the distance to the Moon',
      ],
      correctIndex: 1,
      explanation:
        'Apophis will pass approximately 32 thousand kilometers from Earth\'s surface — closer than the navigation satellite belt at about 20 thousand kilometers altitude. There is no impact risk, but it will be the closest confirmed approach of a large asteroid in all of recorded astronomical history.',
    },
    {
      question: 'What is beta enhancement and why is it important for kinetic deflection?',
      options: [
        'It is the amplification of the radar return signal from the asteroid surface after impact',
        'It is the increase in impactor velocity from gravitational acceleration near the target',
        'It is the additional impulse from the excavated regolith plume that multiplies the deflection effect',
        'It refers to the beta version of the orbit-calculation algorithm that produced a better prediction',
      ],
      correctIndex: 2,
      explanation:
        'When the impactor strikes the surface, it excavates a large quantity of rock and dust. This material flies predominantly in the direction opposite the impact and adds a reactive impulse. The combined effect can be several times greater than the mechanical contact alone. For Dimorphos the beta coefficient was measured at 2.2 to 4.0.',
    },
    {
      question: 'Which deflection method is best suited when more than twenty years remain before a potential impact?',
      options: [
        'Nuclear standoff detonation — most powerful and most reliable',
        'Gravity tractor or kinetic impactor — precise methods that take time to act',
        'No action needed — orbital precision will change naturally over twenty years',
        'Population evacuation of the target region — the only realistic option',
      ],
      correctIndex: 1,
      explanation:
        'The more lead time before impact, the less force is required. Given twenty or more years, a kinetic impactor or gravity tractor can shift the orbit by a sufficient margin. Nuclear standoff is a measure of last resort when minimal reaction time remains and gentler methods cannot deliver enough impulse in the available window.',
    },
    {
      question: 'What is the purpose of the European Space Agency Hera mission at the Didymos system?',
      options: [
        'It delivered the original kinetic impactor to Dimorphos in 2022',
        'It is emplacing a radio beacon on Dimorphos for real-time orbit tracking',
        'It is conducting detailed study of the impact crater and internal structure of Dimorphos, arriving in 2027',
        'It is launching a second impactor to confirm the deflection effect through redundant measurement',
      ],
      correctIndex: 2,
      explanation:
        'Hera is a European Space Agency spacecraft launched in October 2024, expected to arrive at the Didymos system in 2027. It will image the impact crater in detail, measure the mass and internal structure of Dimorphos with onboard radar and gravimeters, and establish the quantitative scientific basis for kinetic deflection that will inform all future planetary defense missions.',
    },
  ],

  sources: [
    {
      title: 'NASA — Double Asteroid Redirection Test (DART) Mission Overview',
      url: 'https://dart.jhuapl.edu/',
      meta: 'Johns Hopkins APL / NASA, open access, 2022–2023',
    },
    {
      title: 'Thomas et al. — Ejecta from the DART-produced crater and momentum transfer, Nature 2023',
      url: 'https://www.nature.com/articles/s41586-023-05811-4',
      meta: 'Nature, open access, 2023',
    },
    {
      title: 'Daly et al. — Successful kinetic impact into an asteroid for planetary defense, Nature 2023',
      url: 'https://www.nature.com/articles/s41586-023-05810-5',
      meta: 'Nature, open access, 2023',
    },
    {
      title: 'ESA — Hera Mission to Didymos system',
      url: 'https://www.esa.int/Space_Safety/Hera',
      meta: 'European Space Agency, open access',
    },
    {
      title: 'NASA — Planetary Defense Coordination Office',
      url: 'https://www.nasa.gov/planetarydefense/',
      meta: 'NASA PDCO, open access',
    },
    {
      title: 'Chelyabinsk event — Science 2013 special issue',
      url: 'https://www.science.org/toc/science/342/6162',
      meta: 'Science, 342(6162), 2013',
    },
    {
      title: 'NASA — Near Earth Object Surveyor (NEO Surveyor) mission',
      url: 'https://neos.jpl.nasa.gov/',
      meta: 'JPL / NASA, open access',
    },
    {
      title: 'Apophis close approach 2029 — JPL Horizons orbital data',
      url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=apophis',
      meta: 'JPL Small-Body Database, open access',
    },
    {
      title: 'Popova et al. — Chelyabinsk Airburst, Damage Assessment, Meteorite Recovery, Science 2013',
      url: 'https://www.science.org/doi/10.1126/science.1242642',
      meta: 'Science 342, 2013',
    },
    {
      title: 'Alvarez L. et al. — Extraterrestrial cause for the Cretaceous-Paleogene extinction, Science 1980',
      url: 'https://www.science.org/doi/10.1126/science.208.4448.1095',
      meta: 'Science 208, 1980 — original impact hypothesis paper',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;

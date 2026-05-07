import type { Lesson } from '../../types.js';

const lesson: Lesson = {
  slug: 'gps-gnss',
  language: 'en',
  section: 'applied-space',
  order: 1,
  difficulty: 'beginner',
  readingTimeMin: 12,
  title: 'Global Navigation Satellite Systems',
  subtitle: 'How dozens of satellites twenty thousand kilometers up know exactly where you are standing.',

  hero: {
    cacheKey: 'gps-gnss-hero',
    prompt:
      'Photorealistic scientific illustration for a space encyclopedia: Earth seen from space with a visible constellation of navigation satellites in medium Earth orbit, orbital rings shown as faint blue arcs. ' +
      'Signal beams shown as thin cyan lines converging from four satellites down to a single point on Earth\'s surface. ' +
      'Dark space background, continents visible, hard sci-fi style, technically accurate geometry. ' +
      'Add the following text labels on the image: "MEO orbit ~20200 km", "signal triangulation", "atomic clock onboard", "receiver on Earth".',
    alt: 'Earth from orbit with a navigation satellite constellation — signal beams converging to a point on the surface',
    caption:
      'Four or more satellites simultaneously transmit radio signals. A receiver on Earth measures the delay from each one and computes its position to within a few meters.',
    aspectRatio: '16:9',
  },

  body: [
    {
      paragraphs: [
        'You open a navigation app and within a second a blue dot appears exactly where you are standing. ' +
        'Behind that everyday convenience lies one of the most demanding technical achievements ' +
        'in human history: several dozen satellites more than twenty thousand kilometers up, ' +
        'each carrying its own atomic clock, together computing your position more precisely ' +
        'than you could measure in footsteps.',

        'A global navigation satellite system is not one satellite and not one country. ' +
        'Today there are several: the American system most people know as the Global Positioning System, ' +
        'the Soviet and later Russian Global Navigation Satellite System, ' +
        'the European Galileo, the Chinese BeiDou, ' +
        'and regional systems operated by Japan and India. ' +
        'All are built on the same principle — measuring the travel time of a radio signal ' +
        'from a satellite to a receiver.',

        'The principle is simple to state but merciless in its precision demands. ' +
        'A radio signal travels at the speed of light — roughly three hundred thousand kilometers per second. ' +
        'To determine a distance to one-meter accuracy, you need to measure time ' +
        'to within a few nanoseconds. A nanosecond is one billionth of a second. ' +
        'No quartz watch is capable of that. Atomic clocks are required.',
      ],
    },

    {
      heading: 'Why atomic clocks are essential',
      level: 2,
      paragraphs: [
        'At the heart of any global navigation system lies a single problem: time. ' +
        'To measure the distance from a satellite to a receiver you need to know ' +
        'precisely when the satellite sent the signal and precisely when the receiver got it. ' +
        'The difference multiplied by the speed of light is the distance. ' +
        'But if the clock is off by even one microsecond, ' +
        'the position error is three hundred meters. ' +
        'Off by one millisecond — three hundred kilometers.',

        'Atomic clocks — cesium or rubidium — hold accuracy to approximately one nanosecond per day. ' +
        'That means over a million seconds they gain or lose one nanosecond. ' +
        'Even this must be systematically corrected for navigation purposes. ' +
        'Each navigation satellite carries two to four atomic clocks simultaneously, ' +
        'and ground stations continuously compare them against even more precise time standards.',

        'The inexpensive receiver in your phone has no atomic clock — but that is not a problem. ' +
        'By receiving signals from four or more satellites simultaneously, ' +
        'it can solve for its own clock error as a fourth unknown, ' +
        'alongside three coordinates in space. ' +
        'The fourth satellite converts an inaccurate quartz oscillator ' +
        'into something accurate enough to locate you.',
      ],
    },

    {
      image: {
        cacheKey: 'gps-gnss-atomic-clock',
        prompt:
          'Photorealistic scientific illustration of a cesium atomic clock unit used inside a navigation satellite: ' +
          'compact rectangular metal housing with vacuum chamber visible, microwave resonance cavity, ' +
          'internal optics and electronics, mounted inside a satellite structure. ' +
          'Hard sci-fi style, dark background, technical cross-section showing internal components. ' +
          'Add the following text labels on the image: "cesium resonance cavity", "microwave oscillator", "frequency standard", "1 ns/day accuracy".',
        alt: 'Cesium atomic clock inside a navigation satellite — internal structure with resonance cavity',
        caption:
          'A cesium atomic clock aboard a navigation satellite maintains accuracy to approximately one nanosecond per day. Without this level of precision, navigation satellite systems could not determine position better than hundreds of meters.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Trilateration: the geometry that pins down a point',
      level: 2,
      paragraphs: [
        'Knowing the distance from one satellite, you can only say: you are somewhere on a sphere ' +
        'of that radius centered on the satellite. ' +
        'A second satellite adds another sphere — you are now on the circle where the two spheres intersect. ' +
        'A third narrows this to two points. ' +
        'A fourth — in almost every case — leaves only one, ' +
        'and also allows the receiver\'s clock error to be removed.',

        'This method is called _trilateration_ — determining position from distances, ' +
        'not from angles (as in traditional triangulation). ' +
        'It requires the satellites to be spread across the sky: ' +
        'if they are all clustered in one corner of the sky, ' +
        'the geometry of the solution degrades sharply — ' +
        'engineers describe this as poor _satellite geometry_ or a large ' +
        'dilution of precision factor.',

        'That is why every global navigation system needs at least twenty-four satellites ' +
        'distributed across multiple orbital planes: so that at any point on Earth, ' +
        'at any moment in time, at least four satellites are above the horizon ' +
        'in sufficiently spread directions.',
      ],
    },

    {
      diagram: {
        title: 'Trilateration: how four satellites pin down a point',
        svg: `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="340" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Trilateration: from spheres to a point</text>

  <!-- Central receiver point -->
  <circle cx="340" cy="200" r="8" fill="#44ff88" opacity="0.9"/>
  <text x="340" y="222" fill="#44ff88" font-family="monospace" font-size="10" text-anchor="middle">Receiver</text>

  <!-- Satellite 1 top-left -->
  <circle cx="130" cy="80" r="6" fill="#7bb8ff" opacity="0.9"/>
  <text x="100" y="73" fill="#7bb8ff" font-family="monospace" font-size="9" text-anchor="middle">Satellite 1</text>
  <!-- Range circle 1 (arc suggestion) -->
  <ellipse cx="130" cy="80" rx="220" ry="145" fill="none" stroke="#7bb8ff" stroke-width="1" stroke-dasharray="6,4" opacity="0.35"/>
  <!-- Signal line 1 -->
  <line x1="136" y1="86" x2="334" y2="194" stroke="#7bb8ff" stroke-width="1.5" opacity="0.7"/>
  <text x="215" y="138" fill="#7bb8ff" font-family="monospace" font-size="9" transform="rotate(-32,215,138)">R1 = c x t1</text>

  <!-- Satellite 2 top-right -->
  <circle cx="560" cy="70" r="6" fill="#ff8844" opacity="0.9"/>
  <text x="590" y="65" fill="#ff8844" font-family="monospace" font-size="9" text-anchor="middle">Satellite 2</text>
  <ellipse cx="560" cy="70" rx="230" ry="148" fill="none" stroke="#ff8844" stroke-width="1" stroke-dasharray="6,4" opacity="0.35"/>
  <line x1="554" y1="76" x2="346" y2="194" stroke="#ff8844" stroke-width="1.5" opacity="0.7"/>
  <text x="462" y="130" fill="#ff8844" font-family="monospace" font-size="9" transform="rotate(30,462,130)">R2 = c x t2</text>

  <!-- Satellite 3 bottom-left -->
  <circle cx="100" cy="290" r="6" fill="#cc4444" opacity="0.9"/>
  <text x="68" y="285" fill="#cc4444" font-family="monospace" font-size="9" text-anchor="middle">Satellite 3</text>
  <ellipse cx="100" cy="290" rx="260" ry="120" fill="none" stroke="#cc4444" stroke-width="1" stroke-dasharray="6,4" opacity="0.35"/>
  <line x1="106" y1="284" x2="334" y2="206" stroke="#cc4444" stroke-width="1.5" opacity="0.7"/>
  <text x="200" y="255" fill="#cc4444" font-family="monospace" font-size="9" transform="rotate(-25,200,255)">R3 = c x t3</text>

  <!-- Satellite 4 bottom-right -->
  <circle cx="590" cy="300" r="6" fill="#aabbcc" opacity="0.9"/>
  <text x="622" y="295" fill="#aabbcc" font-family="monospace" font-size="9" text-anchor="middle">Satellite 4</text>
  <line x1="584" y1="294" x2="346" y2="206" stroke="#aabbcc" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6"/>
  <text x="480" y="265" fill="#aabbcc" font-family="monospace" font-size="9" transform="rotate(22,480,265)">R4 = resolves clock error</text>

  <!-- Legend bottom -->
  <text x="340" y="328" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">3 satellites = 2 candidate points; 4th removes receiver clock error and selects one</text>
</svg>`,
        caption:
          'Each satellite knows its precise position and the exact time it sent the signal. ' +
          'The receiver measures the delay and computes the range R = c times t. ' +
          'Three spheres intersect at two points — the fourth satellite selects the correct one ' +
          'and simultaneously corrects the receiver\'s inexpensive quartz clock error.',
      },
    },

    {
      heading: 'The orbit: why twenty thousand kilometers',
      level: 2,
      paragraphs: [
        'Navigation satellites occupy medium Earth orbits at roughly twenty-two hundred kilometers altitude. ' +
        'This is a deliberate compromise between several competing factors.',

        'In low orbits — from two hundred to two thousand kilometers — ' +
        'a satellite moves too fast and stays in view for only minutes. ' +
        'Global coverage would require hundreds of spacecraft. ' +
        'At geostationary altitude — thirty-six thousand kilometers — ' +
        'a satellite hovers stationary above a fixed point on the equator, ' +
        'but the long range means signals take longer to travel, increasing error. ' +
        'Geostationary orbit is also nearly invisible from polar regions.',

        'Medium orbit is the ideal balance: each satellite completes a full orbit in twelve hours, ' +
        'and the orbital planes are inclined so that different parts of Earth ' +
        'always see enough satellites simultaneously. ' +
        'The one-way signal travel time is roughly sixty-seven milliseconds — ' +
        'perfectly acceptable for navigation purposes.',
      ],
    },

    {
      image: {
        cacheKey: 'gps-gnss-meo-orbits',
        prompt:
          'Photorealistic scientific illustration showing Earth at center with three orbital shells labeled: ' +
          'inner shell (low Earth orbit ~400 km), middle shell (medium Earth orbit ~20200 km) highlighted with satellite dots, ' +
          'outer shell (geostationary orbit ~36000 km). ' +
          'Navigation satellites shown as small bright dots distributed evenly in the medium orbit shell, ' +
          'orbital planes drawn as faint rings at angles. Hard sci-fi style, dark space background. ' +
          'Add the following text labels on the image: "LEO ~400 km", "MEO ~20200 km (navigation satellites)", "GEO ~36000 km", "12-hour orbit period".',
        alt: 'Three Earth orbital shells — navigation satellites occupy the medium orbit at twenty thousand kilometers altitude',
        caption:
          'Navigation satellites occupy medium orbit — above the Van Allen radiation belts but well below geostationary altitude. This allows global coverage with a relatively small number of spacecraft.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Relativity and reality: the Einstein correction',
      level: 2,
      paragraphs: [
        'General relativity is not an abstraction for physicists. ' +
        'Had it been ignored when designing global navigation systems, ' +
        'your navigation app would be wrong by eleven kilometers every day, ' +
        'and the error would grow with every hour.',

        'Einstein predicted two effects that oppose each other in sign. ' +
        'First: time runs more slowly in a stronger gravitational field. ' +
        'A satellite at twenty thousand kilometers altitude sits in a weaker ' +
        'gravitational field than a clock on Earth, so its clock runs fast ' +
        'by approximately forty-five microseconds per day. ' +
        'Second: time runs more slowly for moving objects (special relativity). ' +
        'The satellite moves at roughly four kilometers per second, ' +
        'which slows its clock by approximately seven microseconds per day.',

        'The net result: an uncorrected satellite clock would run fast ' +
        'by roughly thirty-eight microseconds per day. ' +
        'Thirty-eight microseconds multiplied by the speed of light ' +
        'gives a position error of more than eleven kilometers per day of operation. ' +
        'To compensate, the onboard oscillator frequency is deliberately set slightly low ' +
        'before launch, and a software correction is applied in orbit. ' +
        'General relativity is literally embedded in every navigation chip.',
      ],
    },

    {
      heading: 'The major global navigation satellite systems',
      level: 2,
      paragraphs: [
        'The American system, known publicly as the Global Positioning System, ' +
        'was developed by the Department of Defense primarily for military purposes ' +
        'and became fully operational in 1995. ' +
        'The constellation consists of twenty-four or more satellites on six orbital planes. ' +
        'The civilian signal was opened to all users in the year 2000, ' +
        'when the Clinton administration turned off deliberate accuracy degradation ' +
        'known as selective availability.',

        'The Russian Global Navigation Satellite System was developed in the Soviet Union ' +
        'in parallel with the American program and declared operational in 1993, ' +
        'though the constellation was not always fully maintained after the Soviet collapse. ' +
        'Today it includes twenty-four satellites. ' +
        'A technical distinction from the American system: it uses frequency-division ' +
        'multiplexing for its signals rather than code-division.',

        'The European Galileo was designed from the outset as a civilian system ' +
        'with governance independent of any military authority. ' +
        'Initial operational services began in 2016, ' +
        'and full operational capability with thirty satellites across three orbital planes ' +
        'was achieved in the 2020s. ' +
        'Galileo delivers accuracy of approximately one meter on the public signal ' +
        'and centimeter-level on the commercial authenticated signal.',

        'The Chinese BeiDou is the youngest global system. ' +
        'It began as a regional network in the early 2000s ' +
        'and achieved global coverage in 2020 with thirty-five satellites. ' +
        'It combines satellites in medium orbit, geostationary orbit, ' +
        'and inclined geosynchronous orbit, providing enhanced coverage over Asia.',
      ],
    },

    {
      diagram: {
        title: 'Global navigation satellite systems — comparison',
        svg: `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="300" fill="rgba(10,15,25,0.5)"/>

  <!-- Title -->
  <text x="340" y="22" fill="#aabbcc" font-family="monospace" font-size="12" text-anchor="middle">Global Navigation Satellite Systems — comparison</text>

  <!-- Header row -->
  <text x="20"  y="48" fill="#667788" font-family="monospace" font-size="10">System</text>
  <text x="175" y="48" fill="#667788" font-family="monospace" font-size="10">Operator</text>
  <text x="325" y="48" fill="#667788" font-family="monospace" font-size="10">Satellites</text>
  <text x="430" y="48" fill="#667788" font-family="monospace" font-size="10">Orbit (km)</text>
  <text x="560" y="48" fill="#667788" font-family="monospace" font-size="10">Global since</text>

  <line x1="10" y1="54" x2="670" y2="54" stroke="#334455" stroke-width="0.8"/>

  <!-- GPS -->
  <text x="20"  y="76" fill="#7bb8ff" font-family="monospace" font-size="11">GPS</text>
  <text x="175" y="76" fill="#aabbcc" font-family="monospace" font-size="10">USA (DoD)</text>
  <text x="325" y="76" fill="#aabbcc" font-family="monospace" font-size="10">24+</text>
  <text x="430" y="76" fill="#aabbcc" font-family="monospace" font-size="10">20 200</text>
  <text x="560" y="76" fill="#aabbcc" font-family="monospace" font-size="10">1995</text>

  <line x1="10" y1="84" x2="670" y2="84" stroke="#334455" stroke-width="0.5" opacity="0.5"/>

  <!-- GLONASS -->
  <text x="20"  y="106" fill="#ff8844" font-family="monospace" font-size="11">GLONASS</text>
  <text x="175" y="106" fill="#aabbcc" font-family="monospace" font-size="10">Russia</text>
  <text x="325" y="106" fill="#aabbcc" font-family="monospace" font-size="10">24</text>
  <text x="430" y="106" fill="#aabbcc" font-family="monospace" font-size="10">19 100</text>
  <text x="560" y="106" fill="#aabbcc" font-family="monospace" font-size="10">1993</text>

  <line x1="10" y1="114" x2="670" y2="114" stroke="#334455" stroke-width="0.5" opacity="0.5"/>

  <!-- Galileo -->
  <text x="20"  y="136" fill="#44ff88" font-family="monospace" font-size="11">Galileo</text>
  <text x="175" y="136" fill="#aabbcc" font-family="monospace" font-size="10">EU (ESA)</text>
  <text x="325" y="136" fill="#aabbcc" font-family="monospace" font-size="10">30</text>
  <text x="430" y="136" fill="#aabbcc" font-family="monospace" font-size="10">23 222</text>
  <text x="560" y="136" fill="#aabbcc" font-family="monospace" font-size="10">2016</text>

  <line x1="10" y1="144" x2="670" y2="144" stroke="#334455" stroke-width="0.5" opacity="0.5"/>

  <!-- BeiDou -->
  <text x="20"  y="166" fill="#cc4444" font-family="monospace" font-size="11">BeiDou</text>
  <text x="175" y="166" fill="#aabbcc" font-family="monospace" font-size="10">China (CNSA)</text>
  <text x="325" y="166" fill="#aabbcc" font-family="monospace" font-size="10">35</text>
  <text x="430" y="166" fill="#aabbcc" font-family="monospace" font-size="10">21 528 (MEO)</text>
  <text x="560" y="166" fill="#aabbcc" font-family="monospace" font-size="10">2020</text>

  <line x1="10" y1="174" x2="670" y2="174" stroke="#334455" stroke-width="0.5" opacity="0.5"/>

  <!-- QZSS -->
  <text x="20"  y="196" fill="#8899aa" font-family="monospace" font-size="11">QZSS</text>
  <text x="175" y="196" fill="#aabbcc" font-family="monospace" font-size="10">Japan (JAXA)</text>
  <text x="325" y="196" fill="#aabbcc" font-family="monospace" font-size="10">4 (regional)</text>
  <text x="430" y="196" fill="#aabbcc" font-family="monospace" font-size="10">IGSO / GEO</text>
  <text x="560" y="196" fill="#aabbcc" font-family="monospace" font-size="10">2018</text>

  <line x1="10" y1="204" x2="670" y2="204" stroke="#334455" stroke-width="0.5" opacity="0.5"/>

  <!-- NavIC -->
  <text x="20"  y="226" fill="#8899aa" font-family="monospace" font-size="11">NavIC</text>
  <text x="175" y="226" fill="#aabbcc" font-family="monospace" font-size="10">India (ISRO)</text>
  <text x="325" y="226" fill="#aabbcc" font-family="monospace" font-size="10">7 (regional)</text>
  <text x="430" y="226" fill="#aabbcc" font-family="monospace" font-size="10">GEO / IGSO</text>
  <text x="560" y="226" fill="#aabbcc" font-family="monospace" font-size="10">2018</text>

  <line x1="10" y1="234" x2="670" y2="234" stroke="#334455" stroke-width="0.8"/>

  <text x="340" y="258" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">Modern receivers simultaneously track signals from two or more systems — improving accuracy and reliability</text>
  <text x="340" y="272" fill="#667788" font-family="monospace" font-size="9" text-anchor="middle">MEO = medium Earth orbit; GEO = geostationary; IGSO = inclined geosynchronous orbit</text>
</svg>`,
        caption:
          'Four global systems and two regional ones. ' +
          'Most modern smartphones simultaneously track signals from two or three systems, ' +
          'giving visibility of ten to fifteen satellites at once ' +
          'and significantly improving accuracy and reliability in urban canyons.',
      },
    },

    {
      heading: 'The ionosphere, troposphere, and other error sources',
      level: 2,
      paragraphs: [
        'A radio signal from a satellite travels twenty thousand kilometers of vacuum ' +
        'with almost no interference — but the last few hundred kilometers of atmosphere ' +
        'can distort it enough to destroy measurement accuracy.',

        '_Ionospheric delay_ is the largest removable error source. ' +
        'The ionosphere — a layer of charged particles at altitudes from sixty to one thousand kilometers — ' +
        'slows a radio signal in proportion to the electron density along the path. ' +
        'This density changes with time of day, season, and solar activity. ' +
        'Dual-frequency receivers solve this elegantly: ' +
        'the ionosphere delays different frequencies differently, ' +
        'so measuring on two frequencies allows the delay to be computed and cancelled mathematically.',

        '_Tropospheric delay_ — humidity and pressure in the lower atmosphere also slow the signal. ' +
        'This effect is frequency-independent, so dual frequency does not help. ' +
        'Instead, mathematical atmosphere models and weather station data are used. ' +
        'Additional error sources include signal reflections from buildings and surfaces ' +
        '(multipath propagation), errors in the satellite ephemeris ' +
        '(deviation of the actual orbit from the predicted one), ' +
        'and a relatively minor effect from Earth\'s rotation.',
      ],
    },

    {
      image: {
        cacheKey: 'gps-gnss-signal-errors',
        prompt:
          'Scientific diagram showing sources of GPS signal error: a navigation satellite at top, ' +
          'signal path going through labeled atmospheric layers: ionosphere (blue haze layer, 60-1000 km altitude), ' +
          'troposphere (lower atmosphere, grey layer), then down to Earth surface. ' +
          'One signal bouncing off a building (multipath error shown with red dashed line). ' +
          'Clean direct signal shown as solid cyan line. ' +
          'Hard sci-fi style, dark background, monospace labels. ' +
          'Add the following text labels on the image: "satellite", "ionospheric delay", "tropospheric delay", "multipath reflection", "receiver".',
        alt: 'Diagram of navigation signal error sources: ionospheric and tropospheric delays, multipath reflection from buildings',
        caption:
          'Ionospheric delay is the largest correctable error source. A dual-frequency receiver measures two frequencies and cancels the ionospheric effect mathematically. Multipath from buildings is harder to eliminate — which is why navigation in narrow city streets is less accurate.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'Differential correction and centimeter-level accuracy',
      level: 2,
      paragraphs: [
        'The standard civilian signal gives accuracy of one to five meters — ' +
        'sufficient for in-car navigation. ' +
        'Surveyors, construction machinery, and precision agriculture require far more.',

        'The Wide Area Augmentation System — operated across North America ' +
        'through a network of fixed reference stations — broadcasts corrections ' +
        'via geostationary relay satellites. ' +
        'These corrections account for current ionospheric conditions ' +
        'and satellite orbit refinements. ' +
        'Accuracy improves to approximately one to two meters without any change in the receiver.',

        'Real-Time Kinematic positioning is a fundamentally different approach. ' +
        'Alongside the receiver whose position you want to determine, ' +
        'a base station with precisely surveyed coordinates is placed nearby. ' +
        'The base station continuously computes its own error and broadcasts corrections. ' +
        'This technique achieves accuracy to a few centimeters — ' +
        'and even one to two centimeters under ideal conditions. ' +
        'It is the technology behind precision agriculture, geodetic surveying, ' +
        'construction machine guidance, and airport landing systems.',
      ],
    },

    {
      heading: 'Vulnerabilities and alternatives',
      level: 2,
      paragraphs: [
        'Global navigation satellite systems share one fundamental weakness: ' +
        'a satellite signal by the time it reaches Earth\'s surface is extraordinarily weak — ' +
        'far weaker than most radio interference. ' +
        'Deliberate jamming can block reception across tens of kilometers ' +
        'with a relatively simple and inexpensive transmitter. ' +
        'Spoofing — counterfeiting the signal — is even more dangerous: ' +
        'the receiver believes it is receiving genuine signals but computes false coordinates.',

        'Alternatives and supplements: inertial navigation systems use ' +
        'accelerometers and gyroscopes to track movement without any external signal, ' +
        'but accumulate error over time. ' +
        'Enhanced Long-Range Navigation based on the legacy Loran technology ' +
        'uses ground-based transmitters at a power level far harder to jam. ' +
        'Several countries, including the United Kingdom and South Korea, ' +
        'are reviving or deploying ground-based systems as backup ' +
        'should satellite systems be disrupted.',

        'The second civilian frequency — known as the L5 signal for the American system — ' +
        'was designed specifically with interference resistance in mind. ' +
        'It transmits in a frequency band protected from radio interference ' +
        'by international aviation agreements. ' +
        'Using both frequencies in a single receiver simultaneously solves ' +
        'the ionospheric problem and increases resilience against deliberate jamming.',
      ],
    },

    {
      image: {
        cacheKey: 'gps-gnss-applications',
        prompt:
          'Photorealistic scientific illustration showing four application domains of satellite navigation in a split-panel layout: ' +
          'top-left: precision agriculture — autonomous tractor with visible antenna working a field at night with satellite signal beam; ' +
          'top-right: aviation — aircraft cockpit instrument panel showing navigation display; ' +
          'bottom-left: shipping — cargo vessel bridge with electronic chart display; ' +
          'bottom-right: surveying — geodesist with a rover receiver on a tripod. ' +
          'Hard sci-fi style, dark tones, monospace labels. ' +
          'Add the following text labels on the image: "precision agriculture", "aviation navigation", "maritime", "geodetic survey".',
        alt: 'Four application domains of navigation satellite systems: precision agriculture, aviation, maritime, geodetic surveying',
        caption:
          'From geodetic surveys to autonomous tractors — Real-Time Kinematic positioning delivers centimeter accuracy where the standard civilian signal gives only several meters.',
        aspectRatio: '4:3',
      },
    },

    {
      heading: 'From concept to global infrastructure',
      level: 2,
      paragraphs: [
        'The idea of determining position from radio signals from known points ' +
        'predates the satellite era — ground-based systems such as Loran ' +
        'were used by aviation and navies from the mid-twentieth century. ' +
        'What became possible only with satellites was placing the signal source ' +
        'high enough to be visible from any point on the planet.',

        'The earliest navigation satellites, such as the American Transit system from the 1960s, ' +
        'did not provide real-time positioning. A receiver waited for a satellite to pass overhead ' +
        'and computed its location from the Doppler shift of the signal. ' +
        'The concept of three-dimensional real-time positioning with onboard atomic clocks ' +
        'matured in the 1970s and was embodied in the development of the American system.',

        'A tragic disaster — the shootdown of a civilian airliner over Soviet territory in 1983 ' +
        'due to a navigation error — became a turning point: ' +
        'President Reagan announced that once the system reached full operation, ' +
        'the civilian signal would be available to all users worldwide. ' +
        'The system became fully operational in 1995. ' +
        'In the year 2000, the removal of selective availability — ' +
        'the deliberate accuracy degradation — turned the navigation signal ' +
        'into a tool available to everyone, from a fisherman to a smartphone.',
      ],
    },
  ],

  glossary: [
    {
      term: 'Trilateration',
      definition:
        'A method of determining position from measured distances to several known points — as opposed to triangulation, which uses angles. A navigation satellite system uses four or more satellites for three-dimensional positioning and to eliminate receiver clock error.',
    },
    {
      term: 'Medium Earth orbit',
      definition:
        'An orbit at roughly two thousand to thirty-five thousand kilometers above Earth\'s surface. Navigation satellites occupy approximately twenty thousand kilometers altitude — a compromise between coverage, accuracy, and the number of spacecraft required.',
    },
    {
      term: 'Atomic clock',
      definition:
        'A clock that uses quantum transitions in cesium or rubidium atoms as its frequency reference. Maintains accuracy to approximately one nanosecond per day — a necessary condition for meter-level navigation.',
    },
    {
      term: 'Ionospheric delay',
      definition:
        'The slowing of a radio signal as it passes through the ionosphere — a layer of charged particles at altitudes from sixty to one thousand kilometers. Depends on signal frequency and is compensated by dual-frequency receivers.',
    },
    {
      term: 'Real-Time Kinematic positioning',
      definition:
        'A technique for improving navigation positioning accuracy using a base station with known coordinates that transmits differential corrections. Achieves accuracy to a few centimeters rather than a few meters.',
    },
    {
      term: 'Spoofing',
      definition:
        'An attack on a navigation receiver by broadcasting counterfeit satellite signals. The receiver computes false coordinates while believing it is receiving genuine signals. Particularly dangerous for unmanned aerial vehicles and ships.',
    },
    {
      term: 'Selective availability',
      definition:
        'Deliberate accuracy degradation of the civilian navigation signal, applied by the U.S. Department of Defense until the year 2000. After it was turned off, civilian accuracy improved from approximately one hundred meters to ten to fifteen meters and better.',
    },
    {
      term: 'Dilution of precision',
      definition:
        'A mathematical measure of how the geometry of the visible satellites degrades the final position accuracy. A low value means good geometry (satellites spread across the sky). A high value means poor geometry (all satellites clustered in one part of the sky).',
    },
  ],

  quiz: [
    {
      question: 'Why do navigation receivers require signals from at least four satellites rather than three?',
      options: [
        'Three satellites provide only a two-dimensional position without altitude',
        'Three spheres intersect at two points; the fourth selects the correct one and removes the receiver clock error',
        'The fourth satellite is needed to correct ionospheric delay',
        'Three satellites are insufficient to cover the entire Earth surface',
      ],
      correctIndex: 1,
      explanation:
        'Three measured distances from three satellites yield two mathematically possible points in three-dimensional space. The fourth satellite adds an equation that simultaneously selects the correct point and solves for the receiver\'s inexpensive quartz clock error as a fourth unknown.',
    },
    {
      question: 'What would happen to navigation accuracy if general relativity were ignored when designing satellite clocks?',
      options: [
        'Accuracy would degrade by a few centimeters per day',
        'The system would be completely unable to determine coordinates',
        'Position error would accumulate at more than eleven kilometers per day',
        'The effect is negligible and does not affect practical accuracy',
      ],
      correctIndex: 2,
      explanation:
        'General relativity predicts that clocks at twenty thousand kilometers altitude in a weaker gravitational field run fast by roughly forty-five microseconds per day. Special relativity slows them by seven microseconds due to orbital speed. The uncorrected net difference of about thirty-eight microseconds gives a position error exceeding eleven kilometers per day.',
    },
    {
      question: 'Which navigation satellite system was the first to become globally operational?',
      options: [
        'The American system, in 1995',
        'The Soviet and later Russian system, in 1982',
        'The Transit system, in 1960',
        'The Chinese BeiDou, in 2003',
      ],
      correctIndex: 0,
      explanation:
        'The American system became fully operational in 1995. The Transit system existed from the 1960s but did not provide real-time positioning. The Russian system was declared operational in 1993 but the constellation was not always fully maintained.',
    },
    {
      question: 'What is Real-Time Kinematic positioning and what accuracy does it achieve?',
      options: [
        'A method of predicting position from speed and heading — accuracy to one hundred meters',
        'A technique using a base station that transmits differential corrections — accuracy to a few centimeters',
        'A method using two receivers to compare signals — accuracy to one meter',
        'Software filtering of noise in the standard signal — accuracy to five meters',
      ],
      correctIndex: 1,
      explanation:
        'Real-Time Kinematic positioning uses a base station with precisely known coordinates that continuously computes its own error and transmits corrections to the rover receiver. Atmospheric, orbital, and clock errors are largely identical for both receivers in the same area — making the correction very effective. Accuracy reaches a few centimeters.',
    },
    {
      question: 'Why is a dual-frequency receiver more accurate than a single-frequency one?',
      options: [
        'It receives more satellites simultaneously',
        'It contains a built-in atomic clock',
        'The ionosphere delays different frequencies differently, allowing the delay to be computed and cancelled mathematically',
        'The second frequency is shielded from atmospheric interference',
      ],
      correctIndex: 2,
      explanation:
        'Ionospheric delay is inversely proportional to the square of the signal frequency. By measuring the delay on two different frequencies, the receiver can compute the difference and cancel the ionospheric component without any external data. This is the primary reason why Galileo and the modernized American system with the L5 signal offer significantly better accuracy.',
    },
  ],

  sources: [
    {
      title: 'IS-GPS-200 — Interface Specification for GPS (official)',
      url: 'https://www.gps.gov/technical/icwg/IS-GPS-200N.pdf',
      meta: 'U.S. Space Force, 2022, open access',
    },
    {
      title: 'European GNSS Agency — How Galileo works',
      url: 'https://www.euspa.europa.eu/european-space/galileo/what-galileo',
      meta: 'EUSPA, 2024, open access',
    },
    {
      title: 'Misra P., Enge P. — Global Positioning System: Signals, Measurements, and Performance',
      url: 'https://www.amazon.com/Global-Positioning-System-Measurements-Performance/dp/0970954425',
      meta: 'Ganga-Jamuna Press, 2nd ed., 2006 — academic reference',
    },
    {
      title: 'Ashby N. — Relativity in the Global Positioning System (Living Reviews in Relativity)',
      url: 'https://link.springer.com/article/10.12942/lrr-2003-1',
      meta: 'Springer, 2003, open access — classic paper on the relativity correction',
    },
    {
      title: 'GPS.gov — Official U.S. government information about GPS',
      url: 'https://www.gps.gov/',
      meta: 'U.S. Space Force / DOD, updated 2025',
    },
    {
      title: 'ESA — BeiDou navigation satellite system overview',
      url: 'https://gssc.esa.int/navipedia/index.php/BeiDou',
      meta: 'ESA Navipedia, 2024, open access',
    },
    {
      title: 'ION GNSS+ Conference Proceedings — Ionospheric delay models',
      url: 'https://www.ion.org/gnss/',
      meta: 'Institute of Navigation, annual conference',
    },
    {
      title: 'Dana P.H. — Global Positioning System Overview (University of Colorado)',
      url: 'https://www.colorado.edu/geography/gcraft/notes/gps/gps_f.html',
      meta: 'University of Colorado, open educational resource',
    },
    {
      title: 'GLONASS-ICD — GLONASS Interface Control Document',
      url: 'https://www.unavco.org/help/glossary/docs/ICD_GLONASS_5.1_(2008)_en.pdf',
      meta: 'Roscosmos, 2008, open access',
    },
    {
      title: 'RTK GPS: A User Guide — NovAtel',
      url: 'https://novatel.com/an-introduction-to-gnss/chapter-5-resolving-errors/real-time-kinematic-rtk',
      meta: 'NovAtel, technical guide, 2024',
    },
  ],

  lastVerified: '2026-05-06',
};

export default lesson;

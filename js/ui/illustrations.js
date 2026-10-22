/* ============================================================
   BizSim — illustrations.js
   ILUSTRASI SVG — pengganti emoji (poin 4, 42, 73)
   
   Karena tidak ada raster artwork/anime karakter asli, semua
   "gambar" di sini adalah SVG vector bergaya flat-modern yang
   KONSISTEN, dan MUDAH DIGANTI nanti dengan file .png/.jpg asli
   (tinggal ganti fungsi return-nya jadi <img src="assets/images/...">).
   
   Struktur folder assets/images/ (poin 4) sudah disiapkan di ZIP:
     assets/images/assets/     -> utk crypto, saham, emas, dll
     assets/images/business/   -> utk ilustrasi bisnis
     assets/images/jobs/       -> utk ilustrasi pekerjaan
     assets/images/characters/ -> utk portrait karyawan
     assets/images/events/     -> utk ilustrasi breaking news
     assets/images/ui/         -> utk elemen UI umum
   ============================================================ */

const BSIllustration = {
  // ==================== DIGITAL ASSETS (poin 5) ====================
  // Tiap asset punya ilustrasi SENDIRI, tidak satu gambar generik
  asset(assetType, size = 40) {
    const generators = {
      bitcoin: () => this._coinSVG(size, "#F7931A", "₿"),
      ethereum: () => this._coinSVG(size, "#627EEA", "Ξ"),
      gold: () => this._goldBarSVG(size),
      stock: () => this._chartSVG(size, "#4F6BFF"),
      crypto_generic: () => this._coinSVG(size, "#6B7089", "◈"),
      land: () => this._landSVG(size),
      house: () => this._houseSVG(size),
      apartment: () => this._apartmentSVG(size),
      shophouse: () => this._shophouseSVG(size),
      warehouse: () => this._warehouseSVG(size),
      vehicle: () => this._vehicleSVG(size),
      machine: () => this._machineSVG(size),
    };
    return (generators[assetType] || generators.stock)();
  },

  _coinSVG(size, color, symbol) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${color}"/>
      <circle cx="20" cy="20" r="18" fill="url(#coinShine)" opacity="0.3"/>
      <text x="20" y="27" font-size="18" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial">${symbol}</text>
      <defs><linearGradient id="coinShine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </linearGradient></defs>
    </svg>`;
  },

  _goldBarSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="14" width="28" height="16" rx="2" fill="#F5C542"/>
      <rect x="6" y="14" width="28" height="4" rx="2" fill="#FFE08A"/>
      <rect x="10" y="10" width="20" height="6" rx="1.5" fill="#E0A92E" transform="skewX(-10)"/>
    </svg>`;
  },

  _chartSVG(size, color) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="${color}22"/>
      <polyline points="6,28 14,20 20,24 28,10 34,14" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="34" cy="14" r="2.5" fill="${color}"/>
    </svg>`;
  },

  _landSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#DCEFD8"/>
      <path d="M6 28 L16 14 L24 22 L34 10 L34 30 L6 30 Z" fill="#7BC47F"/>
      <path d="M6 28 L16 14 L24 22 L34 10" fill="none" stroke="#4E9450" stroke-width="1.5"/>
    </svg>`;
  },

  _houseSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#FCE8D8"/>
      <path d="M20 8 L34 20 L30 20 L30 32 L10 32 L10 20 L6 20 Z" fill="#E28B4E"/>
      <rect x="17" y="24" width="6" height="8" fill="#8C4A22"/>
    </svg>`;
  },

  _apartmentSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#DDE6FA"/>
      <rect x="10" y="6" width="20" height="28" fill="#7B93D6"/>
      <rect x="13" y="10" width="4" height="4" fill="#FFE9A8"/>
      <rect x="21" y="10" width="4" height="4" fill="#FFE9A8"/>
      <rect x="13" y="17" width="4" height="4" fill="#FFE9A8"/>
      <rect x="21" y="17" width="4" height="4" fill="#FFE9A8"/>
      <rect x="13" y="24" width="4" height="4" fill="#FFE9A8"/>
      <rect x="21" y="24" width="4" height="4" fill="#FFE9A8"/>
    </svg>`;
  },

  _shophouseSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#F8E3D0"/>
      <rect x="8" y="12" width="24" height="20" fill="#D9985B"/>
      <rect x="8" y="12" width="24" height="4" fill="#B9743A"/>
      <rect x="12" y="20" width="6" height="12" fill="#7A4A26"/>
      <rect x="22" y="20" width="6" height="6" fill="#FFE9A8"/>
    </svg>`;
  },

  _warehouseSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#E4E7ED"/>
      <path d="M4 18 L20 8 L36 18 L36 32 L4 32 Z" fill="#9098AC"/>
      <rect x="16" y="22" width="8" height="10" fill="#5C637A"/>
    </svg>`;
  },

  _vehicleSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#DCEAF8"/>
      <path d="M6 24 L9 16 L31 16 L34 24 Z" fill="#4F6BFF"/>
      <rect x="4" y="24" width="32" height="6" rx="2" fill="#3450E0"/>
      <circle cx="12" cy="31" r="3" fill="#1A1D2E"/>
      <circle cx="28" cy="31" r="3" fill="#1A1D2E"/>
    </svg>`;
  },

  _machineSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#EAE4F5"/>
      <rect x="10" y="12" width="20" height="18" rx="2" fill="#8B6FC9"/>
      <circle cx="16" cy="21" r="4" fill="#5C3F94"/>
      <circle cx="24" cy="21" r="2.5" fill="#5C3F94"/>
      <rect x="14" y="8" width="12" height="4" fill="#6B4FAE"/>
    </svg>`;
  },

  // ==================== CHARACTER PORTRAIT (poin 20-21, 57) ====================
  // Variasi berdasarkan seed (rambut, wajah, warna baju, gender) — bukan semua identik
  characterPortrait(seed, gender = "male", size = 56) {
    const hairColors = ["#3B2314", "#1A1A1A", "#5C3A21", "#2E2E2E", "#704214"];
    const skinTones = ["#F2C9A0", "#E8B48A", "#D9A374", "#C68863", "#A56A45"];
    const outfitColors = ["#4F6BFF", "#1FAE6E", "#FF7A45", "#7B5CFA", "#F5A623", "#E5484D"];

    const rand = this._seededRandom(seed);
    const hairColor = hairColors[Math.floor(rand() * hairColors.length)];
    const skinTone = skinTones[Math.floor(rand() * skinTones.length)];
    const outfitColor = outfitColors[Math.floor(rand() * outfitColors.length)];
    const hairStyle = Math.floor(rand() * 3); // 0,1,2 variasi gaya rambut

    let hairPath = "";
    if (gender === "male") {
      hairPath = hairStyle === 0
        ? `<path d="M10 18 Q20 6 30 18 L30 14 Q20 4 10 14 Z" fill="${hairColor}"/>`
        : `<path d="M9 17 Q20 4 31 17 L30 20 Q20 10 10 20 Z" fill="${hairColor}"/>`;
    } else {
      hairPath = `<path d="M8 16 Q20 3 32 16 L33 30 L28 28 L28 18 Q20 10 12 18 L12 28 L7 30 Z" fill="${hairColor}"/>`;
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" fill="${outfitColor}22"/>
      <circle cx="20" cy="19" r="10" fill="${skinTone}"/>
      <rect x="10" y="30" width="20" height="10" rx="4" fill="${outfitColor}"/>
      ${hairPath}
      <circle cx="16" cy="19" r="1.3" fill="#2A2A2A"/>
      <circle cx="24" cy="19" r="1.3" fill="#2A2A2A"/>
      <path d="M17 24 Q20 26 23 24" stroke="#8A5A3D" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    </svg>`;
  },

  // Seeded random generator sederhana agar konsisten per employee/character
  _seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  },

  // ==================== BUSINESS ILLUSTRATION ====================
  business(type, size = 80) {
    const generators = {
      bookstore: () => this._bookstoreSVG(size),
      cafe: () => this._cafeSVG(size),
      retail: () => this._retailSVG(size),
      generic: () => this._genericBusinessSVG(size),
    };
    return (generators[type] || generators.generic)();
  },

  _bookstoreSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="16" fill="var(--bs-primary-light, #EEF1FF)"/>
      <rect x="16" y="30" width="48" height="34" fill="#4F6BFF"/>
      <rect x="16" y="30" width="48" height="6" fill="#3450E0"/>
      <rect x="24" y="42" width="6" height="16" fill="#FFD166"/>
      <rect x="32" y="42" width="6" height="16" fill="#FF7A45"/>
      <rect x="40" y="42" width="6" height="16" fill="#1FAE6E"/>
      <rect x="48" y="42" width="6" height="16" fill="#7B5CFA"/>
      <path d="M16 30 L40 16 L64 30" fill="none" stroke="#3450E0" stroke-width="3"/>
    </svg>`;
  },

  _cafeSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="16" fill="#FCEFE3"/>
      <rect x="20" y="34" width="40" height="28" rx="4" fill="#B9743A"/>
      <ellipse cx="40" cy="34" rx="20" ry="6" fill="#8C4A22"/>
      <path d="M56 40 Q66 40 64 48 Q62 54 54 52" fill="none" stroke="#8C4A22" stroke-width="3"/>
      <path d="M32 24 Q30 18 34 14" fill="none" stroke="#D9985B" stroke-width="2" stroke-linecap="round"/>
      <path d="M40 24 Q38 18 42 14" fill="none" stroke="#D9985B" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  },

  _retailSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="16" fill="#E3F2EE"/>
      <path d="M18 26 L62 26 L58 62 L22 62 Z" fill="#1FAE6E"/>
      <path d="M18 26 L24 14 L56 14 L62 26" fill="none" stroke="#0F8054" stroke-width="3"/>
      <circle cx="32" cy="40" r="3" fill="white"/>
      <circle cx="48" cy="40" r="3" fill="white"/>
    </svg>`;
  },

  _genericBusinessSVG(size) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="16" fill="#EDEFFA"/>
      <rect x="20" y="24" width="40" height="38" fill="#7B5CFA"/>
      <rect x="26" y="32" width="6" height="6" fill="#FFE9A8"/>
      <rect x="37" y="32" width="6" height="6" fill="#FFE9A8"/>
      <rect x="48" y="32" width="6" height="6" fill="#FFE9A8"/>
      <rect x="26" y="44" width="6" height="6" fill="#FFE9A8"/>
      <rect x="37" y="44" width="6" height="6" fill="#FFE9A8"/>
      <rect x="48" y="44" width="6" height="6" fill="#FFE9A8"/>
    </svg>`;
  },

  // ==================== JOB / PROFESSION ILLUSTRATION (poin 42) ====================
  job(type, size = 80) {
    const generators = {
      youtuber: () => this._jobIconSVG(size, "#FF0000", "▶", "#FFFFFF"),
      tiktoker: () => this._jobIconSVG(size, "#1A1A2E", "♪", "#25F4EE"),
      clipper: () => this._jobIconSVG(size, "#4F6BFF", "✂", "#FFFFFF"),
      barista: () => this._jobIconSVG(size, "#8C4A22", "☕", "#FFE9A8"),
      programmer: () => this._jobIconSVG(size, "#1A1D2E", "</>", "#4F6BFF"),
      designer: () => this._jobIconSVG(size, "#FF7A45", "✎", "#FFFFFF"),
      office: () => this._jobIconSVG(size, "#4F6BFF", "💼", "#FFFFFF"),
    };
    return (generators[type] || generators.office)();
  },

  _jobIconSVG(size, bgColor, symbol, symbolColor) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="20" fill="${bgColor}"/>
      <text x="40" y="50" font-size="28" font-weight="bold" fill="${symbolColor}" text-anchor="middle" font-family="Arial">${symbol}</text>
    </svg>`;
  },

  // ==================== EVENT / NEWS ILLUSTRATION (poin 47) ====================
  eventBanner(category, size = 60) {
    const colorMap = {
      war: "#E5484D", economic: "#F5A623", technology: "#4F6BFF",
      disaster: "#E5484D", crypto: "#7B5CFA", energy: "#FF7A45",
      company: "#1FAE6E", politics: "#6B7089",
    };
    const symbolMap = {
      war: "⚔", economic: "📊", technology: "⚡", disaster: "🌪",
      crypto: "◈", energy: "🔋", company: "🏢", politics: "🏛",
    };
    const color = colorMap[category] || "#6B7089";
    return `<svg width="${size}" height="${size}" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="14" fill="${color}22"/>
      <circle cx="30" cy="30" r="20" fill="${color}"/>
      <text x="30" y="38" font-size="18" text-anchor="middle" font-family="Arial">${symbolMap[category] || "!"}</text>
    </svg>`;
  },
};

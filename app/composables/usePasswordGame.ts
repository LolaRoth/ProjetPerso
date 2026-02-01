/**
 * The Password Game - Version avec vraies API externes
 * Inspiré de neal.fun/password-game
 */
import { ref, computed, reactive, watch, onUnmounted } from "vue";

// ============== TYPES ==============
export interface PasswordRule {
  id: number;
  name: string;
  description: string;
  validator: (password: string, context: RuleContext) => boolean;
  errorMessage: (password: string, context: RuleContext) => string;
  hint?: string;
  difficulty:
    | "easy"
    | "medium"
    | "hard"
    | "insane"
    | "impossible"
    | "nightmare";
  dynamic?: boolean;
  requiresApi?: boolean;
}

export interface RuleContext {
  // Temps
  currentTime: Date;

  // Mots et textes
  requiredWord: string;
  requiredColor: string;
  forbiddenLetters: string[];
  forbiddenWord: string;
  requiredEmoji: string;
  romanNumeral: string;

  // Nombres
  requiredNumber: number;
  primeNumber: number;
  fibonacci: number;
  piDigits: string;

  // Données dynamiques
  countdownLetter: string;
  countdownActive: boolean;
  moonPhase: string;
  captchaAnswer: string;

  // API externes
  weatherCity: string;
  weatherTemp: number | null;
  weatherLoading: boolean;

  bitcoinPrice: number | null;
  bitcoinLoading: boolean;

  randomQuote: string;
  randomQuoteAuthor: string;
  quoteLoading: boolean;

  countryFlag: string;
  countryName: string;

  dailyNumber: number;

  currentYear: number;

  ipLastDigit: string | null;
  ipLoading: boolean;

  catFact: string;
  catFactLoading: boolean;

  jokeSetup: string;
  jokePunchline: string;
  jokeLoading: boolean;

  // Divers
  countryCapital: { country: string; capital: string };
  periodicElement: { symbol: string; name: string; number: number };
  randomYear: number;
  sponsorBrand: string;
  requiredAnimal: string;
  chessMove: string;
  hexColor: string;
  morseChar: { letter: string; morse: string };
  binaryNumber: { decimal: number; binary: string };
  secondsTarget: number;
  mathExpression: { expression: string; result: number };
  youtubeCode: string;
  leapYear: number;
  pokemonName: string;
  chemicalFormula: { name: string; formula: string };
  wordle: string;
  asciiArt: string;
  latitude: number;
  atomicNumber: number;
}

// ============== DONNÉES ==============
const EMOJIS = [
  "😀",
  "😎",
  "🔥",
  "💀",
  "🎉",
  "💡",
  "⭐",
  "🌙",
  "🍕",
  "🚀",
  "💎",
  "🎮",
  "🎯",
  "🌈",
  "🦄",
  "👻",
  "🤖",
  "🧠",
  "🎪",
  "🌺",
];
const COLORS = [
  "rouge",
  "bleu",
  "vert",
  "jaune",
  "orange",
  "violet",
  "rose",
  "noir",
  "blanc",
  "gris",
];
const RANDOM_WORDS = [
  "chaos",
  "pixel",
  "glitch",
  "néon",
  "cyber",
  "vortex",
  "quantum",
  "matrix",
  "binary",
  "cosmic",
];
const FORBIDDEN_CANDIDATES = ["e", "a", "s", "t", "i", "n", "r", "u", "o", "l"];
const MOON_PHASES = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

const CAPITALS = [
  { country: "France", capital: "Paris" },
  { country: "Japon", capital: "Tokyo" },
  { country: "Australie", capital: "Canberra" },
  { country: "Brésil", capital: "Brasilia" },
  { country: "Canada", capital: "Ottawa" },
  { country: "Égypte", capital: "Le Caire" },
  { country: "Inde", capital: "New Delhi" },
  { country: "Maroc", capital: "Rabat" },
];

const ELEMENTS = [
  { symbol: "H", name: "Hydrogène", number: 1 },
  { symbol: "He", name: "Hélium", number: 2 },
  { symbol: "C", name: "Carbone", number: 6 },
  { symbol: "O", name: "Oxygène", number: 8 },
  { symbol: "Fe", name: "Fer", number: 26 },
  { symbol: "Au", name: "Or", number: 79 },
  { symbol: "Ag", name: "Argent", number: 47 },
];

const SPONSOR_BRANDS = [
  "Pepsi",
  "Nike",
  "Coca",
  "Apple",
  "Google",
  "Tesla",
  "Amazon",
  "Netflix",
];
const ANIMALS = [
  "chat",
  "chien",
  "lion",
  "tigre",
  "ours",
  "loup",
  "renard",
  "aigle",
];
const CHESS_MOVES = ["e4", "d4", "Nf3", "Bc4", "Qh5", "O-O", "Ke2"];
const MORSE_CODES = [
  { letter: "A", morse: ".-" },
  { letter: "B", morse: "-..." },
  { letter: "S", morse: "..." },
  { letter: "O", morse: "---" },
  { letter: "E", morse: "." },
];
const POKEMON_NAMES = [
  "Pikachu",
  "Bulbizarre",
  "Salamèche",
  "Carapuce",
  "Évoli",
  "Mewtwo",
  "Dracaufeu",
];
const CHEMICAL_FORMULAS = [
  { name: "eau", formula: "H2O" },
  { name: "dioxyde de carbone", formula: "CO2" },
  { name: "sel", formula: "NaCl" },
];
const WORDLE_WORDS = [
  "CYBER",
  "PIXEL",
  "CHAOS",
  "LASER",
  "ROBOT",
  "VIRUS",
  "CLOUD",
];
const PRIME_NUMBERS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
const CITIES = [
  "Paris",
  "Londres",
  "Tokyo",
  "New York",
  "Sydney",
  "Berlin",
  "Madrid",
];
const COUNTRY_FLAGS = [
  { flag: "🇫🇷", name: "France" },
  { flag: "🇯🇵", name: "Japon" },
  { flag: "🇺🇸", name: "USA" },
  { flag: "🇬🇧", name: "Royaume-Uni" },
  { flag: "🇩🇪", name: "Allemagne" },
  { flag: "🇮🇹", name: "Italie" },
  { flag: "🇪🇸", name: "Espagne" },
  { flag: "🇧🇷", name: "Brésil" },
];

// ============== HELPERS ==============
const getRandomElement = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)] as T;
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j] as T, newArray[i] as T];
  }
  return newArray;
};

const toRoman = (num: number): string => {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = [
    "M",
    "CM",
    "D",
    "CD",
    "C",
    "XC",
    "L",
    "XL",
    "X",
    "IX",
    "V",
    "IV",
    "I",
  ];
  let result = "";
  for (let i = 0; i < values.length; i++) {
    while (num >= (values[i] ?? 0)) {
      result += symbols[i] ?? "";
      num -= values[i] ?? 0;
    }
  }
  return result;
};

const getPI = (digits: number): string =>
  "3.14159265358979323846".substring(0, digits + 2);

const getMoonPhase = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const c = Math.floor(year / 100);
  const y = year - c * 100;
  const j = Math.floor((c * 146097) / 4);
  const k = Math.floor((y * 1461) / 4);
  const l = Math.floor((month + 10) / 12);
  const n = month + 12 * l - 3;
  const p = Math.floor((n * 30 + 59) / 100) - l;
  const q = j + k + day + p - 2415019 - 1;
  const r = q % 29.53058867;
  const phaseIndex = Math.floor((r / 29.53058867) * 8) % 8;
  return MOON_PHASES[phaseIndex] ?? "🌕";
};

const generateHexColor = (): string =>
  `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;

const generateBinaryNumber = () => {
  const decimal = Math.floor(Math.random() * 15) + 5;
  return { decimal, binary: decimal.toString(2) };
};

const generateMathExpression = () => {
  const a = Math.floor(Math.random() * 20) + 5;
  const b = Math.floor(Math.random() * 10) + 2;
  const ops = ["+", "-", "*"] as const;
  const op = getRandomElement(ops);
  const result = op === "+" ? a + b : op === "-" ? a - b : a * b;
  return { expression: `${a} ${op === "*" ? "×" : op} ${b}`, result };
};

const generateYoutubeCode = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  return Array(11)
    .fill(0)
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
};

const generateASCII = () =>
  getRandomElement(["<3", ":)", "^_^", "o_O", "\\o/", "(*)", "~_~"]);

// ============== API CALLS ==============
const fetchWeather = async (city: string): Promise<number | null> => {
  try {
    // Open-Meteo API (gratuite, pas de clé requise)
    const geocodeRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
    );
    const geocodeData = await geocodeRes.json();
    if (!geocodeData.results?.[0]) return null;

    const { latitude, longitude } = geocodeData.results[0];
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
    );
    const weatherData = await weatherRes.json();
    return Math.round(weatherData.current_weather?.temperature ?? 20);
  } catch {
    return Math.round(15 + Math.random() * 15); // Fallback
  }
};

const fetchBitcoinPrice = async (): Promise<number | null> => {
  try {
    const res = await fetch(
      "https://api.coindesk.com/v1/bpi/currentprice/EUR.json",
    );
    const data = await res.json();
    return Math.round(data.bpi.EUR.rate_float / 1000); // En milliers
  } catch {
    return Math.round(40 + Math.random() * 30); // Fallback en milliers
  }
};

const fetchRandomQuote = async (): Promise<{
  quote: string;
  author: string;
}> => {
  try {
    const res = await fetch("https://api.quotable.io/random?maxLength=50");
    const data = await res.json();
    return { quote: data.content, author: data.author };
  } catch {
    return { quote: "To be or not to be", author: "Shakespeare" };
  }
};

const fetchCatFact = async (): Promise<string> => {
  try {
    const res = await fetch("https://catfact.ninja/fact?max_length=100");
    const data = await res.json();
    return data.fact;
  } catch {
    return "Cats sleep 70% of their lives.";
  }
};

const fetchJoke = async (): Promise<{ setup: string; punchline: string }> => {
  try {
    const res = await fetch(
      "https://official-joke-api.appspot.com/random_joke",
    );
    const data = await res.json();
    return { setup: data.setup, punchline: data.punchline };
  } catch {
    return { setup: "Why do programmers prefer dark mode?", punchline: "bugs" };
  }
};

const fetchPublicIP = async (): Promise<string | null> => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    const ip = data.ip as string;
    return ip.split(".").pop() ?? null;
  } catch {
    return String(Math.floor(Math.random() * 256));
  }
};

// ============== RÈGLES DU JEU (50 règles) ==============
const createRules = (): PasswordRule[] => [
  // ========== EASY (1-5) ==========
  {
    id: 1,
    name: "Longueur minimale",
    description: "Le mot de passe doit contenir au moins 8 caractères",
    validator: (p) => p.length >= 8,
    errorMessage: (p) =>
      `Il manque ${8 - p.length} caractère${8 - p.length > 1 ? "s" : ""}`,
    difficulty: "easy",
  },
  {
    id: 2,
    name: "Majuscule requise",
    description: "Le mot de passe doit contenir au moins une lettre majuscule",
    validator: (p) => /[A-Z]/.test(p),
    errorMessage: () => "Aucune majuscule détectée",
    difficulty: "easy",
  },
  {
    id: 3,
    name: "Chiffre requis",
    description: "Le mot de passe doit contenir au moins un chiffre",
    validator: (p) => /[0-9]/.test(p),
    errorMessage: () => "Aucun chiffre trouvé",
    difficulty: "easy",
  },
  {
    id: 4,
    name: "Caractère spécial",
    description:
      "Le mot de passe doit contenir un caractère spécial (!@#$%^&*)",
    validator: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    errorMessage: () => "Il manque un caractère spécial",
    difficulty: "easy",
  },
  {
    id: 5,
    name: "Minuscule requise",
    description: "Le mot de passe doit contenir au moins une lettre minuscule",
    validator: (p) => /[a-z]/.test(p),
    errorMessage: () => "Aucune minuscule détectée",
    difficulty: "easy",
  },

  // ========== MEDIUM (6-12) ==========
  {
    id: 6,
    name: "Emoji obligatoire",
    description: "Le mot de passe doit contenir un emoji 🎉",
    validator: (p) => /\p{Emoji}/u.test(p),
    errorMessage: () => "Les emojis, c'est la vie 😤",
    difficulty: "medium",
  },
  {
    id: 7,
    name: "Mot magique",
    description: "Le mot de passe doit contenir le mot secret",
    validator: (p, ctx) =>
      p.toLowerCase().includes(ctx.requiredWord.toLowerCase()),
    errorMessage: (_, ctx) => `Le mot "${ctx.requiredWord}" doit apparaître`,
    difficulty: "medium",
  },
  {
    id: 8,
    name: "Couleur imposée",
    description: "Le mot de passe doit contenir une couleur en français",
    validator: (p, ctx) =>
      p.toLowerCase().includes(ctx.requiredColor.toLowerCase()),
    errorMessage: (_, ctx) => `La couleur "${ctx.requiredColor}" est requise`,
    difficulty: "medium",
  },
  {
    id: 9,
    name: "Année spécifique",
    description: "Inclus l'année indiquée",
    validator: (p, ctx) => p.includes(String(ctx.randomYear)),
    errorMessage: (_, ctx) => `L'année ${ctx.randomYear} doit apparaître`,
    difficulty: "medium",
  },
  {
    id: 10,
    name: "Sponsor obligatoire",
    description: "Ce mot de passe est sponsorisé ! 🎯",
    validator: (p, ctx) =>
      p.toLowerCase().includes(ctx.sponsorBrand.toLowerCase()),
    errorMessage: (_, ctx) =>
      `🎯 Sponsorisé par ${ctx.sponsorBrand}™ - Inclus "${ctx.sponsorBrand}"`,
    difficulty: "medium",
  },
  {
    id: 11,
    name: "Animal totem",
    description: "Inclus ton animal totem",
    validator: (p, ctx) =>
      p.toLowerCase().includes(ctx.requiredAnimal.toLowerCase()),
    errorMessage: (_, ctx) => `L'animal "${ctx.requiredAnimal}" est requis`,
    difficulty: "medium",
  },
  {
    id: 12,
    name: "Double lettre",
    description: "Contient une lettre doublée (aa, bb, cc...)",
    validator: (p) => /(.)\1/.test(p.toLowerCase()),
    errorMessage: () => "Aucune lettre doublée (ex: aa, bb, ll...)",
    difficulty: "medium",
  },

  // ========== HARD (13-22) ==========
  {
    id: 13,
    name: "🌡️ Température actuelle",
    description: "Inclus la température actuelle (en °C) de la ville indiquée",
    validator: (p, ctx) => {
      if (ctx.weatherLoading || ctx.weatherTemp === null) return true;
      return p.includes(String(ctx.weatherTemp));
    },
    errorMessage: (_, ctx) => {
      if (ctx.weatherLoading) return "⏳ Chargement de la météo...";
      return `🌡️ Quelle température fait-il à ${ctx.weatherCity} ? (cherche sur internet)`;
    },
    hint: "Utilise un site météo pour trouver la température actuelle",
    requiresApi: true,
    dynamic: true,
    difficulty: "hard",
  },
  {
    id: 14,
    name: "Heure actuelle",
    description:
      "Le mot de passe doit contenir l'heure actuelle (format HH:MM)",
    validator: (p, ctx) => {
      const hours = ctx.currentTime.getHours().toString().padStart(2, "0");
      const minutes = ctx.currentTime.getMinutes().toString().padStart(2, "0");
      return p.includes(`${hours}:${minutes}`);
    },
    errorMessage: () =>
      "L'heure actuelle au format HH:MM doit apparaître (regarde l'horloge !)",
    hint: "Format 24h avec deux-points, ex: 09:35 ou 14:22",
    dynamic: true,
    difficulty: "hard",
  },
  {
    id: 15,
    name: "Nombre premier",
    description: "Inclus un nombre premier spécifique",
    validator: (p, ctx) => p.includes(String(ctx.primeNumber)),
    errorMessage: (_, ctx) => `Le nombre premier ${ctx.primeNumber} est requis`,
    hint: "2, 3, 5, 7, 11, 13, 17...",
    difficulty: "hard",
  },
  {
    id: 16,
    name: "Chiffre romain",
    description: "Inclus un chiffre romain spécifique",
    validator: (p, ctx) => p.toUpperCase().includes(ctx.romanNumeral),
    errorMessage: (_, ctx) =>
      `Le chiffre romain "${ctx.romanNumeral}" est requis`,
    difficulty: "hard",
  },
  {
    id: 17,
    name: "🏛️ Capitale du monde",
    description: "Quelle est la capitale de ce pays ?",
    validator: (p, ctx) =>
      p.toLowerCase().includes(ctx.countryCapital.capital.toLowerCase()),
    errorMessage: (_, ctx) =>
      `Capitale de ${ctx.countryCapital.country} = ? Inclus-la !`,
    difficulty: "hard",
  },
  {
    id: 18,
    name: "⚗️ Élément périodique",
    description: "Inclus le symbole chimique demandé",
    validator: (p, ctx) => p.includes(ctx.periodicElement.symbol),
    errorMessage: (_, ctx) =>
      `Symbole de ${ctx.periodicElement.name} (${ctx.periodicElement.symbol}) requis`,
    difficulty: "hard",
  },
  {
    id: 19,
    name: "♟️ Coup d'échecs",
    description: "Inclus une notation de coup d'échecs",
    validator: (p, ctx) => p.includes(ctx.chessMove),
    errorMessage: (_, ctx) => `Le coup "${ctx.chessMove}" doit apparaître`,
    difficulty: "hard",
  },
  {
    id: 20,
    name: "🎨 Code hexadécimal",
    description: "Inclus le code couleur hexadécimal",
    validator: (p, ctx) => p.toUpperCase().includes(ctx.hexColor.toUpperCase()),
    errorMessage: (_, ctx) => `Code couleur ${ctx.hexColor} requis`,
    difficulty: "hard",
  },
  {
    id: 21,
    name: "Palindrome",
    description: "Contient un palindrome de 3+ lettres",
    validator: (p) => {
      const clean = p.toLowerCase().replace(/[^a-z]/g, "");
      for (let i = 0; i <= clean.length - 3; i++) {
        for (let len = 3; len <= clean.length - i; len++) {
          const sub = clean.substring(i, i + len);
          if (sub === sub.split("").reverse().join("")) return true;
        }
      }
      return false;
    },
    errorMessage: () => "Aucun palindrome (ex: aba, radar, kayak)",
    difficulty: "hard",
  },
  {
    id: 22,
    name: "🚫 Mot interdit",
    description: "Un mot spécifique est INTERDIT",
    validator: (p, ctx) =>
      !p.toLowerCase().includes(ctx.forbiddenWord.toLowerCase()),
    errorMessage: (_, ctx) => `Le mot "${ctx.forbiddenWord}" est INTERDIT !`,
    difficulty: "hard",
  },

  // ========== INSANE (23-33) ==========
  {
    id: 23,
    name: "₿ Prix du Bitcoin",
    description:
      "Inclus le prix actuel du Bitcoin en milliers d'euros (arrondi)",
    validator: (p, ctx) => {
      if (ctx.bitcoinLoading || ctx.bitcoinPrice === null) return true;
      return p.includes(String(ctx.bitcoinPrice));
    },
    errorMessage: (_, ctx) => {
      if (ctx.bitcoinLoading) return "⏳ Chargement du cours Bitcoin...";
      return "₿ Combien vaut 1 Bitcoin en milliers d'euros ? (cherche sur Google)";
    },
    hint: "Ex: si 1 BTC = 45 000€, tu dois inclure '45'",
    requiresApi: true,
    difficulty: "insane",
  },
  {
    id: 24,
    name: "🌙 Phase de la lune",
    description: "Inclus l'emoji de la phase lunaire actuelle",
    validator: (p, ctx) => p.includes(ctx.moonPhase),
    errorMessage: () =>
      "Quelle est la phase de la lune aujourd'hui ? (🌑🌒🌓🌔🌕🌖🌗🌘)",
    hint: "Cherche 'moon phase today' sur Google",
    difficulty: "insane",
  },
  {
    id: 25,
    name: "⚖️ Équilibre parfait",
    description: "Voyelles = Consonnes",
    validator: (p) => {
      const letters = p.toLowerCase().replace(/[^a-z]/g, "");
      const vowels = letters.replace(/[^aeiou]/g, "").length;
      const consonants = letters.length - vowels;
      return vowels > 0 && consonants > 0 && vowels === consonants;
    },
    errorMessage: (p) => {
      const letters = p.toLowerCase().replace(/[^a-z]/g, "");
      const vowels = letters.replace(/[^aeiou]/g, "").length;
      return `Voyelles: ${vowels}, Consonnes: ${letters.length - vowels}. Doivent être égaux !`;
    },
    difficulty: "insane",
  },
  {
    id: 26,
    name: "Emoji spécifique",
    description: "Un emoji précis est requis",
    validator: (p, ctx) => p.includes(ctx.requiredEmoji),
    errorMessage: (_, ctx) => `L'emoji ${ctx.requiredEmoji} est obligatoire`,
    difficulty: "insane",
  },
  {
    id: 27,
    name: "📡 Code Morse",
    description: "Inclus un caractère en code Morse",
    validator: (p, ctx) => p.includes(ctx.morseChar.morse),
    errorMessage: (_, ctx) =>
      `"${ctx.morseChar.letter}" en Morse = "${ctx.morseChar.morse}"`,
    difficulty: "insane",
  },
  {
    id: 28,
    name: "🔢 Binaire",
    description: "Inclus un nombre en binaire",
    validator: (p, ctx) => p.includes(ctx.binaryNumber.binary),
    errorMessage: (_, ctx) =>
      `${ctx.binaryNumber.decimal} en binaire = ${ctx.binaryNumber.binary}`,
    difficulty: "insane",
  },
  {
    id: 29,
    name: "🎮 Pokémon",
    description: "Inclus le nom d'un Pokémon",
    validator: (p, ctx) =>
      p.toLowerCase().includes(ctx.pokemonName.toLowerCase()),
    errorMessage: (_, ctx) => `Attrapez-les tous ! Inclus "${ctx.pokemonName}"`,
    difficulty: "insane",
  },
  {
    id: 30,
    name: "🧪 Formule chimique",
    description: "Inclus une formule chimique",
    validator: (p, ctx) => p.includes(ctx.chemicalFormula.formula),
    errorMessage: (_, ctx) =>
      `${ctx.chemicalFormula.name} = ${ctx.chemicalFormula.formula}`,
    difficulty: "insane",
  },
  {
    id: 31,
    name: "π Chiffres de PI",
    description: "Inclus les premiers chiffres de PI",
    validator: (p, ctx) => p.includes(ctx.piDigits),
    errorMessage: (_, ctx) => `PI = ${ctx.piDigits}...`,
    difficulty: "insane",
  },
  {
    id: 32,
    name: "🐱 Cat Fact",
    description: "Inclus le nombre de caractères de ce fun fact sur les chats",
    validator: (p, ctx) => {
      if (ctx.catFactLoading) return true;
      return p.includes(String(ctx.catFact.length));
    },
    errorMessage: (_, ctx) => {
      if (ctx.catFactLoading) return "⏳ Chargement du cat fact...";
      return `Compte les caractères de: "${ctx.catFact}"`;
    },
    hint: "Compte chaque lettre, espace et ponctuation !",
    requiresApi: true,
    difficulty: "insane",
  },
  {
    id: 33,
    name: "🏳️ Drapeau",
    description: "Inclus le drapeau du pays indiqué",
    validator: (p, ctx) => p.includes(ctx.countryFlag),
    errorMessage: (_, ctx) =>
      `Drapeau de ${ctx.countryName}: ${ctx.countryFlag}`,
    difficulty: "insane",
  },

  // ========== IMPOSSIBLE (34-42) ==========
  {
    id: 34,
    name: "🌐 Dernier octet IP",
    description: "Inclus le dernier octet (segment) de ton adresse IP publique",
    validator: (p, ctx) => {
      if (ctx.ipLoading || ctx.ipLastDigit === null) return true;
      return p.includes(ctx.ipLastDigit);
    },
    errorMessage: (_, ctx) => {
      if (ctx.ipLoading) return "⏳ Détection de ton IP...";
      return "Quel est le dernier nombre de ton IP publique ? (cherche 'what is my ip')";
    },
    hint: "Ex: si ton IP est 192.168.1.42, tu inclus '42'",
    requiresApi: true,
    difficulty: "impossible",
  },
  {
    id: 35,
    name: "📅 Numéro du jour",
    description: "Inclus le numéro du jour dans l'année (1-365)",
    validator: (p, ctx) => p.includes(String(ctx.dailyNumber)),
    errorMessage: () =>
      "Quel jour de l'année sommes-nous ? (1er janvier = 1, 31 décembre = 365)",
    hint: "Cherche 'day of year' sur Google ou calcule !",
    dynamic: true,
    difficulty: "impossible",
  },
  {
    id: 36,
    name: "🔤 Lettre changeante",
    description: "Une lettre qui change toutes les 8 secondes !",
    validator: (p, ctx) => {
      if (!ctx.countdownActive) return true;
      return p.toLowerCase().includes(ctx.countdownLetter.toLowerCase());
    },
    errorMessage: (_, ctx) =>
      `La lettre "${ctx.countdownLetter.toUpperCase()}" doit apparaître (vite !)`,
    dynamic: true,
    difficulty: "impossible",
  },
  {
    id: 37,
    name: "🧮 CAPTCHA mental",
    description: "Réponds au calcul secret",
    validator: (p, ctx) => p.includes(ctx.captchaAnswer),
    errorMessage: () => `La réponse au calcul doit apparaître`,
    difficulty: "impossible",
  },
  {
    id: 38,
    name: "⏱️ Secondes pile",
    description: "Cette règle se valide automatiquement à un moment précis",
    validator: (_, ctx) => {
      const seconds = ctx.currentTime.getSeconds();
      return seconds >= ctx.secondsTarget && seconds <= ctx.secondsTarget + 10;
    },
    errorMessage: (_, ctx) =>
      `Attends que les secondes soient entre ${ctx.secondsTarget} et ${ctx.secondsTarget + 10}...`,
    hint: "Regarde l'horloge et attends le bon moment !",
    dynamic: true,
    difficulty: "impossible",
  },
  {
    id: 39,
    name: "😂 Punchline",
    description: "Inclus un mot (4+ lettres) de la punchline de la blague",
    validator: (p, ctx) => {
      if (ctx.jokeLoading) return true;
      const words = ctx.jokePunchline.toLowerCase().split(/\s+/);
      return words.some((w) => w.length > 3 && p.toLowerCase().includes(w));
    },
    errorMessage: (_, ctx) => {
      if (ctx.jokeLoading) return "⏳ Chargement de la blague...";
      return `Blague: "${ctx.jokeSetup}" - Devine la punchline et inclus un mot de 4+ lettres !`;
    },
    hint: "Les blagues sont en anglais, cherche la réponse logique !",
    requiresApi: true,
    difficulty: "impossible",
  },
  {
    id: 40,
    name: "📐 Expression math",
    description: "Inclus le résultat de l'expression",
    validator: (p, ctx) => p.includes(String(ctx.mathExpression.result)),
    errorMessage: (_, ctx) =>
      `${ctx.mathExpression.expression} = ? Inclus le résultat`,
    difficulty: "impossible",
  },
  {
    id: 41,
    name: "🎬 Code YouTube",
    description: "Inclus ce code vidéo YouTube",
    validator: (p, ctx) => p.includes(ctx.youtubeCode),
    errorMessage: (_, ctx) => `Code YouTube: "${ctx.youtubeCode}"`,
    difficulty: "impossible",
  },
  {
    id: 42,
    name: "🔬 Numéro atomique",
    description: "Inclus le numéro atomique de l'élément",
    validator: (p, ctx) => p.includes(String(ctx.atomicNumber)),
    errorMessage: (_, ctx) =>
      `N° atomique de ${ctx.periodicElement.name} = ${ctx.atomicNumber}`,
    difficulty: "impossible",
  },

  // ========== NIGHTMARE (43-50) ==========
  {
    id: 43,
    name: "⚖️ Triple équilibre",
    description: "Majuscules = Minuscules = Chiffres",
    validator: (p) => {
      const upper = (p.match(/[A-Z]/g) || []).length;
      const lower = (p.match(/[a-z]/g) || []).length;
      const digits = (p.match(/\d/g) || []).length;
      return upper > 0 && upper === lower && lower === digits;
    },
    errorMessage: (p) => {
      const upper = (p.match(/[A-Z]/g) || []).length;
      const lower = (p.match(/[a-z]/g) || []).length;
      const digits = (p.match(/\d/g) || []).length;
      return `MAJ: ${upper}, min: ${lower}, chiffres: ${digits}. Tous égaux !`;
    },
    difficulty: "nightmare",
  },
  {
    id: 44,
    name: "🚫 Max 2 répétitions",
    description: "Aucun caractère ne peut apparaître plus de 2 fois",
    validator: (p) => {
      const counts: Record<string, number> = {};
      for (const char of p.toLowerCase()) {
        counts[char] = (counts[char] || 0) + 1;
        if (counts[char] > 2) return false;
      }
      return true;
    },
    errorMessage: () => "Un caractère apparaît plus de 2 fois !",
    difficulty: "nightmare",
  },
  {
    id: 45,
    name: "🌍 Latitude",
    description: "Inclus une coordonnée de latitude",
    validator: (p, ctx) => p.includes(String(ctx.latitude)),
    errorMessage: (_, ctx) => `Latitude ${ctx.latitude}° requise`,
    difficulty: "nightmare",
  },
  {
    id: 46,
    name: "✖️ Produit > 100",
    description: "Le produit des chiffres doit être > 100",
    validator: (p) => {
      const digits = p.match(/[1-9]/g);
      if (!digits || digits.length === 0) return false;
      return digits.reduce((acc, d) => acc * parseInt(d), 1) > 100;
    },
    errorMessage: (p) => {
      const digits = p.match(/[1-9]/g);
      const product = digits
        ? digits.reduce((acc, d) => acc * parseInt(d), 1)
        : 0;
      return `Produit des chiffres: ${product}. Doit être > 100`;
    },
    difficulty: "nightmare",
  },
  {
    id: 47,
    name: "📈 Séquence croissante",
    description: "Contient 3 chiffres consécutifs croissants (123, 456...)",
    validator: (p) => {
      for (let i = 0; i <= 7; i++) {
        if (p.includes(`${i}${i + 1}${i + 2}`)) return true;
      }
      return false;
    },
    errorMessage: () => "Séquence croissante requise (ex: 123, 789)",
    difficulty: "nightmare",
  },
  {
    id: 48,
    name: "🎨 ASCII Art",
    description: "Inclus ce petit dessin ASCII",
    validator: (p, ctx) => p.includes(ctx.asciiArt),
    errorMessage: (_, ctx) => `ASCII requis: ${ctx.asciiArt}`,
    difficulty: "nightmare",
  },
  {
    id: 49,
    name: "📏 Max 100 caractères",
    description: "Le mot de passe ne doit pas dépasser 100 caractères",
    validator: (p) => p.length <= 100,
    errorMessage: (p) =>
      `${p.length}/100 chars. Retire ${p.length - 100} caractère(s)`,
    difficulty: "nightmare",
  },
  {
    id: 50,
    name: "🎯 Finir par !",
    description: "Le mot de passe doit se terminer par '!'",
    validator: (p) => p.endsWith("!"),
    errorMessage: () => "Termine par '!'",
    difficulty: "nightmare",
  },
];

// ============== COMPOSABLE ==============
export function usePasswordGame() {
  const password = ref("");
  const allRules = createRules();
  const unlockedRulesCount = ref(5); // Commence avec 5 règles visibles !
  const gameStarted = ref(false);
  const gameCompleted = ref(false);
  const startTime = ref<Date | null>(null);
  const elapsedTime = ref(0);
  const attempts = ref(0);

  // Contexte initial
  const flagData = getRandomElement(COUNTRY_FLAGS);
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const context = reactive<RuleContext>({
    currentTime: new Date(),
    requiredWord: getRandomElement(RANDOM_WORDS),
    requiredColor: getRandomElement(COLORS),
    forbiddenLetters: shuffleArray([...FORBIDDEN_CANDIDATES]).slice(0, 2),
    forbiddenWord: getRandomElement([
      "password",
      "motdepasse",
      "azerty",
      "qwerty",
    ]),
    requiredEmoji: getRandomElement(EMOJIS),
    romanNumeral: toRoman(Math.floor(Math.random() * 20) + 1),
    requiredNumber: 15 + Math.floor(Math.random() * 15),
    primeNumber: getRandomElement(PRIME_NUMBERS),
    fibonacci: getRandomElement(FIBONACCI.slice(5)),
    piDigits: getPI(4),
    countdownLetter: "A",
    countdownActive: false,
    moonPhase: getMoonPhase(),
    captchaAnswer: "",

    // API data
    weatherCity: getRandomElement(CITIES),
    weatherTemp: null,
    weatherLoading: true,
    bitcoinPrice: null,
    bitcoinLoading: true,
    randomQuote: "",
    randomQuoteAuthor: "",
    quoteLoading: true,
    catFact: "",
    catFactLoading: true,
    jokeSetup: "",
    jokePunchline: "",
    jokeLoading: true,
    ipLastDigit: null,
    ipLoading: true,

    countryFlag: flagData.flag,
    countryName: flagData.name,
    dailyNumber: dayOfYear,
    currentYear: today.getFullYear(),

    countryCapital: getRandomElement(CAPITALS),
    periodicElement: getRandomElement(ELEMENTS),
    randomYear: 1980 + Math.floor(Math.random() * 40),
    sponsorBrand: getRandomElement(SPONSOR_BRANDS),
    requiredAnimal: getRandomElement(ANIMALS),
    chessMove: getRandomElement(CHESS_MOVES),
    hexColor: generateHexColor(),
    morseChar: getRandomElement(MORSE_CODES),
    binaryNumber: generateBinaryNumber(),
    secondsTarget: Math.floor(Math.random() * 50) + 5,
    mathExpression: generateMathExpression(),
    youtubeCode: generateYoutubeCode(),
    leapYear: getRandomElement([2000, 2004, 2008, 2012, 2016, 2020, 2024]),
    pokemonName: getRandomElement(POKEMON_NAMES),
    chemicalFormula: getRandomElement(CHEMICAL_FORMULAS),
    wordle: getRandomElement(WORDLE_WORDS),
    asciiArt: generateASCII(),
    latitude: Math.floor(Math.random() * 90) - 45,
    atomicNumber: getRandomElement(ELEMENTS).number,
  });

  // CAPTCHA
  const captchaA = Math.floor(Math.random() * 20) + 10;
  const captchaB = Math.floor(Math.random() * 10) + 5;
  const captchaOp = Math.random() > 0.5 ? "+" : "×";
  context.captchaAnswer = String(
    captchaOp === "+" ? captchaA + captchaB : captchaA * captchaB,
  );
  const captchaQuestion = computed(
    () => `${captchaA} ${captchaOp} ${captchaB} = ?`,
  );

  // Charger toutes les APIs
  const loadAllAPIs = async () => {
    // Météo
    context.weatherLoading = true;
    fetchWeather(context.weatherCity).then((temp) => {
      context.weatherTemp = temp;
      context.weatherLoading = false;
    });

    // Bitcoin
    context.bitcoinLoading = true;
    fetchBitcoinPrice().then((price) => {
      context.bitcoinPrice = price;
      context.bitcoinLoading = false;
    });

    // Citation
    context.quoteLoading = true;
    fetchRandomQuote().then((data) => {
      context.randomQuote = data.quote;
      context.randomQuoteAuthor = data.author;
      context.quoteLoading = false;
    });

    // Cat fact
    context.catFactLoading = true;
    fetchCatFact().then((fact) => {
      context.catFact = fact;
      context.catFactLoading = false;
    });

    // Joke
    context.jokeLoading = true;
    fetchJoke().then((joke) => {
      context.jokeSetup = joke.setup;
      context.jokePunchline = joke.punchline;
      context.jokeLoading = false;
    });

    // IP
    context.ipLoading = true;
    fetchPublicIP().then((ip) => {
      context.ipLastDigit = ip;
      context.ipLoading = false;
    });
  };

  // Intervalles
  let timeInterval: ReturnType<typeof setInterval> | null = null;
  let letterInterval: ReturnType<typeof setInterval> | null = null;
  let gameTimeInterval: ReturnType<typeof setInterval> | null = null;

  // Computed
  const unlockedRules = computed(() =>
    allRules.slice(0, unlockedRulesCount.value),
  );

  const ruleValidations = computed(() => {
    return unlockedRules.value.map((rule) => ({
      rule,
      isValid: rule.validator(password.value, context),
      errorMessage: rule.errorMessage(password.value, context),
    }));
  });

  const passedRules = computed(() =>
    ruleValidations.value.filter((r) => r.isValid),
  );
  const failedRules = computed(() =>
    ruleValidations.value.filter((r) => !r.isValid),
  );
  const allRulesPassed = computed(
    () => unlockedRules.value.length > 0 && failedRules.value.length === 0,
  );

  const progress = computed(() => ({
    current: passedRules.value.length,
    total: unlockedRules.value.length,
    percentage:
      unlockedRules.value.length > 0
        ? Math.round(
            (passedRules.value.length / unlockedRules.value.length) * 100,
          )
        : 0,
  }));

  const formattedTime = computed(() => {
    const minutes = Math.floor(elapsedTime.value / 60);
    const seconds = elapsedTime.value % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  });

  // Actions
  const startGame = async () => {
    gameStarted.value = true;
    startTime.value = new Date();
    elapsedTime.value = 0;

    await loadAllAPIs();

    timeInterval = setInterval(() => {
      context.currentTime = new Date();
    }, 1000);

    gameTimeInterval = setInterval(() => {
      if (startTime.value) {
        elapsedTime.value = Math.floor(
          (Date.now() - startTime.value.getTime()) / 1000,
        );
      }
    }, 1000);
  };

  const startCountdownLetter = () => {
    context.countdownActive = true;
    context.countdownLetter = String.fromCharCode(
      65 + Math.floor(Math.random() * 26),
    );
    letterInterval = setInterval(() => {
      context.countdownLetter = String.fromCharCode(
        65 + Math.floor(Math.random() * 26),
      );
    }, 8000);
  };

  const completeGame = () => {
    gameCompleted.value = true;
    cleanup();
  };

  const cleanup = () => {
    if (timeInterval) {
      clearInterval(timeInterval);
      timeInterval = null;
    }
    if (letterInterval) {
      clearInterval(letterInterval);
      letterInterval = null;
    }
    if (gameTimeInterval) {
      clearInterval(gameTimeInterval);
      gameTimeInterval = null;
    }
  };

  const resetGame = async () => {
    password.value = "";
    unlockedRulesCount.value = 5;
    gameStarted.value = false;
    gameCompleted.value = false;
    startTime.value = null;
    elapsedTime.value = 0;
    attempts.value = 0;
    context.countdownActive = false;
    cleanup();
  };

  // Watch pour débloquer les règles
  watch(password, () => {
    if (gameStarted.value && !gameCompleted.value) {
      setTimeout(() => {
        if (
          allRulesPassed.value &&
          unlockedRulesCount.value < allRules.length
        ) {
          // Débloque 2 règles à la fois pour accélérer
          unlockedRulesCount.value = Math.min(
            unlockedRulesCount.value + 2,
            allRules.length,
          );

          if (unlockedRulesCount.value >= 36 && !context.countdownActive) {
            startCountdownLetter();
          }
        }
        if (
          allRulesPassed.value &&
          unlockedRulesCount.value === allRules.length
        ) {
          completeGame();
        }
      }, 300);
    }
  });

  onUnmounted(() => cleanup());

  return {
    password,
    gameStarted,
    gameCompleted,
    elapsedTime,
    formattedTime,
    attempts,
    unlockedRules,
    ruleValidations,
    passedRules,
    failedRules,
    allRulesPassed,
    progress,
    totalRulesCount: allRules.length,
    context,
    captchaQuestion,
    startGame,
    resetGame,
    checkAndUnlockRules: () => {
      attempts.value++;
    },
  };
}

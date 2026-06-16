import logger from "../utils/logger.js";

interface ClassificationResult {
  category: string;
  confidence: number;
}

const CATEGORY_KEYWORDS: { [key: string]: string[] } = {
  BANK_FRAUD: [
    "bank", "otp", "aba", "acleda", "credit card", "transfer", "verification code",
    "account suspended", "atm", "withdraw", "card number", "pin", "wing"
  ],
  FAKE_DELIVERY: [
    "delivery", "package", "dhl", "fedex", "post office", "shipping", "courier",
    "parcel", "unclaimed", "customs tax", "tracking"
  ],
  INVESTMENT: [
    "invest", "crypto", "bitcoin", "profit", "trading", "stocks", "high return",
    "forex", "passive income", "deposit money", "shares", "dividend", "yield"
  ],
  LOTTERY: [
    "lottery", "won", "prize", "cash reward", "lucky draw", "claim prize",
    "free money", "winner", "jackpot"
  ],
  GOVERNMENT: [
    "police", "court", "arrest", "tax", "customs officer", "ministry", "official",
    "warrant", "illegal", "judge", "crime investigation"
  ],
  ROMANCE: [
    "romance", "love", "sweetheart", "marriage", "girlfriend", "boyfriend",
    "sugar daddy", "meet", "gift transfer", "relationship"
  ],
  TECH_SUPPORT: [
    "microsoft", "virus", "hacked", "computer support", "technical support",
    "anydesk", "teamviewer", "windows block", "malware"
  ]
};

export function classifyScamText(description: string | null): ClassificationResult {
  if (!description || description.trim() === "") {
    return { category: "OTHER", confidence: 0.1 };
  }

  const text = description.toLowerCase();
  const categoryScores: { [key: string]: number } = {};

  // Initialize scores
  for (const category of Object.keys(CATEGORY_KEYWORDS)) {
    categoryScores[category] = 0;
  }

  // Count keyword occurrences
  let totalMatches = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        categoryScores[category] += matches.length;
        totalMatches += matches.length;
      }
    }
  }

  if (totalMatches === 0) {
    return { category: "OTHER", confidence: 0.3 };
  }

  // Find category with highest score
  let bestCategory = "OTHER";
  let maxScore = 0;

  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  // Calculate confidence level
  const confidence = Number((maxScore / totalMatches).toFixed(2));
  
  logger.info(`AI text classification result: ${bestCategory} (confidence: ${confidence * 100}%)`);
  return { category: bestCategory, confidence };
}

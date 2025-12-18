import { Service } from "./types";

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://hhqzjgmghwkcetzcvtth.supabase.co";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocXpqZ21naHdrY2V0emN2dHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTc3MjMsImV4cCI6MjA4MTQ3MzcyM30.FjjT1SBR6WJtYC742KXMjazgQnhkqljHLMQJsQJDC00";

export const BUSINESS_INFO = {
  name: "Glow Studio",
  phone: "972502233373", // פורמט בינלאומי ל-WhatsApp
  displayPhone: "050-2233373",
  address: "דיזינגוף 100, תל אביב",
  mapUrl: "https://maps.app.goo.gl/example"
};

export const BUSINESS_HOURS = {
  start: 9, // 09:00
  end: 18,  // 18:00
};

export const WORKING_DAYS = [0, 1, 2, 3, 4]; // Sunday (0) to Thursday (4)

export const SERVICES: Service[] = [
  {
    id: "brows-shape",
    name: "עיצוב גבות",
    price: 100,
    duration: 60,
    description: "עיצוב והתאמת צורה למבנה הפנים (60 דקות).",
    category: "brows"
  },
  {
    id: "lashes-design",
    name: "עיצוב ריסים",
    price: 180,
    duration: 45,
    description: "טיפול לעיצוב ריסים (45 דקות).",
    category: "lashes"
  },
  {
    id: "brows-lamination",
    name: "הרמת גבות",
    price: 220,
    duration: 45,
    description: "טיפול המעניק לגבות מראה מלא ומורם.",
    category: "brows"
  },
  {
    id: "lash-lift",
    name: "הרמת ריסים",
    price: 250,
    duration: 60,
    description: "הרמה וסלסול הריסים הטבעיים.",
    category: "lashes"
  },
  {
    id: "combo-glow",
    name: "חבילת גלואו (משולב)",
    price: 350,
    duration: 90,
    description: "הרמת ריסים ועיצוב גבות במחיר משתלם.",
    category: "combo"
  }
];
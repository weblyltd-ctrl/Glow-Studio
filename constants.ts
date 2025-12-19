
import { Service } from "./types";

// המשתנים יימשכו מ-Vercel. אם את מריצה מקומית, ודאי שיש לך קובץ .env
export const SUPABASE_URL = process.env.SUPABASE_URL || "https://gkdhgxpjkhucdanougua.supabase.co";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || ""; 

export const BUSINESS_INFO = {
  name: "LS Eyebrow Artist",
  phone: "972502233373",
  displayPhone: "050-2233373",
  address: "קרית עקרון",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=קרית+עקרון"
};

export const BUSINESS_HOURS = {
  start: 9,
  end: 18,
};

export const WORKING_DAYS = [0, 1, 2, 3, 4];

export const SERVICES: Service[] = [
  {
    id: "brows-shape",
    name: "עיצוב גבות",
    price: 100,
    duration: 60,
    description: "פיסול והתאמת צורת הגבה באופן מושלם למבנה הפנים הייחודי שלך.",
    category: "brows"
  },
  {
    id: "lashes-design",
    name: "עיצוב ריסים",
    price: 180,
    duration: 45,
    description: "הדגשת העיניים והענקת מראה עוצמתי וטבעי לריסים ללא צורך במסקרה.",
    category: "lashes"
  },
  {
    id: "brows-lamination",
    name: "הרמת גבות",
    price: 220,
    duration: 45,
    description: "טיפול לקיבוע והרמת שיערת הגבה למראה מלא, מסודר ומורם לאורך זמן.",
    category: "brows"
  },
  {
    id: "lash-lift",
    name: "הרמת ריסים",
    price: 250,
    duration: 60,
    description: "הענקת קימור טבעי, אורך וצבע עמוק לריסים הטבעיים שלך לפתיחת המבט.",
    category: "lashes"
  },
  {
    id: "combo-glow",
    name: "חבילת LS Signature",
    price: 350,
    duration: 90,
    description: "השילוב המנצח למראה עיניים מושלם – הרמת ריסים ועיצוב גבות בטיפול אחד.",
    category: "combo"
  }
];

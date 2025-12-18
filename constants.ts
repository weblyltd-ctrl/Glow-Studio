
import { Service } from "./types";

export const SUPABASE_URL = process.env.SUPABASE_URL || "https://gkdhgxpjkhucdanougua.supabase.co";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || "sb_publishable_aPKU7C8-IsokIsuH0szcUQ_ZM6i5vuR";

export const BUSINESS_INFO = {
  name: "LS Eyebrow Artist",
  phone: "972502233373",
  displayPhone: "050-2233373",
  address: "דיזינגוף 100, תל אביב",
  mapUrl: "https://maps.app.goo.gl/example"
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
    description: "עיצוב והתאמת צורה למבנה הפנים.",
    category: "brows"
  },
  {
    id: "lashes-design",
    name: "עיצוב ריסים",
    price: 180,
    duration: 45,
    description: "טיפול לעיצוב ריסים מקצועי.",
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
    name: "חבילת LS Signature",
    price: 350,
    duration: 90,
    description: "הרמת ריסים ועיצוב גבות משולב.",
    category: "combo"
  }
];

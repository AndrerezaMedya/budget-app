export type PredefinedCategoryType = "income" | "expense";

export type IconReference = `${"lucide" | "heroicons-outline" | "heroicons-solid" | "phosphor"}:${string}`;

export interface PredefinedSubcategory {
  slug: string;
  name: string;
  nameKey: string;
  icon: IconReference;
}

export interface PredefinedCategory {
  slug: string;
  type: PredefinedCategoryType;
  name: string;
  nameKey: string;
  color: string;
  icon: IconReference;
  order: number;
  subcategories?: PredefinedSubcategory[];
}

export const PREDEFINED_CATEGORIES: PredefinedCategory[] = [
  {
    slug: "food-drinks",
    type: "expense",
    name: "Food & Drinks",
    nameKey: "categories.predefined.expense.foodDrinks",
    color: "#f97316",
    icon: "lucide:utensils-crossed",
    order: 10,
    subcategories: [
      {
        slug: "general",
        name: "General (Food & Drinks)",
        nameKey: "categories.predefined.expense.foodDrinks.general",
        icon: "lucide:fork-knife",
      },
      {
        slug: "groceries",
        name: "Groceries",
        nameKey: "categories.predefined.expense.foodDrinks.groceries",
        icon: "lucide:shopping-basket",
      },
      {
        slug: "fast-food",
        name: "Fast-food, restaurant",
        nameKey: "categories.predefined.expense.foodDrinks.fastFood",
        icon: "lucide:sandwich",
      },
      {
        slug: "cafe",
        name: "Cafe",
        nameKey: "categories.predefined.expense.foodDrinks.cafe",
        icon: "lucide:coffee",
      },
    ],
  },
  {
    slug: "shopping",
    type: "expense",
    name: "Shopping",
    nameKey: "categories.predefined.expense.shopping",
    color: "#ec4899",
    icon: "lucide:shopping-bag",
    order: 20,
    subcategories: [
      {
        slug: "general",
        name: "Shopping",
        nameKey: "categories.predefined.expense.shopping.general",
        icon: "lucide:shopping-cart",
      },
      {
        slug: "clothes",
        name: "Clothes & shoes",
        nameKey: "categories.predefined.expense.shopping.clothes",
        icon: "lucide:shirt",
      },
      {
        slug: "accessories",
        name: "Accessories",
        nameKey: "categories.predefined.expense.shopping.accessories",
        icon: "lucide:gem",
      },
      {
        slug: "electronics",
        name: "Electronics",
        nameKey: "categories.predefined.expense.shopping.electronics",
        icon: "lucide:monitor",
      },
      {
        slug: "gifts",
        name: "Gifts",
        nameKey: "categories.predefined.expense.shopping.gifts",
        icon: "lucide:gift",
      },
      {
        slug: "health-beauty",
        name: "Health and beauty",
        nameKey: "categories.predefined.expense.shopping.healthBeauty",
        icon: "lucide:sparkles",
      },
      {
        slug: "tools-stationery",
        name: "Tools, stationery",
        nameKey: "categories.predefined.expense.shopping.toolsStationery",
        icon: "lucide:pen-tool",
      },
      {
        slug: "drug-store",
        name: "Drug-store",
        nameKey: "categories.predefined.expense.shopping.drugStore",
        icon: "lucide:pill",
      },
    ],
  },
  {
    slug: "housing",
    type: "expense",
    name: "Housing",
    nameKey: "categories.predefined.expense.housing",
    color: "#3b82f6",
    icon: "lucide:home",
    order: 30,
    subcategories: [
      {
        slug: "general",
        name: "Housing",
        nameKey: "categories.predefined.expense.housing.general",
        icon: "lucide:house",
      },
      {
        slug: "utilities",
        name: "Energy, utilities",
        nameKey: "categories.predefined.expense.housing.utilities",
        icon: "lucide:lightbulb",
      },
      {
        slug: "services",
        name: "Services",
        nameKey: "categories.predefined.expense.housing.services",
        icon: "lucide:clipboard-list",
      },
      {
        slug: "rent",
        name: "Rent",
        nameKey: "categories.predefined.expense.housing.rent",
        icon: "lucide:key-round",
      },
      {
        slug: "maintenance",
        name: "Maintenance, repairs",
        nameKey: "categories.predefined.expense.housing.maintenance",
        icon: "lucide:wrench",
      },
    ],
  },
  {
    slug: "transportation",
    type: "expense",
    name: "Transportation",
    nameKey: "categories.predefined.expense.transportation",
    color: "#22c55e",
    icon: "lucide:car-front",
    order: 40,
    subcategories: [
      {
        slug: "general",
        name: "Transportation",
        nameKey: "categories.predefined.expense.transportation.general",
        icon: "lucide:car",
      },
      {
        slug: "public",
        name: "Public transport",
        nameKey: "categories.predefined.expense.transportation.public",
        icon: "lucide:bus-front",
      },
      {
        slug: "long-distance",
        name: "Long distance",
        nameKey: "categories.predefined.expense.transportation.longDistance",
        icon: "lucide:plane",
      },
      {
        slug: "fuel",
        name: "Fuel",
        nameKey: "categories.predefined.expense.transportation.fuel",
        icon: "lucide:fuel",
      },
      {
        slug: "parking",
        name: "Parking",
        nameKey: "categories.predefined.expense.transportation.parking",
        icon: "lucide:parking-square",
      },
      {
        slug: "maintenance",
        name: "Vehicle maintenance",
        nameKey: "categories.predefined.expense.transportation.maintenance",
        icon: "lucide:hammer",
      },
      {
        slug: "rentals",
        name: "Rentals",
        nameKey: "categories.predefined.expense.transportation.rentals",
        icon: "lucide:key",
      },
    ],
  },
  {
    slug: "life-entertainment",
    type: "expense",
    name: "Life & Entertainment",
    nameKey: "categories.predefined.expense.lifeEntertainment",
    color: "#8b5cf6",
    icon: "lucide:party-popper",
    order: 50,
    subcategories: [
      {
        slug: "general",
        name: "Life & Entertainment",
        nameKey: "categories.predefined.expense.lifeEntertainment.general",
        icon: "lucide:sparkles",
      },
      {
        slug: "sport",
        name: "Sport, fitness",
        nameKey: "categories.predefined.expense.lifeEntertainment.sport",
        icon: "lucide:dumbbell",
      },
      {
        slug: "books",
        name: "Books",
        nameKey: "categories.predefined.expense.lifeEntertainment.books",
        icon: "lucide:book-open",
      },
      {
        slug: "subscriptions",
        name: "Subscriptions",
        nameKey: "categories.predefined.expense.lifeEntertainment.subscriptions",
        icon: "lucide:ticket",
      },
      {
        slug: "education",
        name: "Education",
        nameKey: "categories.predefined.expense.lifeEntertainment.education",
        icon: "lucide:graduation-cap",
      },
      {
        slug: "health-care",
        name: "Health care",
        nameKey: "categories.predefined.expense.lifeEntertainment.healthCare",
        icon: "lucide:stethoscope",
      },
      {
        slug: "hobbies",
        name: "Hobbies",
        nameKey: "categories.predefined.expense.lifeEntertainment.hobbies",
        icon: "lucide:joystick",
      },
      {
        slug: "trips",
        name: "Trips, hotels",
        nameKey: "categories.predefined.expense.lifeEntertainment.trips",
        icon: "lucide:hotel",
      },
      {
        slug: "life-events",
        name: "Life events",
        nameKey: "categories.predefined.expense.lifeEntertainment.lifeEvents",
        icon: "lucide:calendar-heart",
      },
      {
        slug: "wellness",
        name: "Wellness",
        nameKey: "categories.predefined.expense.lifeEntertainment.wellness",
        icon: "lucide:heart",
      },
    ],
  },
  {
    slug: "communication",
    type: "expense",
    name: "Communication",
    nameKey: "categories.predefined.expense.communication",
    color: "#0ea5e9",
    icon: "lucide:messages-square",
    order: 60,
    subcategories: [
      {
        slug: "general",
        name: "Communication",
        nameKey: "categories.predefined.expense.communication.general",
        icon: "lucide:message-circle",
      },
      {
        slug: "internet",
        name: "Internet",
        nameKey: "categories.predefined.expense.communication.internet",
        icon: "lucide:wifi",
      },
      {
        slug: "software",
        name: "Software, apps",
        nameKey: "categories.predefined.expense.communication.software",
        icon: "lucide:app-window",
      },
      {
        slug: "phone",
        name: "Phone",
        nameKey: "categories.predefined.expense.communication.phone",
        icon: "lucide:phone",
      },
    ],
  },
  {
    slug: "financial-expenses",
    type: "expense",
    name: "Financial expenses",
    nameKey: "categories.predefined.expense.financial",
    color: "#ef4444",
    icon: "lucide:receipt-text",
    order: 70,
    subcategories: [
      {
        slug: "general",
        name: "Financial expenses",
        nameKey: "categories.predefined.expense.financial.general",
        icon: "lucide:receipt",
      },
      {
        slug: "charges",
        name: "Charges, fees",
        nameKey: "categories.predefined.expense.financial.charges",
        icon: "lucide:badge-percent",
      },
      {
        slug: "taxes",
        name: "Taxes",
        nameKey: "categories.predefined.expense.financial.taxes",
        icon: "lucide:badge-dollar-sign",
      },
      {
        slug: "fines",
        name: "Fines",
        nameKey: "categories.predefined.expense.financial.fines",
        icon: "lucide:gavel",
      },
      {
        slug: "insurances",
        name: "Insurances",
        nameKey: "categories.predefined.expense.financial.insurances",
        icon: "lucide:shield-check",
      },
    ],
  },
  {
    slug: "investments",
    type: "expense",
    name: "Investments",
    nameKey: "categories.predefined.expense.investments",
    color: "#14b8a6",
    icon: "lucide:line-chart",
    order: 80,
    subcategories: [
      {
        slug: "general",
        name: "Investments",
        nameKey: "categories.predefined.expense.investments.general",
        icon: "lucide:bar-chart",
      },
      {
        slug: "financial-investments",
        name: "Financial investments",
        nameKey: "categories.predefined.expense.investments.financial",
        icon: "lucide:candlestick-chart",
      },
      {
        slug: "charity",
        name: "Charity, infaq, zakat",
        nameKey: "categories.predefined.expense.investments.charity",
        icon: "lucide:hand-heart",
      },
      {
        slug: "savings",
        name: "Savings",
        nameKey: "categories.predefined.expense.investments.savings",
        icon: "lucide:piggy-bank",
      },
    ],
  },
  {
    slug: "others",
    type: "expense",
    name: "Others",
    nameKey: "categories.predefined.expense.others",
    color: "#9ca3af",
    icon: "lucide:shapes",
    order: 90,
  },
  {
    slug: "scholarship",
    type: "income",
    name: "Scholarship",
    nameKey: "categories.predefined.income.scholarship",
    color: "#6366f1",
    icon: "lucide:graduation-cap",
    order: 100,
  },
  {
    slug: "salary",
    type: "income",
    name: "Salary",
    nameKey: "categories.predefined.income.salary",
    color: "#22c55e",
    icon: "lucide:wallet",
    order: 110,
  },
  {
    slug: "coupons",
    type: "income",
    name: "Coupons",
    nameKey: "categories.predefined.income.coupons",
    color: "#ec4899",
    icon: "lucide:ticket",
    order: 120,
  },
  {
    slug: "refunds",
    type: "income",
    name: "Refunds",
    nameKey: "categories.predefined.income.refunds",
    color: "#f97316",
    icon: "lucide:rotate-ccw",
    order: 130,
  },
  {
    slug: "sale",
    type: "income",
    name: "Sale",
    nameKey: "categories.predefined.income.sale",
    color: "#0ea5e9",
    icon: "lucide:badge-dollar-sign",
    order: 140,
  },
  {
    slug: "wage-invoices",
    type: "income",
    name: "Wage, invoices",
    nameKey: "categories.predefined.income.wageInvoices",
    color: "#14b8a6",
    icon: "lucide:file-text",
    order: 150,
  },
  {
    slug: "gifts",
    type: "income",
    name: "Gifts",
    nameKey: "categories.predefined.income.gifts",
    color: "#a855f7",
    icon: "lucide:gift",
    order: 160,
  },
  {
    slug: "income-others",
    type: "income",
    name: "Others",
    nameKey: "categories.predefined.income.others",
    color: "#9ca3af",
    icon: "lucide:square",
    order: 170,
  },
];

const CATEGORY_MAP = new Map<string, PredefinedCategory>();
const CATEGORY_NAME_MAP = new Map<string, PredefinedCategory>();
const SUBCATEGORY_LOOKUP = new Map<string, { category: PredefinedCategory; subcategory: PredefinedSubcategory }>();

for (const category of PREDEFINED_CATEGORIES) {
  CATEGORY_MAP.set(category.slug, category);
  CATEGORY_NAME_MAP.set(category.name.toLowerCase(), category);
  if (category.subcategories) {
    for (const subcategory of category.subcategories) {
      SUBCATEGORY_LOOKUP.set(`${category.slug}/${subcategory.slug}`, {
        category,
        subcategory,
      });
      CATEGORY_NAME_MAP.set(subcategory.name.toLowerCase(), category);
    }
  }
}

export function getCategoryBySlug(slug: string): PredefinedCategory | undefined {
  return CATEGORY_MAP.get(slug);
}

export function getCategoryByName(name: string): PredefinedCategory | undefined {
  return CATEGORY_NAME_MAP.get(name.toLowerCase());
}

export function getSubcategory(
  categorySlug: string,
  subcategorySlug: string,
): PredefinedSubcategory | undefined {
  const reference = SUBCATEGORY_LOOKUP.get(`${categorySlug}/${subcategorySlug}`);
  return reference?.subcategory;
}

export function getSubcategoryByName(
  name: string,
): { category: PredefinedCategory; subcategory: PredefinedSubcategory } | undefined {
  for (const category of PREDEFINED_CATEGORIES) {
    const match = category.subcategories?.find(
      (subcategory) => subcategory.name.toLowerCase() === name.toLowerCase(),
    );
    if (match) {
      return { category, subcategory: match };
    }
  }
  return undefined;
}

export function listPredefinedCategoriesByType(type: PredefinedCategoryType): PredefinedCategory[] {
  return PREDEFINED_CATEGORIES.filter((category) => category.type === type);
}

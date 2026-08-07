/** DineOS — Technonaire dine-in OS for restaurants & cafes. */

export const DINEOS_TEMPLATE_IDS = ["restaurant", "bakery"];

export function templateIncludesDineOs(templateId) {
  return DINEOS_TEMPLATE_IDS.includes(String(templateId || "").toLowerCase());
}

export function getDineOsUrl() {
  return (
    process.env.NEXT_PUBLIC_DINEOS_URL ||
    "https://dineos.technonaire.com"
  );
}

export const DINEOS_DEFAULTS = {
  title: "Order & pay with DineOS",
  body: "Guests scan a table QR to order, call a waiter, and pay — kitchen and staff stay in sync on one system. A Technonaire product for restaurants and cafes.",
  cta: "Explore DineOS",
  eyebrow: "Powered by DineOS",
  points: [
    {
      title: "QR order at the table",
      description: "Menu on the guest’s phone — fewer wait times, clearer tickets.",
    },
    {
      title: "Kitchen & waiters in sync",
      description: "Live tickets and Call Waiter so the floor never misses a beat.",
    },
    {
      title: "Pay at the table",
      description: "Settle the bill from the phone. Faster turns, happier guests.",
    },
  ],
};

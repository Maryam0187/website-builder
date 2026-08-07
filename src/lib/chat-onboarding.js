/** Interactive assistant steps — guest taps options (not free-text only). */

export const BOT_STEPS = {
  NONE: "none",
  BUSINESS_TYPE: "business_type",
  LAYOUT: "layout",
  LAYOUT_HELP: "layout_help",
  PHONE: "phone",
  STYLE: "style",
  DONE: "done",
};

export function getOnboardingPrompt(step) {
  switch (step) {
    case BOT_STEPS.BUSINESS_TYPE:
      return {
        step,
        title: "What type of business is this?",
        hint: "Pick the closest match — you can change details later.",
        input: "choices",
        options: [
          { value: "bakery", label: "Bakery / cafe" },
          { value: "clinic", label: "Clinic / salon" },
          { value: "restaurant", label: "Restaurant" },
          { value: "shop", label: "Shop / store" },
          { value: "services", label: "Professional services" },
          { value: "other", label: "Other" },
        ],
      };
    case BOT_STEPS.LAYOUT:
      return {
        step,
        title: "How should your website be organized?",
        hint: "We recommend one page (default). You can ask us to switch later.",
        input: "choices",
        options: [
          {
            value: "one-page",
            label: "One page (recommended)",
            description: "Full-screen photo sections that scroll together. Simple and stylish.",
          },
          {
            value: "multi-page",
            label: "Multiple pages",
            description: "Separate Home, About, and Contact pages. Menu opens each page.",
          },
          {
            value: "explain",
            label: "I’m not sure — explain the difference",
            description: "Short plain-language explanation, then you choose.",
          },
        ],
      };
    case BOT_STEPS.LAYOUT_HELP:
      return {
        step,
        title: "Which feels right for you?",
        hint: "One page = everything scrolls together. Multiple pages = separate pages like a usual website.",
        explanation: [
          "One page: visitors stay on a single page and scroll. Good for small local businesses who want something simple and fast.",
          "Multiple pages: Home, About, and Contact are separate pages (like most websites). Better if you expect more content or more pages later.",
        ].join("\n\n"),
        input: "choices",
        options: [
          {
            value: "one-page",
            label: "One page",
            description: "One scrolling page with sections",
          },
          {
            value: "multi-page",
            label: "Multiple pages",
            description: "Separate pages linked in the menu",
          },
        ],
      };
    case BOT_STEPS.PHONE:
      return {
        step,
        title: "Phone or WhatsApp for your contact page?",
        hint: "Optional — you can skip and add it later when editing.",
        input: "phone",
        options: [{ value: "skip", label: "Skip for now" }],
      };
    case BOT_STEPS.STYLE:
      return {
        step,
        title: "What style feels closest?",
        hint: "Your business type already picks a template. Style is a preference note for later design tweaks.",
        input: "choices",
        options: [
          { value: "warm", label: "Warm & classic" },
          { value: "modern", label: "Modern & clean" },
          { value: "bold", label: "Bold & colorful" },
          { value: "none", label: "No preference" },
        ],
      };
    default:
      return null;
  }
}

export function labelForOption(step, value) {
  const prompt = getOnboardingPrompt(step === BOT_STEPS.LAYOUT_HELP ? BOT_STEPS.LAYOUT_HELP : step);
  const opt = prompt?.options?.find((o) => o.value === value);
  return opt?.label || value;
}

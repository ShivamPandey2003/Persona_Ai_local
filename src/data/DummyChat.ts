export interface ScriptLine {
  role: "assistant" | "user"
  content: string
  createdAt?: boolean
}

export interface ChatMsg {
  id: string
  role: "assistant" | "user"
  content: string
}


export const SCRIPT: ScriptLine[] = [
  /* 0 – welcome */
  {
    role: "assistant",
    content: `Welcome to EverSip Persona Builder. We'll create personas from your description.\n\nFor each persona, I'll capture four things:\n1) What they want (drivers)\n2) What they avoid (barriers)\n3) Occasions (when they drink)\n4) Price stance (value vs premium)\n\nLet's build Persona 1. Describe the first type of customer you want (in plain language or bullets).`,
  },
  /* 1 – user persona 1 input */
  // {
  //   role: "user",
  //   content: `- low/zero sugar\n- clean ingredients\n- light refresh\n- believable functional benefit\n- avoid artificial taste and preservatives/additives\n- post-walk, mid-day reset, better than soda moments\n- will pay a bit more if it feels clean and credible`,
  // },
  /* 2 – AI summary persona 1 */
  {
    role: "assistant",
    content: `Great. I'm summarizing this persona as:\n\n- **Drivers:** low/zero sugar, clean ingredients, light refresh, credible functional benefit\n- **Barriers:** artificial taste, preservatives/additives, over-hyped claims\n- **Occasions:** post-walk, mid-day reset, "better than soda" moments\n- **Price stance:** will pay a bit more if clean + credible\n\n**Suggested persona name:** Clean Label Hydrators (health-forward, sugar-avoidant, trust-sensitive)\n\nDo you want to adjust anything about this persona before we create the next one?`,
  },
  /* 3 – user confirms */
  // { role: "user", content: "No, next." },

  /* 4 – AI asks for persona 2 */
  { role: "assistant", content: "Describe the second type of customer." },
  /* 5 – user persona 2 input */
  // {
  //   role: "user",
  //   content: `- new/limited flavors\n- fun taste\n- carbonation\n- shareable/impulse buys\n- avoid boring flavor and overly technical/functional vibe\n- social, on-the-go, trying new stuff\n- OK if it feels exciting; deal-sensitive sometimes`,
  // },
  /* 6 – AI summary persona 2 */
  {
    role: "assistant",
    content: `Captured. Summary:\n\n- **Drivers:** novelty flavors, fun taste, carbonation, impulse/shareable\n- **Barriers:** boring flavor, overly technical/functional vibe\n- **Occasions:** social, on-the-go, discovery/trying new things\n- **Price stance:** pays if exciting; sometimes deal-sensitive\n\n**Suggested persona name:** Flavor & Fun Explorers (novelty-driven, variety-seeking)\n\nAny tweaks before we move on?`,
  },
  /* 7 – user confirms */
  // { role: "user", content: "No." },

  /* 8 – AI asks for persona 3 */
  { role: "assistant", content: "Describe the third type of customer." },
  /* 9 – user persona 3 input */
  // {
  //   role: "user",
  //   content: `- obvious value\n- family format\n- predictable taste\n- promotions\n- avoid premium positioning without clear benefit; gimmicky functional claims\n- at-home, family consumption, routine stock-ups\n- price-first; prefers multipacks`,
  // },
  /* 10 – AI summary persona 3 */
  {
    role: "assistant",
    content: `Captured. Summary:\n\n- **Drivers:** value, family format, predictable taste, promotions\n- **Barriers:** premium-without-benefit, gimmicky functional claims\n- **Occasions:** at-home, family, routine stock-ups\n- **Price stance:** price-first; multipacks preferred\n\n**Suggested persona name:** Value-First Routine Buyers (deal-driven, household stock-up mindset)\n\nAny changes?`,
  },
  /* 11 – user confirms final */
  // { role: "user", content: "No." },

  /* 12 – AI persona recap + matching preview */
  {
    role: "assistant",
    content: `Perfect — I've created 3 persona definitions and generated names based on their traits:\n1) Clean Label Hydrators\n2) Flavor & Fun Explorers\n3) Value-First Routine Buyers\n\nNext, I'll match these personas to respondents across your uploaded studies using hard + soft matching and generate the Persona Panel showing:\n- matched N per study\n- evidence coverage by category (Taste, Price/Value, Trust, Occasions, etc.)\n- confidence level and key differentiators\n\nProceeding to persona matching now.`,
  },

  /* 13 – AI triggers processing */
  {
    role: "assistant",
    content: `Perfect! I'll now start the persona creation process with these specifications. This will analyze your data against the trait definitions and build the personas. Let me proceed...`,
    createdAt: true
  },
]
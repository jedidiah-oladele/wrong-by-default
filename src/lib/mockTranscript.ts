export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const mockTranscripts: Record<string, TranscriptMessage[]> = {
  "devils-advocate": [
    {
      id: "1",
      role: "user",
      content: "I think remote work is clearly better for everyone.",
    },
    {
      id: "2",
      role: "assistant",
      content: "Interesting stance. But what about the isolation it creates? Studies show remote workers report higher rates of loneliness. And what about junior employees who miss out on spontaneous learning from observing senior colleagues?",
    },
    {
      id: "3",
      role: "user",
      content: "Good point, but the flexibility outweighs that...",
    },
    {
      id: "4",
      role: "assistant",
      content: "Does it though? Consider who truly benefits from that flexibility. Often it's those with home offices, stable internet, and no caregiving responsibilities during work hours. You might be generalizing from a privileged position.",
    },
  ],
  "first-principles": [
    {
      id: "1",
      role: "user",
      content: "I want to build a successful startup.",
    },
    {
      id: "2",
      role: "assistant",
      content: "Let's strip that down. What does 'successful' mean to you specifically? Revenue? Impact? Freedom? And what fundamental problem are you trying to solve that people actually pay to have solved today?",
    },
    {
      id: "3",
      role: "user",
      content: "I want to help people learn faster.",
    },
    {
      id: "4",
      role: "assistant",
      content: "Now we're getting somewhere. But what is learning fundamentally? It's the acquisition and retention of knowledge or skills. What specifically blocks people from acquiring or retaining? Time? Attention? Motivation? Each leads to a very different solution.",
    },
  ],
  "edge-case": [
    {
      id: "1",
      role: "user",
      content: "Our new feature is ready to launch. Users can save their preferences.",
    },
    {
      id: "2",
      role: "assistant",
      content: "What happens if a user has preferences saved, deletes their account, and signs up again with the same email? What about users who share devices? Have you tested with users who have accessibility tools enabled?",
    },
    {
      id: "3",
      role: "user",
      content: "We handle account deletion... I think.",
    },
    {
      id: "4",
      role: "assistant",
      content: "You 'think'? That's a red flag. Also, what if someone saves preferences with 10,000 characters of text in a notes field? What if they use emojis, special characters, or copy-paste formatted text from Word?",
    },
  ],
  "second-order": [
    {
      id: "1",
      role: "user",
      content: "We're going to offer free shipping on all orders.",
    },
    {
      id: "2",
      role: "assistant",
      content: "First-order effect: more orders. Second-order: smaller orders increase because there's no minimum. Third-order: your margins drop, you raise prices, customers feel deceived. Have you modeled the full cascade?",
    },
    {
      id: "3",
      role: "user",
      content: "We could set a minimum order value.",
    },
    {
      id: "4",
      role: "assistant",
      content: "Good thinking. But what's the second-order effect of that? Customers gaming the system by adding cheap items to hit the minimum, then returning them. Or worse, competitors advertising 'no minimum' and poaching your price-sensitive customers.",
    },
  ],
};

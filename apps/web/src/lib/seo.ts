export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lexhelm.com";
export const SITE_NAME = "LexHelm";
export const SITE_TAGLINE = "AI-Powered Legal Intelligence Platform";
export const SITE_DESCRIPTION =
  "Create rental agreements, NDAs, legal notices, and more with AI. Search Indian case law, draft legal documents, and analyze contracts online.";

export const LANDING_PAGES = {
  "rental-agreement": {
    title: "Create Rental Agreement Online | AI-Powered | LexHelm",
    description:
      "Create rental agreement online in minutes. AI-powered rent agreement generator for India. Get a legally valid rental agreement for Bangalore, Mumbai, Delhi & all cities.",
    h1: "Create Rental Agreement Online",
    keywords: [
      "create rental agreement",
      "rent agreement online",
      "rental agreement format India",
      "rent agreement generator",
      "rental agreement Bangalore",
      "rent agreement online Mumbai",
      "lease agreement format",
      "11 month rent agreement",
    ],
    templateId: "rental_agreement",
    icon: "Home",
    color: "blue",
    features: [
      "Legally valid for all Indian states",
      "11-month and long-term lease options",
      "Auto-filled stamp duty clauses",
      "Customizable terms and conditions",
      "Export as PDF or DOCX",
    ],
    faqs: [
      {
        q: "Is an online rental agreement legally valid in India?",
        a: "Yes, rental agreements created online are legally valid in India. For agreements exceeding 11 months, registration under the Registration Act is recommended. LexHelm generates agreements that comply with Indian rental laws.",
      },
      {
        q: "How much does it cost to create a rental agreement?",
        a: "With LexHelm, you can create a rental agreement for free using our AI-powered drafting tool. Simply describe your requirements and our AI will generate a complete, legally formatted agreement.",
      },
      {
        q: "What details are needed for a rental agreement?",
        a: "You'll need: landlord and tenant names and addresses, property details, monthly rent amount, security deposit, agreement duration, and any special terms. Our AI will guide you through each field.",
      },
    ],
  },
  nda: {
    title: "Create NDA Online | Non-Disclosure Agreement Generator | LexHelm",
    description:
      "Create NDA online instantly. AI-powered non-disclosure agreement generator for India. Protect your business secrets with a legally valid NDA.",
    h1: "Create NDA Online",
    keywords: [
      "create NDA online",
      "NDA template India",
      "non-disclosure agreement generator",
      "NDA agreement online",
      "NDA format India",
      "mutual NDA template",
      "confidentiality agreement India",
    ],
    templateId: "nda",
    icon: "Shield",
    color: "violet",
    features: [
      "Mutual and one-way NDA options",
      "Customizable confidentiality scope",
      "Non-compete and non-solicitation clauses",
      "Indian law compliant",
      "Export as PDF or DOCX",
    ],
    faqs: [
      {
        q: "What is an NDA and when do I need one?",
        a: "A Non-Disclosure Agreement (NDA) is a legal contract that protects confidential information shared between parties. You need an NDA when sharing business secrets, proprietary information, trade secrets, or any sensitive data with employees, contractors, or business partners.",
      },
      {
        q: "Is an NDA legally enforceable in India?",
        a: "Yes, NDAs are legally enforceable in India under the Indian Contract Act, 1872. However, non-compete clauses may have limited enforceability. LexHelm generates NDAs that are structured for maximum enforceability under Indian law.",
      },
      {
        q: "What's the difference between mutual and one-way NDA?",
        a: "A one-way NDA protects information shared by one party. A mutual NDA protects confidential information shared by both parties. Use mutual NDAs when both sides are sharing sensitive information, such as in business partnerships or joint ventures.",
      },
    ],
  },
  "legal-notice": {
    title: "Create Legal Notice Online | Send Legal Notice India | LexHelm",
    description:
      "Create and send legal notice online in India. AI-powered legal notice generator for unpaid rent, property disputes, cheque bounce, and more.",
    h1: "Create Legal Notice Online",
    keywords: [
      "create legal notice online",
      "legal notice format India",
      "send legal notice online",
      "legal notice for unpaid rent",
      "legal notice generator",
      "cheque bounce legal notice",
      "property dispute legal notice",
    ],
    templateId: "legal_notice",
    icon: "AlertTriangle",
    color: "amber",
    features: [
      "Multiple notice types supported",
      "Proper legal formatting",
      "Demand and timeline clauses",
      "Reply deadline specification",
      "Export as PDF or DOCX",
    ],
    faqs: [
      {
        q: "What is a legal notice and when should I send one?",
        a: "A legal notice is a formal communication sent to a person or organization informing them of your intention to take legal action. It's commonly sent for unpaid dues, breach of contract, property disputes, defamation, and cheque bounce cases under Section 138 of the Negotiable Instruments Act.",
      },
      {
        q: "Is a legal notice mandatory before filing a case?",
        a: "For some cases like cheque bounce (Section 138 NI Act), sending a legal notice is mandatory. For others, while not legally required, it demonstrates good faith and often resolves disputes without litigation.",
      },
      {
        q: "How should a legal notice be sent?",
        a: "Legal notices should be sent via registered post with acknowledgment due (RPAD) or through a courier with proof of delivery. This provides evidence that the notice was sent and received.",
      },
    ],
  },
  "service-agreement": {
    title: "Create Service Agreement Online | Contract Generator | LexHelm",
    description:
      "Create service agreement online with AI. Generate legally valid consulting, freelance, and professional service contracts for India.",
    h1: "Create Service Agreement Online",
    keywords: [
      "create service agreement online",
      "service agreement template India",
      "consulting agreement generator",
      "freelance contract India",
      "service contract template",
      "professional services agreement",
    ],
    templateId: "service_agreement",
    icon: "Handshake",
    color: "emerald",
    features: [
      "Scope of work definition",
      "Payment terms and milestones",
      "IP ownership clauses",
      "Termination conditions",
      "Export as PDF or DOCX",
    ],
    faqs: [
      {
        q: "What should a service agreement include?",
        a: "A service agreement should include: scope of services, payment terms, timeline, intellectual property rights, confidentiality clauses, termination conditions, dispute resolution, and liability limitations.",
      },
      {
        q: "Is a service agreement legally binding in India?",
        a: "Yes, a service agreement is a legally binding contract under the Indian Contract Act, 1872, provided it meets the basic requirements of a valid contract: offer, acceptance, consideration, and free consent.",
      },
      {
        q: "Do I need a service agreement for freelance work?",
        a: "Yes, having a written service agreement for freelance work protects both the service provider and the client. It clearly defines deliverables, payment terms, and intellectual property ownership.",
      },
    ],
  },
  "power-of-attorney": {
    title: "Create Power of Attorney Online | POA Format India | LexHelm",
    description:
      "Create power of attorney online in India. AI-powered POA generator for general, special, and property power of attorney documents.",
    h1: "Create Power of Attorney Online",
    keywords: [
      "create power of attorney online",
      "power of attorney format India",
      "POA online India",
      "general power of attorney",
      "special power of attorney",
      "property power of attorney",
    ],
    templateId: "power_of_attorney",
    icon: "UserCheck",
    color: "rose",
    features: [
      "General and special POA options",
      "Property transaction authorization",
      "Banking and financial powers",
      "Revocation clause included",
      "Export as PDF or DOCX",
    ],
    faqs: [
      {
        q: "What is a Power of Attorney?",
        a: "A Power of Attorney (POA) is a legal document that authorizes one person (the agent) to act on behalf of another person (the principal) in legal, financial, or property matters.",
      },
      {
        q: "Does a Power of Attorney need to be registered?",
        a: "In India, a POA for immovable property transactions must be registered under Section 33 of the Registration Act, 1908. For other purposes, notarization is generally sufficient.",
      },
      {
        q: "What's the difference between general and special POA?",
        a: "A General Power of Attorney grants broad authority to act on the principal's behalf in multiple matters. A Special Power of Attorney limits the agent's authority to specific tasks or transactions.",
      },
    ],
  },
} as const;

export type LandingPageSlug = keyof typeof LANDING_PAGES;

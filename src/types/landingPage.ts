export interface HeroData {
  title: string;
  highlight: string;
  description: string;
  pills: string[];
  bottomText: string;
}

export interface Step {
  title: string;
  description: string;
}

export interface HowItWorksData {
  title?: string;
  description?: string;
  steps: Step[];
}

export interface Format {
  name: string;
  description: string;
}

export interface SupportedFormatsData {
  title?: string;
  description?: string;
  formats: Format[];
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface ImageFeaturesData {
  title?: string;
  description?: string;
  features: Feature[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface FAQData {
  title?: string;
  description?: string;
  faqs: FAQ[];
}

export interface RelatedTool {
  title: string;
  description: string;
  href: string;
  available: boolean;
}

export interface RelatedToolsData {
  title?: string;
  description?: string;
  tools: RelatedTool[];
}

export interface SEOData {
  title: string;
  description: string;
}

export interface LandingPageData {
  seo: SEOData;

  hero: HeroData;

  howItWorks: HowItWorksData;

  supportedFormats: SupportedFormatsData;

  guide: {
    badge: string;
    title: string;
    highlight: string;
    suffix: string;
    description: string;
  };

  imageFeatures: ImageFeaturesData;

  faq: FAQData;

  relatedTools: RelatedToolsData;
}
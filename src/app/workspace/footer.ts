export interface Institution {
  name: string;
  logo: string;
  url: string;
}

export interface QuickLink {
  label: string;
  url: string;
}

export interface ContactInfo {
  email: string;
  phone?: string;
  social: {
    twitter?: string;
    linkedin?: string;
  }
}

export interface FooterConfig {
  institutions: Institution[];
  quickLinks: QuickLink[];
  contact: ContactInfo;
  copyright: {
    text: string;
    subtext?: string;
  }
}

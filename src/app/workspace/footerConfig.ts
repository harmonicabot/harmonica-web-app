import { FooterConfig } from './footer';

export const footerConfigs: Record<string, FooterConfig> = {
  default: {
    institutions: [
      {
        name: 'Harmonica',
        logo: '/harmonica.png',
        url: 'https://harmonica.chat',
      },
    ],
    quickLinks: [
      {
        label: 'Help Center',
        url: 'https://help.harmonica.chat',
      },
      { label: 'Contact Us', url: 'https://t.me/harmonica_support' },
    ],
    contact: {
      email: 'hello@harmonica.chat',
      social: {
        twitter: 'https://x.com/harmonica_chat',
        linkedin: 'https://www.linkedin.com/company/harmonica-ai',
      },
    },
    copyright: {
      text: '© 2025 Harmonica. All rights reserved.',
    },
  },
  'ENS-PSL': {
    institutions: [
      {
        name: 'École Normale Supérieure Paris',
        logo: '/ens-psl.png',
        url: 'https://www.ens.psl.eu',
      },
      {
        name: 'Missions Publiques',
        logo: 'https://media.licdn.com/dms/image/v2/C560BAQGxBQjr_-LZQg/company-logo_200_200/company-logo_200_200/0/1630596722266/missions_publiques_logo?e=1746662400&v=beta&t=58Wj4r1gzd5LUaXitos-MTVKeEA1-RzmzXWBntWUpac',
        url: 'https://missionspubliques.org',
      },
      {
        name: 'Harmonica',
        logo: '/harmonica.png',
        url: 'https://harmonica.chat',
      },
    ],
    quickLinks: [
      {
        label: 'About the Summit',
        url: 'https://www.ai-inthecity.ens.psl.eu/en/l-ens-pole-d-excellence-de-recherche-et-de-formation-sur-l-ia',
      },
      {
        label: 'Harmonica Help Center',
        url: 'https://help.harmonica.chat',
      },
      { label: 'Contact Harmonica', url: 'https://t.me/harmonica_support' },
      {
        label: 'Privacy Policy',
        url: 'https://help.harmonica.chat/privacy',
      },
    ],
    contact: {
      email: 'ai-summit@ens.psl.eu',
      phone: '+33 (0)1 44 32 30 00',
      social: {
        twitter: 'https://twitter.com/ENSparis',
        linkedin: 'https://linkedin.com/school/ecolenormalesuperieure',
      },
    },
    copyright: {
      text: '© 2025 Harmonica. All rights reserved.',
      subtext:
        'A collaboration between ENS Paris, Mission Publique, and Harmonica',
    },
  },
};

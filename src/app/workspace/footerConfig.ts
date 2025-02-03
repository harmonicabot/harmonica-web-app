import { FooterConfig } from './footer';

export const footerConfigs: Record<string, FooterConfig> = {
  'default': {
    institutions: [
      {
        name: 'Harmonica AI',
        logo: '/harmonica-logo.png',
        url: 'https://harmonica.ai'
      }
    ],
    quickLinks: [
      { label: 'Help Center', url: 'https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40?pvs=4' },
      { label: 'Contact Us', url: 'https://t.me/harmonica_support' },
    ],
    contact: {
      email: 'hello@harmonica.chat',
      social: {
        twitter: 'https://x.com/harmonica_chat',
        linkedin: 'https://www.linkedin.com/company/harmonica-ai'
      }
    },
    copyright: {
      text: '© 2025 Harmonica AI. All rights reserved.',
    }
  },
  'wsp_2ef1f6f94b97': {
    institutions: [
      {
        name: 'École Normale Supérieure Paris',
        logo: 'https://scontent.fakl1-3.fna.fbcdn.net/v/t39.30808-6/335250506_752376889611569_2312153368402715028_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=1fiaZETX4FQQ7kNvgGjvAv6&_nc_zt=23&_nc_ht=scontent.fakl1-3.fna&_nc_gid=Avf7vU40BvJEuAaWCSW_vOy&oh=00_AYBRM8yCdrexqyg3WzhQjYzHb_YjKyft1-c8vdTd49Ba1w&oe=67A5EEAA',
        url: 'https://www.ens.psl.eu'
      },
      {
        name: 'Mission Publiques',
        logo: 'https://media.licdn.com/dms/image/v2/C560BAQGxBQjr_-LZQg/company-logo_200_200/company-logo_200_200/0/1630596722266/missions_publiques_logo?e=1746662400&v=beta&t=58Wj4r1gzd5LUaXitos-MTVKeEA1-RzmzXWBntWUpac',
        url: 'https://missionspubliques.org'
      },
      {
        name: 'Harmonica AI',
        logo: '/harmonica.png',
        url: 'https://harmonica.ai'
      }
    ],
    quickLinks: [
      { label: 'About the Summit', url: 'https://www.ai-inthecity.ens.psl.eu/en/l-ens-pole-d-excellence-de-recherche-et-de-formation-sur-l-ia' },
      { label: 'Harmonica Help Center', url: 'https://oldspeak.notion.site/Help-Center-fcf198f4683b4e3099beddf48971bd40?pvs=4' },
      { label: 'Contact Harmonica', url: 'https://t.me/harmonica_support' },
    ],
    contact: {
      email: 'ai-summit@ens.psl.eu',
      phone: '+33 (0)1 44 32 30 00',
      social: {
        twitter: 'https://twitter.com/ENSparis',
        linkedin: 'https://linkedin.com/school/ecolenormalesuperieure'
      }
    },
    copyright: {
      text: '© 2025 Harmonica AI. All rights reserved.',
      subtext: 'A collaboration between ENS Paris, Mission Publique, and Harmonica AI'
    }
  }
};

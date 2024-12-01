type MetadataConfig = {
  [route: string]: {
    title: string;
    description?: string;
    image?: string;
  }
}

export const routeMetadata: MetadataConfig = {
  '/': {
    title: 'Dashboard',
    description: `Perform superfast async AI deliberations`,
  },
  '/create': {
    title: 'Create',
    description: 'Manage your Harmonica conversations and settings'
  },
  '/login': {
    title: 'Welcome to Harmonica',
  },
}

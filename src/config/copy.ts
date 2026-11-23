export const LANG = 'en' as const;
export type Language = 'en' | 'fr';

export const COPY: Record<Language, Record<string, string>> = {
  en: {
    home: 'Home', projects: 'Projects', contact: 'Contact', allProjects: 'All projects', about: 'About',
    hire: 'Hire me', fastMode: 'Fast mode', language: 'Language', enter3d: 'Enter the 3D studio',
    intro: 'Full-stack developer · Casablanca, Morocco',
    introBody: 'I build complete web applications — clear interfaces, reliable APIs and interactive 3D experiences.',
    explore: 'Explore the work', selectedWork: 'Selected work', viewCode: 'View code', liveApp: 'Live app',
    aboutTitle: 'Ideas into useful experiences.',
    aboutBody: 'I build complete web applications, from clear interfaces and reliable APIs to interactive 3D experiences.',
    featuredBuilds: 'featured builds', toolsStack: 'tools in my stack', projectVideos: 'project videos',
    contactPrompt: 'Have a project in mind?', contactTitle: "Let's make something useful.",
    available: 'Available for collaboration, freelance projects and new opportunities.',
    controls: 'WASD / arrows · Shift to run · drag to orbit',
    exploreRoom: 'Explore the room', leaveRoom: 'Leave the room', sitDesk: 'Sit at the desk',
    sitPodcast: 'Sit in the podcast chair', sitCouch: 'Sit on the couch', play: 'Play NEON DODGE',
    stand: 'Stand up', shield: 'Activate shield', dismiss: 'Dismiss', closeContact: 'Close contact dialog',
  },
  fr: {
    home: 'Accueil', projects: 'Projets', contact: 'Contact', allProjects: 'Tous les projets', about: 'À propos',
    hire: 'Me contacter', fastMode: 'Mode rapide', language: 'Langue', enter3d: 'Entrer dans le studio 3D',
    intro: 'Développeur full-stack · Casablanca, Maroc',
    introBody: 'Je crée des applications web complètes : interfaces claires, API fiables et expériences 3D interactives.',
    explore: 'Découvrir mes projets', selectedWork: 'Projets sélectionnés', viewCode: 'Voir le code', liveApp: 'Application',
    aboutTitle: 'Des idées en expériences utiles.',
    aboutBody: 'Je crée des applications web complètes, des interfaces claires et API fiables aux expériences 3D interactives.',
    featuredBuilds: 'projets présentés', toolsStack: 'technologies utilisées', projectVideos: 'vidéos de projets',
    contactPrompt: 'Un projet en tête ?', contactTitle: 'Créons quelque chose d’utile.',
    available: 'Disponible pour des collaborations, missions freelance et nouvelles opportunités.',
    controls: 'WASD / flèches · Maj pour courir · glisser pour tourner',
    exploreRoom: 'Explorer la pièce', leaveRoom: 'Quitter la pièce', sitDesk: 'S’asseoir au bureau',
    sitPodcast: 'S’asseoir au coin podcast', sitCouch: 'S’asseoir sur le canapé', play: 'Jouer à NEON DODGE',
    stand: 'Se lever', shield: 'Activer le bouclier', dismiss: 'Fermer', closeContact: 'Fermer les options de contact',
  },
};

const EMPTY_IMAGES = [
  { src: null, caption: '' },
  { src: null, caption: '' },
  { src: null, caption: '' },
  { src: null, caption: '' },
]

export const DEFAULT_CONTENT = {
  hero: {
    name: 'Tyrese Mosley',
    subtitle: 'I build things that actually work for people who actually need them.',
  },
  about: {
    heading: 'Who I am',
    bio: "I'm Tyrese Mosley, an Information Science student with a passion for building technology that actually makes a difference. I love turning complex problems into clean, intuitive experiences — from full-stack web apps to data systems used by real organizations.",
    journey: "My journey started with a simple curiosity about how things work on the internet. That curiosity turned into late nights learning to code, eventually leading me to build real tools for nonprofits in Philadelphia. Every project teaches me something new, and every line of code is a step toward the kind of builder I want to be.",
  },
  projects: [
    {
      id: '1',
      title: 'WLP Youth Tracker',
      description: 'Internal student lifecycle tracking platform for a Philadelphia nonprofit. Replaces fragmented spreadsheets and Airtable with a single source of truth — tracking students from application through alumni engagement.',
      stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind CSS', 'Vercel'],
      image: null,
      link: null,
      caseStudy: {
        hook: '',
        story: '',
        images: JSON.parse(JSON.stringify(EMPTY_IMAGES)),
      },
    },
    {
      id: '2',
      title: 'WLP PTO Portal',
      description: 'Internal PTO management system for nonprofit staff. Features request submission, manager approvals, team calendar with blackout dates, email notifications, and a GitHub-backed CMS.',
      stack: ['Next.js', 'React', 'Supabase', 'Nodemailer', 'Prisma'],
      image: null,
      link: null,
      caseStudy: {
        hook: '',
        story: '',
        images: JSON.parse(JSON.stringify(EMPTY_IMAGES)),
      },
    },
    {
      id: '3',
      title: 'Personal Portfolio',
      description: 'This site — built from scratch with Vite + React and plain CSS. Features a GitHub-backed CMS, PIN-protected admin panel, smooth scroll animations, and Intersection Observer-powered reveals.',
      stack: ['Vite', 'React', 'GitHub API', 'CSS'],
      image: null,
      link: null,
      caseStudy: {
        hook: '',
        story: '',
        images: JSON.parse(JSON.stringify(EMPTY_IMAGES)),
      },
    },
  ],
  projectsHeading: "Things I've built",
  resumeHeading: 'Download my resume',
  profilePhoto: null,
  resume: null,
}

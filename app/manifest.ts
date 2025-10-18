import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DR. INFO - AI Assistant for Doctors',
    short_name: 'DR. INFO',
    description: 'Redefining How Medicine Finds Answers',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3771FE',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    categories: ['medical', 'health', 'productivity', 'education'],
    icons: [
      {
        src: '/favicon.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    screenshots: [
      {
        src: '/screenshot-desktop.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Dr.Info Desktop Interface'
      },
      {
        src: '/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Dr.Info Mobile Interface'
      }
    ],
    related_applications: [],
    prefer_related_applications: false,
    edge_side_panel: {
      preferred_width: 400
    }
  }
}

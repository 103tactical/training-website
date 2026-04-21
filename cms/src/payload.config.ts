import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Courses } from './collections/Courses'
import { Badges } from './collections/Badges'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { SiteSettings } from './globals/SiteSettings'
import { HomePage } from './globals/HomePage'
import { Utility } from './globals/Utility'
import { ContactSettings } from './globals/ContactSettings'
import { CoursesPage } from './globals/CoursesPage'
import { ApplicationsPage } from './globals/ApplicationsPage'
import { StorePage } from './globals/StorePage'
import { CourseGroups } from './collections/CourseGroups'
import { CourseSchedules } from './collections/CourseSchedules'
import { Attendees } from './collections/Attendees'
import { Bookings } from './collections/Bookings'
import { Instructors } from './collections/Instructors'
import { PendingBookings } from './collections/PendingBookings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_SERVER_URL || 'https://training-cms.onrender.com',
  bodyParser: {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB (busboy multipart parser)
    },
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      providers: ['./providers/AdminStyles'],
      graphics: {
        Logo: './components/AdminLogo',
      },
      Nav: './components/CustomNav',
      views: {
        scheduleOverview: {
          Component: './components/schedule-overview/ScheduleOverviewPage',
          path: '/schedule-dashboard',
        },
        reportingDashboard: {
          Component: './components/reporting/Dashboard',
          path: '/reporting/dashboard',
        },
        reportingRevenue: {
          Component: './components/reporting/RevenueReport',
          path: '/reporting/revenue',
        },
        reportingBookings: {
          Component: './components/reporting/BookingsReport',
          path: '/reporting/bookings',
        },
        reportingRefunds: {
          Component: './components/reporting/RefundsReport',
          path: '/reporting/refunds',
        },
      },
    },
  },
  collections: [ContactSubmissions, Users, Media, Courses, Badges, CourseGroups, CourseSchedules, Attendees, Bookings, Instructors, PendingBookings],
  globals: [HomePage, CoursesPage, ApplicationsPage, StorePage, SiteSettings, ContactSettings, Utility],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [],
})

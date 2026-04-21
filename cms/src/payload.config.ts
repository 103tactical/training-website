import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Courses } from './collections/Courses'
import { CourseGroups } from './collections/CourseGroups'
import { CourseSchedules } from './collections/CourseSchedules'
import { Attendees } from './collections/Attendees'
import { Bookings } from './collections/Bookings'
import { Instructors } from './collections/Instructors'
import { PendingBookings } from './collections/PendingBookings'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Badges } from './collections/Badges'
import { ScheduleDashboard } from './globals/ScheduleDashboard'
import { HomePage } from './globals/HomePage'
import { CoursesPage } from './globals/CoursesPage'
import { ApplicationsPage } from './globals/ApplicationsPage'
import { StorePage } from './globals/StorePage'
import { ContactSettings } from './globals/ContactSettings'
import { SiteSettings } from './globals/SiteSettings'
import { Utility } from './globals/Utility'

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
      afterNavLinks: [
        './components/reporting/AccountingNav',
      ],
      views: {
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
  collections: [Courses, CourseGroups, CourseSchedules, Attendees, Bookings, Instructors, PendingBookings, ContactSubmissions, Users, Media, Badges],
  globals: [ScheduleDashboard, HomePage, CoursesPage, ApplicationsPage, StorePage, ContactSettings, SiteSettings, Utility],
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

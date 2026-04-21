import type { GlobalConfig } from 'payload'

export const ScheduleDashboard: GlobalConfig = {
  slug: 'schedule-dashboard',
  label: 'Schedule Dashboard',
  admin: {
    group: 'Course Management',
    components: {
      views: {
        edit: {
          root: {
            Component: './components/schedule-overview/ScheduleOverviewPage',
          },
        },
      },
    },
  },
  fields: [],
}

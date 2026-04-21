import type { GlobalConfig } from "payload";

export const Utility: GlobalConfig = {
  slug: "utility",
  label: "Utility",
  access: {
    read: () => true,
  },
  admin: {
    description: "Miscellaneous site behaviour controls.",
    hidden: true,
  },
  fields: [
    {
      name: "carouselDelay",
      type: "select",
      label: "Featured Carousel — Auto-Slide Delay",
      defaultValue: "6",
      options: [
        { label: "Off (disabled)", value: "off" },
        { label: "4 seconds",      value: "4"   },
        { label: "6 seconds",      value: "6"   },
        { label: "8 seconds",      value: "8"   },
        { label: "10 seconds",     value: "10"  },
      ],
      admin: {
        description:
          "How long each slide displays before automatically advancing. Set to Off to disable auto-pagination entirely.",
      },
    },
  ],
};

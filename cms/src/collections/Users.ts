import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    group: 'Data',
    useAsTitle: "email",
  },
  fields: [],
};

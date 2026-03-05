import path from "path";
import { fileURLToPath } from "url";
import type { CollectionConfig } from "payload";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      type: "text",
    },
  ],
  upload: {
    // On Render: set MEDIA_STATIC_DIR=/var/data/media (persistent disk)
    // Locally: falls back to cms/public/media
    staticDir: process.env.MEDIA_STATIC_DIR ?? path.resolve(dirname, "../../public/media"),
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB
    },
  },
};

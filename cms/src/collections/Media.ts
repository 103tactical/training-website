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
    // Compress images in place on upload (sharp). Camera files routinely
    // arrive at 5-20 MB; capped at 2560px wide they re-encode (JPEG ~q80,
    // PNG compressed) to a fraction of the size with no visible loss.
    // Each format keeps its own type — PNGs keep transparency (logos!),
    // so do NOT add formatOptions with a forced format here. Non-image
    // uploads (PDF, video, Word docs) pass through untouched.
    resizeOptions: {
      width: 2560,
      withoutEnlargement: true,
    },
  },
};

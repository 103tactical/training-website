import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  // These match Payload's defaults — stated explicitly so the brute-force
  // protection is documented: 5 failed logins locks the account for 10
  // minutes (attacker is capped at ~720 guesses/day; admin can force-unlock
  // from the Users list, or the lock expires on its own).
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    useAsTitle: "email",
  },
  fields: [],
};

import { handlers } from "@/shared/lib/auth"

// Must NOT be edge — authorize uses bcryptjs (Node.js crypto)

export const { GET, POST } = handlers

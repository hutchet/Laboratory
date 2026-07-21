import { handlers } from "@/shared/lib/auth"

// MUST stay Node.js runtime — PrismaAdapter + bcrypt don't work on Edge
// export const runtime = 'edge'

export const { GET, POST } = handlers

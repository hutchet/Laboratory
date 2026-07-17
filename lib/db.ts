// Prisma client dung chung - edge-compatible (Neon HTTP adapter)
// Lazy init — không require DATABASE_URL lúc import
import { PrismaClient } from "@prisma/client"
import { PrismaNeonHTTP } from "@prisma/adapter-neon"
import { neon } from "@neondatabase/serverless"

let dbInstance: PrismaClient | null = null
let initPromise: Promise<PrismaClient> | null = null

async function getClient(): Promise<PrismaClient> {
  if (dbInstance) return dbInstance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL not set')
    const sql = neon(connectionString)
    const adapter = new PrismaNeonHTTP(sql)
    dbInstance = new PrismaClient({ adapter })
    return dbInstance
  })()

  return initPromise
}

// Proxy — code gọi db.user.findMany() tự động init lần đầu
function createModelProxy(model: string) {
  return new Proxy({} as Record<string, Function>, {
    get(_, method: string) {
      return async (...args: unknown[]) => {
        const client = await getClient()
        const fn = (client as any)[model]?.[method]
        if (typeof fn === 'function') return fn.apply(client[model as keyof typeof client], args)
        throw new Error(`Prisma: ${model}.${method} not found`)
      }
    }
  })
}

export const db = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    if (prop === 'then') return undefined
    if (typeof prop === 'string' && prop.startsWith('$')) {
      return async (...args: unknown[]) => {
        const client = await getClient()
        const fn = (client as any)[prop]
        if (typeof fn === 'function') return fn.apply(client, args)
        return fn
      }
    }
    return createModelProxy(prop as string)
  }
})


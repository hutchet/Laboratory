import { handlers } from "@/shared/lib/auth"

// KHONG chay Edge runtime: PrismaClient (node engine, khong dung Accelerate/driver-adapter)
// khong tuong thich voi Edge. Chay Edge truoc day khien PrismaAdapter throw ngam trong route
// nay -> auth() luon tra ve session null -> header luon fallback "Nguoi dung" + khong co email,
// du jwt()/session() callback va du lieu Member/User trong DB deu dung.
export const { GET, POST } = handlers

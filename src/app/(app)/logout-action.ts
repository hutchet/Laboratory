"use server"

import { signOut } from "@/shared/lib/auth"

export async function logoutAction() {
  await signOut({ redirectTo: "/login" })
}

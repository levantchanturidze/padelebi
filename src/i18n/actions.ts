"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setLocaleAction(locale: string) {
  const store = await cookies();
  store.set("locale", ["en", "ka"].includes(locale) ? locale : "en", {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/", "layout");
}

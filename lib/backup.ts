"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { AppState } from "@/types/budget";

export async function backupStateToSupabase(state: AppState): Promise<void> {
  if (process.env.NEXT_PUBLIC_ENABLE_SUPABASE_BACKUP !== "true") {
    return;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("household_budget_backups").upsert({
    id: "default",
    payload: state,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw error;
  }
}

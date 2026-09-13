// Re-export standalone auth client (Supabase completely removed)
import { auth, supabase as compatSupabase } from "./auth";

export { auth };
export const supabase = compatSupabase;
export default compatSupabase;
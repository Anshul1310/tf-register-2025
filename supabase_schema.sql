-- ==============================================================================
-- TransfiNITTe 2025 - Supabase Database Schema
-- Run this script in the Supabase Dashboard -> SQL Editor (for project: plboxrfxpcqzlprqljpk)
-- ==============================================================================

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    team_id text PRIMARY KEY,
    name text NOT NULL UNIQUE,
    leader text,
    leader_user_id uuid,
    contact text,
    problem_statement text,
    domain text,
    payment_status text DEFAULT 'Pending',
    ispublic boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    email text,
    roll_number text,
    hostel text,
    mess text,
    gender text,
    pfp text,
    team_id text REFERENCES public.teams(team_id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Index for faster member queries
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);

-- 3. Automatic User Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (user_id, email, name, pfp)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN public.users.name IS NULL OR public.users.name = '' THEN EXCLUDED.name ELSE public.users.name END,
    pfp = CASE WHEN public.users.pfp IS NULL OR public.users.pfp = '' THEN EXCLUDED.pfp ELSE public.users.pfp END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users into public.users
INSERT INTO public.users (user_id, email, name, pfp)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  COALESCE(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '')
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 4. RPC Function: count_team_members
CREATE OR REPLACE FUNCTION public.count_team_members(team_id_input text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT count(*)::integer FROM public.users WHERE team_id = team_id_input;
$$;

-- 5. RPC Function: register_team_and_user
CREATE OR REPLACE FUNCTION public.register_team_and_user(
    team_name text,
    leader_email text,
    leader_user_id uuid,
    contact_number text,
    user_email_param text,
    new_team_id text,
    problem_statement text DEFAULT NULL,
    domain text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.teams (
        team_id,
        name,
        leader,
        leader_user_id,
        contact,
        problem_statement,
        domain,
        payment_status,
        ispublic
    ) VALUES (
        new_team_id,
        team_name,
        leader_email,
        leader_user_id,
        contact_number,
        problem_statement,
        domain,
        'Pending',
        false
    );

    UPDATE public.users
    SET team_id = new_team_id
    WHERE user_id = leader_user_id;
END;
$$;

-- 6. Permissions and Role Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_team_members(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_team_and_user(text, text, uuid, text, text, text, text, text) TO anon, authenticated, service_role;

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Allow select users" ON public.users;
CREATE POLICY "Allow select users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert users" ON public.users;
CREATE POLICY "Allow insert users" ON public.users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update users" ON public.users;
CREATE POLICY "Allow update users" ON public.users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete users" ON public.users;
CREATE POLICY "Allow delete users" ON public.users FOR DELETE USING (true);

-- Teams policies
DROP POLICY IF EXISTS "Allow select teams" ON public.teams;
CREATE POLICY "Allow select teams" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert teams" ON public.teams;
CREATE POLICY "Allow insert teams" ON public.teams FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update teams" ON public.teams;
CREATE POLICY "Allow update teams" ON public.teams FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete teams" ON public.teams;
CREATE POLICY "Allow delete teams" ON public.teams FOR DELETE USING (true);

-- 8. Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';

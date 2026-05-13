
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  school_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: select own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT NOT NULL DEFAULT 'amber',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups: own all" ON public.groups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.groups(user_id);

-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students: own all" ON public.students FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.students(user_id);
CREATE INDEX ON public.students(group_id);

-- Attendance
CREATE TYPE public.attendance_status AS ENUM ('present','late','absent','unknown');

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'unknown',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attendance: own all" ON public.attendance_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.attendance_records(group_id, date);
CREATE INDEX ON public.attendance_records(student_id);

-- Rewards / penalties
CREATE TABLE public.reward_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  points NUMERIC NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reward_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards: own all" ON public.reward_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.reward_records(student_id);
CREATE INDEX ON public.reward_records(group_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, school_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'school_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

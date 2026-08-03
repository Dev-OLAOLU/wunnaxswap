-- =============================================================================
-- WUNNAXSWAP — Supabase backend (demo exchange ledger)
-- Paste into: Supabase Dashboard → SQL Editor → Run
-- Project: create a NEW Supabase project for Wunnaxswap (do not mix with Better Home)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'none'
    CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Wallets + balances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  amount NUMERIC(28, 12) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, asset)
);

CREATE INDEX IF NOT EXISTS balances_wallet_idx ON public.balances (wallet_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_select_own" ON public.wallets;
CREATE POLICY "wallets_select_own" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "balances_select_own" ON public.balances;
CREATE POLICY "balances_select_own" ON public.balances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets w
      WHERE w.id = balances.wallet_id AND w.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT ON public.balances TO authenticated;
GRANT ALL ON public.wallets TO service_role;
GRANT ALL ON public.balances TO service_role;


-- Auto-create profile + empty wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_wunnax_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid UUID;
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO wid;

  IF wid IS NULL THEN
    SELECT id INTO wid FROM public.wallets WHERE user_id = NEW.id;
  END IF;

  -- Seed demo balances (paper trading — not real custody)
  INSERT INTO public.balances (wallet_id, asset, amount) VALUES
    (wid, 'USDT', 2500),
    (wid, 'BTC', 0.05),
    (wid, 'ETH', 1.2),
    (wid, 'SOL', 15),
    (wid, 'BNB', 2),
    (wid, 'XRP', 200)
  ON CONFLICT (wallet_id, asset) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wunnax ON auth.users;
CREATE TRIGGER on_auth_user_created_wunnax
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_wunnax_user();

-- ---------------------------------------------------------------------------
-- Orders (spot + futures demo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell', 'long', 'short')),
  market_type TEXT NOT NULL DEFAULT 'spot' CHECK (market_type IN ('spot', 'futures')),
  pair TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit')),
  price NUMERIC(28, 12),
  amount NUMERIC(28, 12) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'filled'
    CHECK (status IN ('open', 'filled', 'cancelled', 'rejected')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_created_idx ON public.orders (user_id, created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

-- ---------------------------------------------------------------------------
-- Swaps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  send_asset TEXT NOT NULL,
  recv_asset TEXT NOT NULL,
  send_amount NUMERIC(28, 12) NOT NULL CHECK (send_amount > 0),
  recv_amount NUMERIC(28, 12) NOT NULL CHECK (recv_amount > 0),
  fee_amount NUMERIC(28, 12) NOT NULL DEFAULT 0,
  rate NUMERIC(28, 12),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS swaps_user_created_idx ON public.swaps (user_id, created_at DESC);

ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swaps_select_own" ON public.swaps;
DROP POLICY IF EXISTS "swaps_insert_own" ON public.swaps;
CREATE POLICY "swaps_select_own" ON public.swaps
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "swaps_insert_own" ON public.swaps
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.swaps TO authenticated;
GRANT ALL ON public.swaps TO service_role;

-- ---------------------------------------------------------------------------
-- Stakes (Earn)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  amount NUMERIC(28, 12) NOT NULL CHECK (amount > 0),
  plan_label TEXT,
  apr NUMERIC(10, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS stakes_user_idx ON public.stakes (user_id, status);

ALTER TABLE public.stakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakes_select_own" ON public.stakes;
DROP POLICY IF EXISTS "stakes_insert_own" ON public.stakes;
DROP POLICY IF EXISTS "stakes_update_own" ON public.stakes;
CREATE POLICY "stakes_select_own" ON public.stakes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "stakes_insert_own" ON public.stakes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stakes_update_own" ON public.stakes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.stakes TO authenticated;
GRANT ALL ON public.stakes TO service_role;

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_all_own" ON public.favorites;
CREATE POLICY "favorites_all_own" ON public.favorites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

-- ---------------------------------------------------------------------------
-- Deposit addresses (demo / paper)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deposit_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'demo',
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deposit_addr_user_idx ON public.deposit_addresses (user_id, asset);

ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposit_addr_select_own" ON public.deposit_addresses;
DROP POLICY IF EXISTS "deposit_addr_insert_own" ON public.deposit_addresses;
CREATE POLICY "deposit_addr_select_own" ON public.deposit_addresses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "deposit_addr_insert_own" ON public.deposit_addresses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.deposit_addresses TO authenticated;
GRANT ALL ON public.deposit_addresses TO service_role;

-- ---------------------------------------------------------------------------
-- Ledger (audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC(28, 12) NOT NULL,
  ref_type TEXT,
  ref_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_user_created_idx ON public.ledger_entries (user_id, created_at DESC);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_select_own" ON public.ledger_entries;
CREATE POLICY "ledger_select_own" ON public.ledger_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_wallet_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.wallets WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_my_wallet()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO wid FROM public.wallets WHERE user_id = auth.uid();
  IF wid IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (auth.uid())
    RETURNING id INTO wid;
    INSERT INTO public.balances (wallet_id, asset, amount) VALUES
      (wid, 'USDT', 2500),
      (wid, 'BTC', 0.05),
      (wid, 'ETH', 1.2),
      (wid, 'SOL', 15),
      (wid, 'BNB', 2),
      (wid, 'XRP', 200)
    ON CONFLICT (wallet_id, asset) DO NOTHING;
  END IF;
  RETURN wid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_balances()
RETURNS TABLE (asset TEXT, amount NUMERIC)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.asset, b.amount
  FROM public.balances b
  JOIN public.wallets w ON w.id = b.wallet_id
  WHERE w.user_id = auth.uid()
  ORDER BY b.asset;
$$;

CREATE OR REPLACE FUNCTION public._adjust_balance(
  p_wallet UUID,
  p_asset TEXT,
  p_delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur NUMERIC;
BEGIN
  INSERT INTO public.balances (wallet_id, asset, amount)
  VALUES (p_wallet, upper(p_asset), 0)
  ON CONFLICT (wallet_id, asset) DO NOTHING;

  SELECT amount INTO cur FROM public.balances
  WHERE wallet_id = p_wallet AND asset = upper(p_asset)
  FOR UPDATE;

  IF cur + p_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient % balance', upper(p_asset);
  END IF;

  UPDATE public.balances
  SET amount = cur + p_delta, updated_at = now()
  WHERE wallet_id = p_wallet AND asset = upper(p_asset);
END;
$$;

-- Credit demo deposit (paper funds)
CREATE OR REPLACE FUNCTION public.credit_demo_balance(
  p_asset TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid UUID;
  asset TEXT := upper(trim(p_asset));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF asset IS NULL OR asset = '' THEN RAISE EXCEPTION 'Asset required'; END IF;

  wid := public.ensure_my_wallet();
  PERFORM public._adjust_balance(wid, asset, p_amount);

  INSERT INTO public.ledger_entries (user_id, kind, asset, amount, meta)
  VALUES (auth.uid(), 'demo_credit', asset, p_amount, jsonb_build_object('source', 'deposit_ui'));

  RETURN jsonb_build_object('ok', true, 'asset', asset, 'amount', p_amount);
END;
$$;

-- Instant swap
CREATE OR REPLACE FUNCTION public.execute_swap(
  p_send_asset TEXT,
  p_recv_asset TEXT,
  p_send_amount NUMERIC,
  p_recv_amount NUMERIC,
  p_fee_amount NUMERIC DEFAULT 0,
  p_rate NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid UUID;
  send_a TEXT := upper(trim(p_send_asset));
  recv_a TEXT := upper(trim(p_recv_asset));
  sid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF send_a = recv_a THEN RAISE EXCEPTION 'Assets must differ'; END IF;
  IF p_send_amount IS NULL OR p_send_amount <= 0 THEN RAISE EXCEPTION 'Invalid send amount'; END IF;
  IF p_recv_amount IS NULL OR p_recv_amount <= 0 THEN RAISE EXCEPTION 'Invalid receive amount'; END IF;

  wid := public.ensure_my_wallet();
  PERFORM public._adjust_balance(wid, send_a, -p_send_amount);
  PERFORM public._adjust_balance(wid, recv_a, p_recv_amount);

  INSERT INTO public.swaps (user_id, send_asset, recv_asset, send_amount, recv_amount, fee_amount, rate)
  VALUES (auth.uid(), send_a, recv_a, p_send_amount, p_recv_amount, COALESCE(p_fee_amount, 0), p_rate)
  RETURNING id INTO sid;

  INSERT INTO public.ledger_entries (user_id, kind, asset, amount, ref_type, ref_id, meta)
  VALUES
    (auth.uid(), 'swap_out', send_a, -p_send_amount, 'swap', sid, '{}'::jsonb),
    (auth.uid(), 'swap_in', recv_a, p_recv_amount, 'swap', sid, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'swap_id', sid);
END;
$$;

-- Place filled spot/futures order (demo immediate fill)
CREATE OR REPLACE FUNCTION public.place_order(
  p_side TEXT,
  p_market_type TEXT,
  p_pair TEXT,
  p_order_type TEXT,
  p_price NUMERIC,
  p_amount NUMERIC,
  p_base_asset TEXT,
  p_quote_asset TEXT DEFAULT 'USDT'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid UUID;
  oid UUID;
  side TEXT := lower(p_side);
  base TEXT := upper(trim(p_base_asset));
  quote TEXT := upper(trim(COALESCE(p_quote_asset, 'USDT')));
  px NUMERIC := COALESCE(p_price, 0);
  qty NUMERIC := p_amount;
  cost NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF qty IS NULL OR qty <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF px <= 0 THEN RAISE EXCEPTION 'Invalid price'; END IF;

  wid := public.ensure_my_wallet();
  cost := px * qty;

  IF side IN ('buy', 'long') THEN
    PERFORM public._adjust_balance(wid, quote, -cost);
    IF side = 'buy' THEN
      PERFORM public._adjust_balance(wid, base, qty);
    END IF;
  ELSIF side IN ('sell', 'short') THEN
    IF side = 'sell' THEN
      PERFORM public._adjust_balance(wid, base, -qty);
    END IF;
    PERFORM public._adjust_balance(wid, quote, cost);
  ELSE
    RAISE EXCEPTION 'Invalid side';
  END IF;

  INSERT INTO public.orders (user_id, side, market_type, pair, order_type, price, amount, status, meta)
  VALUES (
    auth.uid(),
    side,
    COALESCE(p_market_type, 'spot'),
    p_pair,
    COALESCE(p_order_type, 'market'),
    px,
    qty,
    'filled',
    jsonb_build_object('base', base, 'quote', quote)
  )
  RETURNING id INTO oid;

  INSERT INTO public.ledger_entries (user_id, kind, asset, amount, ref_type, ref_id, meta)
  VALUES (auth.uid(), 'order_' || side, base, CASE WHEN side IN ('buy','long') THEN qty ELSE -qty END, 'order', oid,
    jsonb_build_object('pair', p_pair, 'price', px));

  RETURN jsonb_build_object('ok', true, 'order_id', oid);
END;
$$;

-- Stake / unstake
CREATE OR REPLACE FUNCTION public.open_stake(
  p_asset TEXT,
  p_amount NUMERIC,
  p_plan TEXT DEFAULT 'flexible',
  p_apr NUMERIC DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wid UUID;
  sid UUID;
  asset TEXT := upper(trim(p_asset));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  wid := public.ensure_my_wallet();
  PERFORM public._adjust_balance(wid, asset, -p_amount);

  INSERT INTO public.stakes (user_id, asset, amount, plan_label, apr, status)
  VALUES (auth.uid(), asset, p_amount, p_plan, COALESCE(p_apr, 5), 'active')
  RETURNING id INTO sid;

  INSERT INTO public.ledger_entries (user_id, kind, asset, amount, ref_type, ref_id)
  VALUES (auth.uid(), 'stake_lock', asset, -p_amount, 'stake', sid);

  RETURN jsonb_build_object('ok', true, 'stake_id', sid);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_stake(p_stake_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  wid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO s FROM public.stakes
  WHERE id = p_stake_id AND user_id = auth.uid() AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Stake not found'; END IF;

  wid := public.ensure_my_wallet();
  PERFORM public._adjust_balance(wid, s.asset, s.amount);

  UPDATE public.stakes
  SET status = 'closed', closed_at = now()
  WHERE id = s.id;

  INSERT INTO public.ledger_entries (user_id, kind, asset, amount, ref_type, ref_id)
  VALUES (auth.uid(), 'stake_unlock', s.asset, s.amount, 'stake', s.id);

  RETURN jsonb_build_object('ok', true, 'stake_id', s.id);
END;
$$;

-- Grants on RPCs
GRANT EXECUTE ON FUNCTION public.ensure_my_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_wallet_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_demo_balance(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_swap(TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_stake(TEXT, NUMERIC, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_stake(UUID) TO authenticated;

-- Lock down internal helpers
REVOKE ALL ON FUNCTION public._adjust_balance(UUID, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_wunnax_user() FROM PUBLIC, anon, authenticated;

-- Done
SELECT 'Wunnaxswap Supabase backend applied' AS status;

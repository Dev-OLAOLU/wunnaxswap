/**
 * Wunnaxswap Supabase client layer.
 * Requires: @supabase/supabase-js (CDN) + supabase-config.js
 * Falls back gracefully when not configured.
 */
(function (global) {
  var client = null;
  var ready = false;
  var sessionUser = null;

  function cfg() {
    return global.WUNNAX_SUPABASE || {};
  }

  function enabled() {
    return typeof global.WUNNAX_SUPABASE_ENABLED === "function"
      ? global.WUNNAX_SUPABASE_ENABLED()
      : !!(cfg().url && cfg().anonKey);
  }

  function getClient() {
    if (!enabled()) return null;
    if (client) return client;
    if (!global.supabase || !global.supabase.createClient) {
      console.warn("[WunnaxBackend] supabase-js not loaded");
      return null;
    }
    client = global.supabase.createClient(cfg().url, cfg().anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return client;
  }

  function mapProfile(user, profile) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || (profile && profile.email) || "",
      name:
        (profile && profile.display_name) ||
        (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
        (user.email ? user.email.split("@")[0] : "Trader"),
      provider: (user.app_metadata && user.app_metadata.provider) || "email",
      avatar_url: (profile && profile.avatar_url) || null,
      kyc_status: (profile && profile.kyc_status) || "none",
      backend: "supabase",
    };
  }

  async function init() {
    var sb = getClient();
    if (!sb) {
      ready = true;
      return { enabled: false };
    }
    var res = await sb.auth.getSession();
    var session = res.data && res.data.session;
    if (session && session.user) {
      sessionUser = session.user;
      await ensureWallet();
    }
    sb.auth.onAuthStateChange(function (event, sess) {
      sessionUser = sess && sess.user ? sess.user : null;
      if (sessionUser) ensureWallet().catch(function () {});
      document.dispatchEvent(
        new CustomEvent("wunna:auth", { detail: { event: event, user: sessionUser } })
      );
    });
    ready = true;
    return { enabled: true, user: sessionUser };
  }

  async function signUp(email, password, name) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name || email.split("@")[0] } },
    });
    if (res.error) throw res.error;
    sessionUser = res.data.user;
    if (res.data.session) await ensureWallet();
    return res.data;
  }

  async function signIn(email, password) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    sessionUser = res.data.user;
    await ensureWallet();
    return res.data;
  }

  async function signInWithOAuth(provider) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "") + "profile/wallet.html" },
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    var sb = getClient();
    if (!sb) return;
    await sb.auth.signOut();
    sessionUser = null;
  }

  async function getSessionUser() {
    var sb = getClient();
    if (!sb) return null;
    var res = await sb.auth.getUser();
    if (res.error || !res.data.user) return null;
    sessionUser = res.data.user;
    var prof = await sb.from("profiles").select("*").eq("id", sessionUser.id).maybeSingle();
    return mapProfile(sessionUser, prof.data);
  }

  function isAuthed() {
    return !!sessionUser;
  }

  async function ensureWallet() {
    var sb = getClient();
    if (!sb || !sessionUser) return null;
    var res = await sb.rpc("ensure_my_wallet");
    if (res.error) throw res.error;
    return res.data;
  }

  async function getBalancesMap() {
    var sb = getClient();
    if (!sb || !sessionUser) return null;
    var res = await sb.rpc("get_my_balances");
    if (res.error) throw res.error;
    var map = {};
    (res.data || []).forEach(function (row) {
      map[row.asset] = Number(row.amount);
    });
    return map;
  }

  async function creditDemo(asset, amount) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.rpc("credit_demo_balance", {
      p_asset: asset,
      p_amount: amount,
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function executeSwap(send, recv, sendAmt, recvAmt, fee, rate) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.rpc("execute_swap", {
      p_send_asset: send,
      p_recv_asset: recv,
      p_send_amount: sendAmt,
      p_recv_amount: recvAmt,
      p_fee_amount: fee || 0,
      p_rate: rate,
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function placeOrder(opts) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.rpc("place_order", {
      p_side: opts.side,
      p_market_type: opts.marketType || "spot",
      p_pair: opts.pair,
      p_order_type: opts.orderType || "market",
      p_price: opts.price,
      p_amount: opts.amount,
      p_base_asset: opts.baseAsset,
      p_quote_asset: opts.quoteAsset || "USDT",
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function listOrders(limit) {
    var sb = getClient();
    if (!sb || !sessionUser) return [];
    var res = await sb
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit || 50);
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function openStake(asset, amount, plan, apr) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.rpc("open_stake", {
      p_asset: asset,
      p_amount: amount,
      p_plan: plan || "flexible",
      p_apr: apr || 5,
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function closeStake(stakeId) {
    var sb = getClient();
    if (!sb) throw new Error("Supabase not configured");
    var res = await sb.rpc("close_stake", { p_stake_id: stakeId });
    if (res.error) throw res.error;
    return res.data;
  }

  async function listStakes() {
    var sb = getClient();
    if (!sb || !sessionUser) return [];
    var res = await sb
      .from("stakes")
      .select("*")
      .eq("status", "active")
      .order("started_at", { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function getFavorites() {
    var sb = getClient();
    if (!sb || !sessionUser) return [];
    var res = await sb.from("favorites").select("symbol");
    if (res.error) throw res.error;
    return (res.data || []).map(function (r) {
      return r.symbol;
    });
  }

  async function toggleFavorite(symbol) {
    var sb = getClient();
    if (!sb || !sessionUser) throw new Error("Not authenticated");
    var existing = await sb
      .from("favorites")
      .select("symbol")
      .eq("user_id", sessionUser.id)
      .eq("symbol", symbol)
      .maybeSingle();
    if (existing.data) {
      await sb.from("favorites").delete().eq("user_id", sessionUser.id).eq("symbol", symbol);
    } else {
      await sb.from("favorites").insert({ user_id: sessionUser.id, symbol: symbol });
    }
    return getFavorites();
  }

  async function saveDepositAddress(asset, network, address) {
    var sb = getClient();
    if (!sb || !sessionUser) throw new Error("Not authenticated");
    var res = await sb.from("deposit_addresses").insert({
      user_id: sessionUser.id,
      asset: asset,
      network: network || "demo",
      address: address,
    });
    if (res.error) throw res.error;
    return true;
  }

  global.WunnaxBackend = {
    enabled: enabled,
    init: init,
    isReady: function () {
      return ready;
    },
    getClient: getClient,
    signUp: signUp,
    signIn: signIn,
    signInWithOAuth: signInWithOAuth,
    signOut: signOut,
    getSessionUser: getSessionUser,
    isAuthed: isAuthed,
    ensureWallet: ensureWallet,
    getBalancesMap: getBalancesMap,
    creditDemo: creditDemo,
    executeSwap: executeSwap,
    placeOrder: placeOrder,
    listOrders: listOrders,
    openStake: openStake,
    closeStake: closeStake,
    listStakes: listStakes,
    getFavorites: getFavorites,
    toggleFavorite: toggleFavorite,
    saveDepositAddress: saveDepositAddress,
  };
})(window);

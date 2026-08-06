/**
 * Wunnaxswap site-wide i18n
 * Persist language in localStorage → apply to all pages + shell.
 */
(function (global) {
  "use strict";

  var STORAGE = "wunnax_lang";

  var LANGS = [
    { code: "en", label: "English", native: "English", dir: "ltr" },
    { code: "es", label: "Spanish", native: "Español", dir: "ltr" },
    { code: "fr", label: "French", native: "Français", dir: "ltr" },
    { code: "zh", label: "Chinese", native: "中文", dir: "ltr" },
    { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
    { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
    { code: "pt", label: "Portuguese", native: "Português", dir: "ltr" },
    { code: "de", label: "German", native: "Deutsch", dir: "ltr" },
    { code: "ja", label: "Japanese", native: "日本語", dir: "ltr" },
    { code: "ko", label: "Korean", native: "한국어", dir: "ltr" },
  ];

  /** English source (also fallback) */
  var EN = {
    // Nav / shell
    nav_markets: "Markets",
    nav_trade: "Trade ▾",
    nav_spot: "Spot Terminal",
    nav_futures: "Crypto Futures",
    nav_derivatives_desk: "Derivatives Desk",
    nav_swap: "Instant Swap",
    nav_arbitrage: "Arbitrage Scanner",
    nav_derivatives: "Derivatives",
    nav_earn: "Earn",
    nav_tools: "Tools ▾",
    nav_market_cap: "Market Cap",
    nav_screener: "Market Screener",
    nav_cross: "Cross Rates",
    nav_heatmap: "Heat Map",
    nav_technical: "Technical Analysis",
    nav_fees: "Fees",
    nav_about: "About",
    nav_contact: "Contact",
    nav_home: "Home",
    nav_faq: "FAQ",
    nav_wallet: "Wallet",
    nav_account: "Account",
    nav_logout: "Log out",
    nav_signin: "Sign In",
    nav_signup: "Sign Up",
    nav_menu: "Menu",
    footer_tagline: "Buy & sell crypto smarter. Arbitrage-aware rates, transparent fees, and tools built for everyday traders.",
    footer_products: "Products",
    footer_tools: "Tools",
    footer_company: "Company",
    footer_legal: "Legal",
    footer_copy: "Wunnaxswap. Demo frontend.",
    footer_built: "Built for cheaper buy/sell discovery & transparent crypto tools.",

    // Common
    lang: "Language",
    help: "Help",
    or: "or",
    loading: "Loading…",

    // Home
    home_pill: "◆ Crypto · FX · Indices · Commodities · Transparent demo fees",
    home_h1_a: "Trade crypto & ",
    home_h1_b: "derivatives",
    home_lead:
      "Wunnaxswap helps you find smarter crypto prices — and now go long/short FX, indices, gold, oil, and crypto perps on one derivatives desk.",
    home_start: "Start trading",
    home_wallet: "Wallet",
    home_deriv: "Derivatives desk",
    home_markets: "Browse markets",
    home_stat_countries: "Countries welcome",
    home_stat_pairs: "Trading pairs",
    home_stat_fees: "VIP maker fees",
    home_stat_live: "Demo markets live",
    home_trending: "Trending now",
    home_trade_btc: "Trade BTC",
    home_gold: "Gold perp",
    home_swap: "Instant swap",
    home_why: "Why traders choose Wunnaxswap",
    home_why_sub: "Everything you need to buy, sell, route, and earn — without opaque pricing.",
    home_feat_arb: "Arbitrage discovery",
    home_feat_arb_p: "Scan multi-exchange quotes to spot cheaper buys and higher sells in seconds.",
    home_feat_swap: "Instant swap desk",
    home_feat_swap_p: "Convert assets with live demo rates, clear fees, and one-tap execution in your wallet.",
    home_feat_earn: "Earn while you hold",
    home_feat_earn_p: "Flexible and fixed staking plans with transparent APRs. Lending is on the roadmap.",
    home_feat_tools: "Pro-style tools",
    home_feat_tools_p: "Market cap, screener, cross rates, heat map, and technical signals in one toolkit.",
    home_feat_sec: "Security-first UX",
    home_feat_sec_p: "2FA flows, KYC guidance, session controls, and compliance pages built in.",
    home_feat_deriv: "Derivatives desk",
    home_feat_deriv_p: "Long/short FX, indices, commodities, and crypto perps with leverage, funding, and desk AI chat.",
    home_explore: "Explore products",
    home_explore_sub: "Trade on your terms — spot, swap, earn, and arbitrage in one brand.",
    home_view_markets: "View all markets",
    home_spot_h: "Spot trading terminal",
    home_spot_p: "Order book, live chart, market/limit tickets, and order history — demo balances included.",
    home_go_trade: "Go trading",
    home_buy_h: "Buy & sell made simple",
    home_buy_p: "Deposit major coins with clear minimums and commissions, then swap or trade immediately.",
    home_deposit: "Deposit",
    home_roadmap: "Product roadmap",
    home_roadmap_sub: "Present features ship in-browser today. Future modules are marked and interactive via waitlists.",
    home_moving_kicker: "Live markets · Crypto & derivatives",
    home_moving_line1: "The market's moving,",
    home_moving_line2: "are you?",
    home_open_account: "Open an Account",
    home_login: "Log in",
    home_coverage: "Coverage",
    home_supported: "Supported exchanges & coins",
    home_supported_p: "Market coverage for swap, arbitrage, and deposit flows on Wunnaxswap.",
    home_browse_all: "Browse all markets",
    home_exchanges: "Supported exchanges",
    home_coins: "Supported coins",

    // Login
    login_title: "Log in | Wunnaxswap",
    login_help: "Help",
    login_tagline_1: "Discover optimal entries.",
    login_tagline_2: "Maximize every exit.",
    login_sub:
      "Wunnaxswap is built for professional arbitrage — compare multi-venue liquidity, identify spreads, and route orders where pricing works in your favor.",
    login_arb_live: "Arbitrage scanner",
    login_tab_spreads: "Spreads",
    login_tab_routes: "Routes",
    login_foot: "Multi-venue intelligence · Real-time spreads",
    login_open_scanner: "Open scanner →",
    login_welcome: "Welcome back",
    login_welcome_sub: "Sign in to access the arbitrage scanner and professional trading suite",
    login_google: "Log in with Google",
    login_email: "Email",
    login_email_ph: "Email or username",
    login_password: "Password",
    login_password_ph: "Password",
    login_forgot: "Forgot password?",
    login_submit: "Log in",
    login_no_account: "Don't have an account yet?",
    login_signup: "Sign up",
    login_ask: "Ask WX",
    login_support: "Support",
    login_support_p: "Need help signing in? After login you can run the multi-venue arbitrage scanner. Use email, Google, or reset password.",
    login_reset: "Reset password",
    login_contact: "Contact",

    // Signup
    signup_title: "Create account",
    signup_sub: "Pick email + password (min 6 chars). Success → home page.",
    signup_name: "Full name",
    signup_email: "Email",
    signup_pass: "Create password",
    signup_pass2: "Confirm password",
    signup_terms: "I agree to the Terms",
    signup_submit: "Create account",
    signup_have: "Already have an account?",
    signup_signin: "Sign in",
    signup_google: "Continue with Google",

    // Auth generic
    auth_signing_in: "Signing in…",
    auth_login_ok: "Login successful",
    auth_opening_home: "Opening home page…",

    // Arbitrage / product
    arb_title: "Arbitrage",
    toast_lang: "Language updated",
  };

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  /** Partial overrides per language (fallback to EN) */
  var PACKS = {
    en: EN,
    es: Object.assign(clone(EN), {
      nav_markets: "Mercados",
      nav_trade: "Operar ▾",
      nav_spot: "Terminal Spot",
      nav_futures: "Futuros cripto",
      nav_derivatives_desk: "Mesa de derivados",
      nav_swap: "Swap instantáneo",
      nav_arbitrage: "Escáner de arbitraje",
      nav_derivatives: "Derivados",
      nav_earn: "Ganar",
      nav_tools: "Herramientas ▾",
      nav_fees: "Comisiones",
      nav_about: "Acerca de",
      nav_contact: "Contacto",
      nav_home: "Inicio",
      nav_faq: "FAQ",
      nav_wallet: "Cartera",
      nav_account: "Cuenta",
      nav_logout: "Cerrar sesión",
      nav_signin: "Iniciar sesión",
      nav_signup: "Registrarse",
      nav_menu: "Menú",
      lang: "Idioma",
      help: "Ayuda",
      or: "o",
      home_h1_a: "Opera cripto y ",
      home_h1_b: "derivados",
      home_lead:
        "Wunnaxswap te ayuda a encontrar mejores precios de cripto — y ahora ir long/short en FX, índices, oro, petróleo y perps en un solo escritorio.",
      home_start: "Empezar a operar",
      home_wallet: "Cartera",
      home_deriv: "Mesa de derivados",
      home_markets: "Ver mercados",
      home_trending: "Tendencias",
      home_why: "Por qué elegir Wunnaxswap",
      home_explore: "Explorar productos",
      home_open_account: "Abrir una cuenta",
      home_login: "Iniciar sesión",
      home_moving_line1: "El mercado se mueve,",
      home_moving_line2: "¿y tú?",
      home_supported: "Exchanges y monedas compatibles",
      login_tagline_1: "Descubre entradas óptimas.",
      login_tagline_2: "Maximiza cada salida.",
      login_sub:
        "Wunnaxswap está diseñado para arbitraje profesional: compara liquidez multi-venue, identifica spreads y enruta órdenes donde el precio te favorece.",
      login_arb_live: "Escáner de arbitraje",
      login_tab_spreads: "Spreads",
      login_tab_routes: "Rutas",
      login_foot: "Inteligencia multi-venue · Spreads en tiempo real",
      login_open_scanner: "Abrir escáner →",
      login_welcome: "Bienvenido de nuevo",
      login_welcome_sub: "Inicia sesión para acceder al escáner de arbitraje y la suite profesional",
      login_google: "Iniciar con Google",
      login_email: "Correo",
      login_password: "Contraseña",
      login_forgot: "¿Olvidaste la contraseña?",
      login_submit: "Iniciar sesión",
      login_no_account: "¿Aún no tienes cuenta?",
      login_signup: "Regístrate",
      signup_title: "Crear cuenta",
      signup_submit: "Crear cuenta",
      signup_have: "¿Ya tienes cuenta?",
      signup_signin: "Iniciar sesión",
      auth_login_ok: "Inicio de sesión correcto",
      toast_lang: "Idioma actualizado",
    }),
    fr: Object.assign(clone(EN), {
      nav_markets: "Marchés",
      nav_trade: "Trader ▾",
      nav_spot: "Terminal Spot",
      nav_futures: "Futures crypto",
      nav_derivatives_desk: "Bureau dérivés",
      nav_swap: "Swap instantané",
      nav_arbitrage: "Scanner d'arbitrage",
      nav_derivatives: "Dérivés",
      nav_earn: "Earn",
      nav_tools: "Outils ▾",
      nav_fees: "Frais",
      nav_about: "À propos",
      nav_contact: "Contact",
      nav_home: "Accueil",
      nav_wallet: "Portefeuille",
      nav_account: "Compte",
      nav_logout: "Déconnexion",
      nav_signin: "Connexion",
      nav_signup: "S'inscrire",
      lang: "Langue",
      help: "Aide",
      or: "ou",
      home_h1_a: "Tradez la crypto & ",
      home_h1_b: "les dérivés",
      home_lead:
        "Wunnaxswap vous aide à trouver de meilleurs prix crypto — et désormais long/short FX, indices, or, pétrole et perps sur un seul bureau.",
      home_start: "Commencer",
      home_deriv: "Bureau dérivés",
      home_markets: "Voir les marchés",
      home_open_account: "Ouvrir un compte",
      home_login: "Connexion",
      home_moving_line1: "Le marché bouge,",
      home_moving_line2: "et vous ?",
      login_tagline_1: "Des entrées optimales.",
      login_tagline_2: "Maximisez chaque sortie.",
      login_sub:
        "Wunnaxswap est conçu pour l'arbitrage professionnel — comparez la liquidité multi-venues, identifiez les spreads et routez là où le prix vous favorise.",
      login_arb_live: "Scanner d'arbitrage",
      login_tab_spreads: "Spreads",
      login_tab_routes: "Routes",
      login_foot: "Intelligence multi-venues · Spreads en temps réel",
      login_open_scanner: "Ouvrir le scanner →",
      login_welcome: "Bon retour",
      login_welcome_sub: "Connectez-vous pour accéder au scanner d'arbitrage et à la suite pro",
      login_google: "Connexion avec Google",
      login_email: "E-mail",
      login_password: "Mot de passe",
      login_forgot: "Mot de passe oublié ?",
      login_submit: "Connexion",
      login_no_account: "Pas encore de compte ?",
      login_signup: "S'inscrire",
      signup_title: "Créer un compte",
      signup_submit: "Créer un compte",
      auth_login_ok: "Connexion réussie",
      toast_lang: "Langue mise à jour",
    }),
    zh: Object.assign(clone(EN), {
      nav_markets: "市场",
      nav_trade: "交易 ▾",
      nav_spot: "现货终端",
      nav_futures: "加密合约",
      nav_derivatives_desk: "衍生品交易台",
      nav_swap: "闪兑",
      nav_arbitrage: "套利扫描",
      nav_derivatives: "衍生品",
      nav_earn: "理财",
      nav_tools: "工具 ▾",
      nav_fees: "费率",
      nav_about: "关于",
      nav_contact: "联系",
      nav_home: "首页",
      nav_wallet: "钱包",
      nav_account: "账户",
      nav_logout: "退出",
      nav_signin: "登录",
      nav_signup: "注册",
      lang: "语言",
      help: "帮助",
      or: "或",
      home_h1_a: "交易加密与",
      home_h1_b: "衍生品",
      home_lead: "Wunnaxswap 帮你发现更优加密报价，并可在同一交易台做多/做空外汇、指数、黄金、原油与永续合约。",
      home_start: "开始交易",
      home_deriv: "衍生品交易台",
      home_markets: "浏览市场",
      home_open_account: "开立账户",
      home_login: "登录",
      home_moving_line1: "市场在动，",
      home_moving_line2: "你呢？",
      login_tagline_1: "发现更优入场。",
      login_tagline_2: "最大化每一次出场。",
      login_sub: "Wunnaxswap 面向专业套利——比较多市场流动性、识别价差，并将订单路由至更有利的价格。",
      login_arb_live: "套利扫描器",
      login_tab_spreads: "价差",
      login_tab_routes: "路径",
      login_foot: "多市场情报 · 实时价差",
      login_open_scanner: "打开扫描器 →",
      login_welcome: "欢迎回来",
      login_welcome_sub: "登录以使用套利扫描器与专业交易套件",
      login_google: "使用 Google 登录",
      login_email: "邮箱",
      login_password: "密码",
      login_forgot: "忘记密码？",
      login_submit: "登录",
      login_no_account: "还没有账户？",
      login_signup: "注册",
      signup_title: "创建账户",
      signup_submit: "创建账户",
      auth_login_ok: "登录成功",
      toast_lang: "语言已更新",
    }),
    ar: Object.assign(clone(EN), {
      nav_markets: "الأسواق",
      nav_trade: "تداول ▾",
      nav_spot: "تداول فوري",
      nav_futures: "عقود العملات",
      nav_derivatives_desk: "مكتب المشتقات",
      nav_swap: "مبادلة فورية",
      nav_arbitrage: "ماسح المراجحة",
      nav_derivatives: "المشتقات",
      nav_earn: "الربح",
      nav_tools: "أدوات ▾",
      nav_fees: "الرسوم",
      nav_about: "حول",
      nav_contact: "اتصل",
      nav_home: "الرئيسية",
      nav_wallet: "المحفظة",
      nav_account: "الحساب",
      nav_logout: "تسجيل الخروج",
      nav_signin: "تسجيل الدخول",
      nav_signup: "إنشاء حساب",
      lang: "اللغة",
      help: "مساعدة",
      or: "أو",
      home_h1_a: "تداول العملات و",
      home_h1_b: "المشتقات",
      home_lead: "تساعدك Wunnaxswap على إيجاد أسعار أفضل للعملات — والشراء/البيع على الفوركس والمؤشرات والذهب والنفط والعقود الدائمة.",
      home_start: "ابدأ التداول",
      home_deriv: "مكتب المشتقات",
      home_markets: "تصفح الأسواق",
      home_open_account: "افتح حسابًا",
      home_login: "تسجيل الدخول",
      home_moving_line1: "السوق يتحرك،",
      home_moving_line2: "هل أنت؟",
      login_tagline_1: "اكتشف أفضل نقاط الدخول.",
      login_tagline_2: "عظّم كل عملية خروج.",
      login_sub: "صُممت Wunnaxswap للمراجحة الاحترافية — قارن السيولة عبر المنصات، حدّد الفروق، ووجّه الأوامر حيث يعمل السعر لصالحك.",
      login_arb_live: "ماسح المراجحة",
      login_tab_spreads: "الفروق",
      login_tab_routes: "المسارات",
      login_foot: "ذكاء متعدد المنصات · فروق لحظية",
      login_open_scanner: "افتح الماسح →",
      login_welcome: "مرحبًا بعودتك",
      login_welcome_sub: "سجّل الدخول للوصول إلى ماسح المراجحة ومجموعة التداول الاحترافية",
      login_google: "تسجيل الدخول عبر Google",
      login_email: "البريد",
      login_password: "كلمة المرور",
      login_forgot: "نسيت كلمة المرور؟",
      login_submit: "تسجيل الدخول",
      login_no_account: "ليس لديك حساب؟",
      login_signup: "إنشاء حساب",
      signup_title: "إنشاء حساب",
      signup_submit: "إنشاء حساب",
      auth_login_ok: "تم تسجيل الدخول بنجاح",
      toast_lang: "تم تحديث اللغة",
    }),
    hi: Object.assign(clone(EN), {
      nav_markets: "बाज़ार",
      nav_trade: "ट्रेड ▾",
      nav_arbitrage: "आर्बिट्राज स्कैनर",
      nav_derivatives: "डेरिवेटिव्स",
      nav_signin: "साइन इन",
      nav_signup: "साइन अप",
      nav_logout: "लॉग आउट",
      nav_wallet: "वॉलेट",
      lang: "भाषा",
      help: "मदद",
      or: "या",
      home_h1_a: "क्रिप्टो और ",
      home_h1_b: "डेरिवेटिव ट्रेड करें",
      home_open_account: "खाता खोलें",
      home_login: "लॉग इन",
      home_moving_line1: "बाज़ार चल रहा है,",
      home_moving_line2: "क्या आप?",
      login_tagline_1: "सर्वोत्तम एंट्री खोजें।",
      login_tagline_2: "हर एग्जिट को अधिकतम करें।",
      login_sub: "Wunnaxswap पेशेवर आर्बिट्राज के लिए बना है — मल्टी-वेन्यू लिक्विडिटी की तुलना करें, स्प्रेड पहचानें, और जहाँ कीमत आपके पक्ष में हो वहाँ ऑर्डर रूट करें।",
      login_arb_live: "आर्बिट्राज स्कैनर",
      login_foot: "मल्टी-वेन्यू इंटेलिजेंस · रीयल-टाइम स्प्रेड",
      login_welcome: "वापसी पर स्वागत है",
      login_welcome_sub: "आर्बिट्राज स्कैनर और प्रोफेशनल ट्रेडिंग सूट के लिए साइन इन करें",
      login_google: "Google से लॉग इन",
      login_email: "ईमेल",
      login_password: "पासवर्ड",
      login_forgot: "पासवर्ड भूल गए?",
      login_submit: "लॉग इन",
      login_no_account: "अभी खाता नहीं है?",
      login_signup: "साइन अप",
      auth_login_ok: "लॉगिन सफल",
      toast_lang: "भाषा अपडेट हुई",
    }),
    pt: Object.assign(clone(EN), {
      nav_markets: "Mercados",
      nav_trade: "Negociar ▾",
      nav_arbitrage: "Scanner de arbitragem",
      nav_derivatives: "Derivativos",
      nav_signin: "Entrar",
      nav_signup: "Cadastrar",
      nav_logout: "Sair",
      nav_wallet: "Carteira",
      lang: "Idioma",
      help: "Ajuda",
      or: "ou",
      home_h1_a: "Negocie cripto e ",
      home_h1_b: "derivativos",
      home_open_account: "Abrir conta",
      home_login: "Entrar",
      home_moving_line1: "O mercado está se movendo,",
      home_moving_line2: "e você?",
      login_tagline_1: "Descubra entradas ideais.",
      login_tagline_2: "Maximize cada saída.",
      login_sub: "Wunnaxswap é feito para arbitragem profissional — compare liquidez multi-venue, identifique spreads e roteie ordens onde o preço favorece você.",
      login_arb_live: "Scanner de arbitragem",
      login_foot: "Inteligência multi-venue · Spreads em tempo real",
      login_welcome: "Bem-vindo de volta",
      login_welcome_sub: "Entre para acessar o scanner de arbitragem e a suíte profissional",
      login_google: "Entrar com Google",
      login_email: "E-mail",
      login_password: "Senha",
      login_forgot: "Esqueceu a senha?",
      login_submit: "Entrar",
      login_no_account: "Ainda não tem conta?",
      login_signup: "Cadastre-se",
      auth_login_ok: "Login bem-sucedido",
      toast_lang: "Idioma atualizado",
    }),
    de: Object.assign(clone(EN), {
      nav_markets: "Märkte",
      nav_trade: "Handel ▾",
      nav_arbitrage: "Arbitrage-Scanner",
      nav_derivatives: "Derivate",
      nav_signin: "Anmelden",
      nav_signup: "Registrieren",
      nav_logout: "Abmelden",
      nav_wallet: "Wallet",
      lang: "Sprache",
      help: "Hilfe",
      or: "oder",
      home_h1_a: "Handle Krypto & ",
      home_h1_b: "Derivate",
      home_open_account: "Konto eröffnen",
      home_login: "Anmelden",
      home_moving_line1: "Der Markt bewegt sich,",
      home_moving_line2: "tust du es?",
      login_tagline_1: "Optimale Einstiege finden.",
      login_tagline_2: "Jeden Ausstieg maximieren.",
      login_sub: "Wunnaxswap ist für professionelle Arbitrage gebaut — Multi-Venue-Liquidität vergleichen, Spreads erkennen und Orders dorthin routen, wo der Preis für Sie arbeitet.",
      login_arb_live: "Arbitrage-Scanner",
      login_foot: "Multi-Venue-Intelligenz · Echtzeit-Spreads",
      login_welcome: "Willkommen zurück",
      login_welcome_sub: "Melden Sie sich an für den Arbitrage-Scanner und die Pro-Trading-Suite",
      login_google: "Mit Google anmelden",
      login_email: "E-Mail",
      login_password: "Passwort",
      login_forgot: "Passwort vergessen?",
      login_submit: "Anmelden",
      login_no_account: "Noch kein Konto?",
      login_signup: "Registrieren",
      auth_login_ok: "Anmeldung erfolgreich",
      toast_lang: "Sprache aktualisiert",
    }),
    ja: Object.assign(clone(EN), {
      nav_markets: "マーケット",
      nav_trade: "取引 ▾",
      nav_arbitrage: "裁定スキャナー",
      nav_derivatives: "デリバティブ",
      nav_signin: "ログイン",
      nav_signup: "登録",
      nav_logout: "ログアウト",
      nav_wallet: "ウォレット",
      lang: "言語",
      help: "ヘルプ",
      or: "または",
      home_h1_a: "暗号資産と",
      home_h1_b: "デリバティブ",
      home_open_account: "口座開設",
      home_login: "ログイン",
      home_moving_line1: "市場は動いている、",
      home_moving_line2: "あなたは？",
      login_tagline_1: "最適なエントリーを。",
      login_tagline_2: "エグジットを最大化。",
      login_sub: "Wunnaxswapはプロフェッショナルな裁定取引向け — マルチ会場の流動性を比較し、スプレッドを特定し、有利な価格へオーダーをルーティングします。",
      login_arb_live: "裁定スキャナー",
      login_foot: "マルチ会場インテリジェンス · リアルタイムスプレッド",
      login_welcome: "おかえりなさい",
      login_welcome_sub: "ログインして裁定スキャナーとプロ向けツールを利用",
      login_google: "Googleでログイン",
      login_email: "メール",
      login_password: "パスワード",
      login_forgot: "パスワードをお忘れですか？",
      login_submit: "ログイン",
      login_no_account: "アカウントをお持ちでない方",
      login_signup: "登録",
      auth_login_ok: "ログイン成功",
      toast_lang: "言語を更新しました",
    }),
    ko: Object.assign(clone(EN), {
      nav_markets: "마켓",
      nav_trade: "거래 ▾",
      nav_arbitrage: "차익 스캐너",
      nav_derivatives: "파생상품",
      nav_signin: "로그인",
      nav_signup: "가입",
      nav_logout: "로그아웃",
      nav_wallet: "지갑",
      lang: "언어",
      help: "도움말",
      or: "또는",
      home_h1_a: "암호화폐 & ",
      home_h1_b: "파생상품 거래",
      home_open_account: "계정 개설",
      home_login: "로그인",
      home_moving_line1: "시장이 움직입니다,",
      home_moving_line2: "당신은?",
      login_tagline_1: "최적의 진입을 찾으세요.",
      login_tagline_2: "모든 청산을 극대화하세요.",
      login_sub: "Wunnaxswap은 전문 차익거래를 위해 설계되었습니다 — 다중 거래소 유동성을 비교하고 스프레드를 파악해 유리한 가격으로 주문을 라우팅합니다.",
      login_arb_live: "차익 스캐너",
      login_foot: "멀티 거래소 인텔리전스 · 실시간 스프레드",
      login_welcome: "다시 오신 것을 환영합니다",
      login_welcome_sub: "차익 스캐너와 프로 트레이딩 스위트에 로그인하세요",
      login_google: "Google로 로그인",
      login_email: "이메일",
      login_password: "비밀번호",
      login_forgot: "비밀번호를 잊으셨나요?",
      login_submit: "로그인",
      login_no_account: "계정이 없으신가요?",
      login_signup: "가입",
      auth_login_ok: "로그인 성공",
      toast_lang: "언어가 변경되었습니다",
    }),
  };

  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE);
      if (saved && PACKS[saved]) return saved;
    } catch (_) {}
    try {
      var nav = (navigator.language || navigator.userLanguage || "en").slice(0, 2).toLowerCase();
      if (PACKS[nav]) return nav;
    } catch (_) {}
    return "en";
  }

  var current = detect();

  function t(key) {
    var pack = PACKS[current] || EN;
    if (pack[key] != null) return pack[key];
    if (EN[key] != null) return EN[key];
    return key;
  }

  function getLang() {
    return current;
  }

  function getLangs() {
    return LANGS.slice();
  }

  function metaFor(code) {
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i].code === code) return LANGS[i];
    }
    return LANGS[0];
  }

  function setDocumentLang(code) {
    var meta = metaFor(code);
    try {
      document.documentElement.lang = code;
      document.documentElement.dir = meta.dir || "ltr";
      document.documentElement.setAttribute("data-lang", code);
      if (document.body) {
        document.body.dir = meta.dir || "ltr";
        document.body.classList.toggle("lang-rtl", meta.dir === "rtl");
      }
    } catch (_) {}
  }

  function apply(root) {
    root = root || document;
    var nodes = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      if (!key) continue;
      var val = t(key);
      var attr = el.getAttribute("data-i18n-attr");
      if (attr) {
        el.setAttribute(attr, val);
      } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        // only placeholder if flagged
        if (el.hasAttribute("data-i18n-placeholder")) {
          el.setAttribute("placeholder", val);
        } else {
          el.value = val;
        }
      } else if (el.hasAttribute("data-i18n-html")) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    }
    var ph = root.querySelectorAll("[data-i18n-placeholder]");
    for (var j = 0; j < ph.length; j++) {
      var pkey = ph[j].getAttribute("data-i18n-placeholder");
      if (pkey) ph[j].setAttribute("placeholder", t(pkey));
    }
    var titles = root.querySelectorAll("[data-i18n-title]");
    for (var k = 0; k < titles.length; k++) {
      var tkey = titles[k].getAttribute("data-i18n-title");
      if (tkey) titles[k].setAttribute("title", t(tkey));
    }
    // document title
    var dt = document.querySelector("title[data-i18n]");
    if (dt) {
      var dtk = dt.getAttribute("data-i18n");
      if (dtk) document.title = t(dtk);
    }
    // sync language pickers
    var sels = document.querySelectorAll("[data-lang-select]");
    for (var s = 0; s < sels.length; s++) {
      try {
        sels[s].value = current;
      } catch (_) {}
    }
    var labels = document.querySelectorAll("[data-lang-label]");
    for (var L = 0; L < labels.length; L++) {
      var m = metaFor(current);
      labels[L].textContent = (m.native || m.code).toUpperCase().slice(0, 2) === m.code.toUpperCase()
        ? m.code.toUpperCase()
        : m.code.toUpperCase();
      // show short code for compact UI
      labels[L].textContent = current.toUpperCase();
    }
  }

  function setLang(code, opts) {
    opts = opts || {};
    if (!PACKS[code]) code = "en";
    current = code;
    try {
      localStorage.setItem(STORAGE, code);
    } catch (_) {}
    setDocumentLang(code);
    apply(document);
    try {
      document.dispatchEvent(
        new CustomEvent("wunnax:lang", { detail: { lang: code } })
      );
    } catch (_) {}
    if (opts.reload) {
      try {
        location.reload();
      } catch (_) {}
    }
    return code;
  }

  function buildSelectHtml(className, opts) {
    opts = opts || {};
    className = className || "wx-lang-select";
    var compact = !!opts.compact || /compact|top/.test(className);
    var wrapClass = "wx-lang-wrap" + (compact ? " wx-lang-wrap--compact" : "");
    var html = '<label class="' + wrapClass + '">';
    if (!compact) {
      html += '<span class="wx-lang-caption" data-i18n="lang">' + t("lang") + "</span>";
    }
    html +=
      '<select class="' +
      className +
      '" data-lang-select aria-label="' +
      t("lang") +
      '">';
    LANGS.forEach(function (L) {
      html +=
        '<option value="' +
        L.code +
        '"' +
        (L.code === current ? " selected" : "") +
        ">" +
        L.native +
        " (" +
        L.code.toUpperCase() +
        ")</option>";
    });
    html += "</select></label>";
    return html;
  }

  function wireSelects(root) {
    root = root || document;
    var sels = root.querySelectorAll("[data-lang-select]");
    for (var i = 0; i < sels.length; i++) {
      (function (sel) {
        if (sel.getAttribute("data-wx-lang-wired") === "1") return;
        sel.setAttribute("data-wx-lang-wired", "1");
        sel.addEventListener("change", function () {
          var code = sel.value;
          setLang(code);
          // soft toast if available
          try {
            if (window.Wunnax && Wunnax.toast) Wunnax.toast(t("toast_lang") + ": " + metaFor(code).native);
          } catch (_) {}
        });
      })(sels[i]);
    }
  }

  function init() {
    setDocumentLang(current);
    apply(document);
    wireSelects(document);
    // Re-apply when shell re-renders
    document.addEventListener("wunnax:lang", function () {
      wireSelects(document);
    });
  }

  global.WunnaxI18n = {
    t: t,
    setLang: setLang,
    getLang: getLang,
    getLangs: getLangs,
    apply: apply,
    init: init,
    wireSelects: wireSelects,
    buildSelectHtml: buildSelectHtml,
    STORAGE: STORAGE,
  };

  // Auto-init early
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);

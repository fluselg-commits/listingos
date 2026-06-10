"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Result = {
  analysis?: Record<string, string | string[] | undefined>;
  listing?: {
    title?: string;
    description?: string;
    hashtags?: string[];
    priceSuggestion?: string;
  };
  usage?: {
    plan: string;
    listings_used: number;
    monthly_limit: number;
  };
  error?: string;
};

type Profile = {
  plan: string;
  monthly_limit: number;
  listings_used: number;
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const transition = { duration: 0.55 };

const prices = [
  {
    name: "Free",
    price: "0 €",
    amount: "5 Listings / Monat",
    text: "Zum Ausprobieren. Genug für gelegentliche Listings.",
    features: ["5 Listings / Monat", "Alle Marken", "DACH-Marktpreise", "Vinted-SEO-Titel"],
  },
  {
    name: "Creator",
    price: "5,99 €",
    amount: "150 Listings / Monat",
    text: "Für regelmäßige Vinted-Reseller.",
    featured: true,
    features: ["150 Listings / Monat", "Preisvorschläge", "SEO-Titel", "Erweiterte Beschreibungen"],
  },
  {
    name: "Power Seller",
    price: "14,99 €",
    amount: "500 Listings / Monat",
    text: "Für große Upload-Sessions und aktive Verkäufer.",
    features: ["500 Listings / Monat", "Preisvorschläge", "Schnellere Generierung", "Priorisierter Support"],
  },
];

const successStories = [
  {
    item: "Blakely Hoodie",
    sold: "Verkauft nach 30 Minuten",
    price: "28,00 €",
    text: "Listing mit optimiertem Titel, klarer Beschreibung und passenden Suchbegriffen erstellt.",
  },
  {
    item: "Halara Hose",
    sold: "Verkauft nach 2 Stunden",
    price: "8,05 €",
    text: "Strukturierte Produktdaten und passende Keywords für bessere Auffindbarkeit.",
  },
  {
    item: "H&M Loose Fit T-Shirt",
    sold: "Verkauft nach 1 Tag",
    price: "11,20 €",
    text: "Cleanes Basic-Listing mit verständlicher Beschreibung und Hashtags.",
  },
];

const faq = [
  {
    q: "Wie funktioniert ListingOS?",
    a: "Du lädst 2–3 Bilder hoch. Die KI erkennt wichtige Produktdaten und erstellt daraus Titel, Beschreibung, Hashtags und eine Preisidee.",
  },
  {
    q: "Welche Bilder brauche ich?",
    a: "Am besten Vorderseite, Rückseite und ein Etikett. Zusatzinfos wie Größe, Zustand oder Material verbessern das Ergebnis.",
  },
  {
    q: "Funktioniert ListingOS nur für Vinted?",
    a: "Die Texte sind aktuell auf Vinted optimiert. Du kannst sie aber auch als Grundlage für andere Plattformen nutzen.",
  },
  {
    q: "Werden meine Bilder gespeichert?",
    a: "Die Bilder werden nur zur Erstellung des Listings verwendet. Eine dauerhafte Speicherung ist in dieser Version nicht vorgesehen.",
  },
];

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [purchasePrice, setPurchasePrice] = useState("12");

  const previews = useMemo(
    () => files.slice(0, 3).map((file) => URL.createObjectURL(file)),
    [files]
  );

  const hashtags = result?.listing?.hashtags?.join(" ") || "";
  const allListing = [
    result?.listing?.title,
    "",
    result?.listing?.description,
    "",
    hashtags,
  ]
    .filter((part) => part !== undefined)
    .join("\n");

  const purchase = Number(purchasePrice.replace(",", ".")) || 0;
  const analysisText = JSON.stringify(result?.analysis || {}).toLowerCase();

  const detectedBrand =
    String(result?.analysis?.brand || result?.analysis?.Marke || "").trim() ||
    "Noch nicht erkannt";
  const detectedCategory =
    String(result?.analysis?.category || result?.analysis?.Kategorie || "").trim() ||
    "Artikel";
  const detectedCondition =
    String(result?.analysis?.condition || result?.analysis?.Zustand || "").trim() ||
    "Noch nicht erkannt";

  const brandBasePrices: Record<string, number> = {
    "stone island": 85,
    "the north face": 42,
    "ralph lauren": 34,
    lacoste: 30,
    carhartt: 32,
    stüssy: 38,
    stussy: 38,
    nike: 28,
    adidas: 24,
    patagonia: 38,
    napapijri: 34,
    champion: 22,
    dickies: 26,
    "tommy hilfiger": 24,
    blakely: 28,
    halara: 14,
    "h&m": 11,
    zara: 14,
    bershka: 12,
    "pull&bear": 12,
  };

  const categoryFactor =
    analysisText.includes("hoodie") || analysisText.includes("pullover")
      ? 1.22
      : analysisText.includes("jacke") || analysisText.includes("jacket")
      ? 1.55
      : analysisText.includes("hose") || analysisText.includes("pants")
      ? 1.08
      : analysisText.includes("polo")
      ? 1.18
      : 1;

  const conditionFactor =
    analysisText.includes("neu")
      ? 1.2
      : analysisText.includes("sehr gut")
      ? 1.08
      : analysisText.includes("gut")
      ? 1
      : analysisText.includes("gebraucht")
      ? 0.86
      : 1;

  const matchedBrand = Object.keys(brandBasePrices).find((brand) =>
    analysisText.includes(brand)
  );
  const marketBase = matchedBrand ? brandBasePrices[matchedBrand] : 18;
  const marketTarget = Math.round(marketBase * categoryFactor * conditionFactor * 100) / 100;

  const targetPrice = result?.analysis
    ? Math.max(6.99, Math.round((marketTarget + 0.49) * 100) / 100)
    : Math.max(6.99, Math.round((purchase * 2.4 + 0.99) * 100) / 100);

  const lowPrice = Math.max(4.99, Math.round(targetPrice * 0.78 * 100) / 100);
  const highPrice = Math.round(targetPrice * 1.28 * 100) / 100;
  const profit = Math.max(0, Math.round((targetPrice - purchase) * 100) / 100);

  function formatEuro(value: number) {
    return (
      value.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €"
    );
  }

  function handleSelectedFiles(selectedFiles: File[]) {
    setFiles(selectedFiles.filter((file) => file.type.startsWith("image/")).slice(0, 3));
    setResult(null);
  }

  function removeFile(indexToRemove: number) {
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== indexToRemove));
    setResult(null);
  }

  function clearFiles() {
    setFiles([]);
    setResult(null);
  }

  async function loadProfile(token: string) {
    const res = await fetch("/api/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data.user?.email) {
      setUserEmail(data.user.email);
    }

    if (data.profile) {
      setProfile(data.profile);
    }
  }

  async function signUp() {
    setAuthLoading(true);
    setAuthMessage("");

    try {
      const { createBrowserSupabaseClient } = await import("../lib/supabaseClient");
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });

      if (error) throw error;

      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
        await loadProfile(data.session.access_token);
        setAuthMessage("Account erstellt und eingeloggt.");
      } else {
        setAuthMessage("Account erstellt. Bitte bestätige deine E-Mail und logge dich danach ein.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Registrierung fehlgeschlagen.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function signIn() {
    setAuthLoading(true);
    setAuthMessage("");

    try {
      const { createBrowserSupabaseClient } = await import("../lib/supabaseClient");
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });

      if (error) throw error;

      const token = data.session?.access_token;

      if (!token) {
        throw new Error("Login fehlgeschlagen.");
      }

      setAccessToken(token);
      await loadProfile(token);
      setAuthMessage("Eingeloggt.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Login fehlgeschlagen.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    const { createBrowserSupabaseClient } = await import("../lib/supabaseClient");
    const supabase = createBrowserSupabaseClient();

    await supabase.auth.signOut();

    setAccessToken("");
    setUserEmail("");
    setProfile(null);
    setAuthMessage("Ausgeloggt.");
  }

  async function analyze() {
    if (!files.length) return;

    if (!accessToken) {
      setResult({ error: "Bitte logge dich ein, bevor du ein Listing erstellst." });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      files.slice(0, 3).forEach((file) => formData.append("images", file));
      formData.append("notes", notes);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (data.usage) {
        setProfile({
          plan: data.usage.plan,
          listings_used: data.usage.listings_used,
          monthly_limit: data.usage.monthly_limit,
        });
      } else if (accessToken) {
        await loadProfile(accessToken);
      }

      setResult(data);
    } catch {
      setResult({ error: "Die Analyse ist fehlgeschlagen." });
    } finally {
      setLoading(false);
    }
  }

  async function copy(label: string, text?: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  }

  const buttonLabel = loading
    ? "Listing wird erstellt ..."
    : accessToken
    ? "📝 Listing erstellen"
    : "🔒 Erst einloggen";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#02040a] font-[var(--font-display)] text-[#f4f7fb] selection:bg-[#d7ff63] selection:text-[#071016]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-48 -top-48 h-[620px] w-[620px] rounded-full bg-[#d7ff63]/16 blur-[160px]" />
        <div className="absolute right-[-240px] top-44 h-[620px] w-[620px] rounded-full bg-[#61e7c5]/10 blur-[180px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(circle_at_top,black,transparent_72%)]" />
      </div>

      <section className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-5 md:px-7 md:py-7">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="sticky top-4 z-40 flex items-center justify-between gap-4 rounded-full border border-white/10 bg-[#02040a]/72 px-4 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-[#d7ff63] text-lg font-black text-[#071016] shadow-[0_0_50px_rgba(215,255,99,0.32)]">
              L
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8fa0b2]">
                AI Reseller System
              </p>
              <h1 className="text-xl font-black tracking-tight">ListingOS</h1>
            </div>
          </div>

          <a
            href="#pricing"
            className="hidden rounded-full bg-[#d7ff63] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#071016] transition hover:scale-105 md:block"
          >
            Preise ansehen
          </a>
        </motion.header>

        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={transition}
          className="rounded-[2rem] border border-white/10 bg-[#101721]/78 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur"
        >
          {accessToken ? (
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ff63]">
                  Eingeloggt
                </p>
                <h2 className="mt-1 break-words text-2xl font-black">{userEmail}</h2>
                <p className="mt-1 text-sm text-[#8fa0b2]">
                  Plan: {profile?.plan || "free"} · genutzt: {profile?.listings_used ?? 0} /{" "}
                  {profile?.monthly_limit ?? 5}
                </p>
              </div>

              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:border-red-300/40 hover:text-red-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ff63]">
                  Kostenlos starten
                </p>
                <h2 className="mt-1 break-words text-2xl font-black">
                  Erstelle dein Konto für 5 kostenlose Listings.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#8fa0b2]">
                  Danach kannst du später auf Creator oder Power Seller upgraden.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  type="email"
                  placeholder="E-Mail"
                  className="rounded-2xl border border-white/10 bg-[#0a1018] px-4 py-3 text-sm text-white outline-none placeholder:text-[#647184] focus:border-[#d7ff63]"
                />
                <input
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  type="password"
                  placeholder="Passwort"
                  className="rounded-2xl border border-white/10 bg-[#0a1018] px-4 py-3 text-sm text-white outline-none placeholder:text-[#647184] focus:border-[#d7ff63]"
                />
                <button
                  type="button"
                  onClick={signIn}
                  disabled={authLoading || !authEmail || !authPassword}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition hover:border-[#d7ff63]/40 disabled:opacity-40"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={signUp}
                  disabled={authLoading || !authEmail || !authPassword}
                  className="rounded-2xl bg-[#d7ff63] px-4 py-3 text-sm font-black text-[#071016] transition hover:scale-[1.02] disabled:opacity-40"
                >
                  Registrieren
                </button>
              </div>

              {authMessage && (
                <p className="rounded-2xl border border-white/10 bg-[#0a1018] p-3 text-sm text-[#aab6c3] lg:col-span-2">
                  {authMessage}
                </p>
              )}
            </div>
          )}
        </motion.section>

        <section className="grid min-h-[calc(100vh-120px)] items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={transition}
            className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#101721]/90 p-5 shadow-[0_34px_120px_rgba(0,0,0,0.52)] backdrop-blur"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d7ff63]/90 to-transparent" />

            <p className="mb-3 inline-flex rounded-full bg-[#d7ff63] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#071016]">
              AI Listing Engine
            </p>
            <h2 className="max-w-2xl break-words text-4xl font-black leading-[0.86] tracking-[-0.055em] md:text-6xl xl:text-7xl">
              VERKAUFE SCHNELLER. NICHT STUNDENLANG LISTINGS SCHREIBEN.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#aab6c3] md:text-base">
              Lade 2–3 Bilder hoch und erhalte in Sekunden Titel, Beschreibung, Hashtags und eine Preisidee für dein Vinted-Listing.
            </p>

            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-[#0a1018] p-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#8fa0b2]">
                  Einkaufspreis für VK-Ziel
                </span>
                <div className="flex items-center rounded-2xl border border-white/10 bg-[#071016] px-4 py-3 focus-within:border-[#d7ff63]">
                  <span className="mr-2 text-xl font-black text-[#d7ff63]">€</span>
                  <input
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="12"
                    className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-[#647184]"
                  />
                </div>
              </label>
              <p className="mt-2 text-xs leading-5 text-[#8fa0b2]">
                Nach der Analyse nutzt ListingOS Marke, Kategorie und Zustand für ein realistisches VK-Ziel.
              </p>
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleSelectedFiles(Array.from(e.dataTransfer.files));
              }}
              className={`mt-6 group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.9rem] border-2 border-dashed p-5 text-center transition hover:scale-[1.01] ${
                isDragging
                  ? "border-[#d7ff63] bg-[#d7ff63]/10 shadow-[0_0_60px_rgba(215,255,99,0.16)]"
                  : "border-white/15 bg-[#0a1018] hover:border-[#d7ff63] hover:bg-[#111a25]"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleSelectedFiles(Array.from(e.target.files || []))}
              />
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#d7ff63] text-3xl text-[#071016] shadow-[0_0_40px_rgba(215,255,99,0.25)]">
                ↑
              </div>
              <p className="text-lg font-black">{isDragging ? "Bilder loslassen" : "Bilder auswählen"}</p>
              <p className="mt-1 text-xs text-[#8fa0b2]">Klicken oder Bilder hier reinziehen</p>
            </label>

            {previews.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8fa0b2]">
                    Hochgeladene Bilder
                  </p>
                  <button
                    type="button"
                    onClick={clearFiles}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#b8c2cc] transition hover:border-red-300/40 hover:text-red-200"
                  >
                    Alle löschen
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {previews.map((src, index) => (
                    <div key={src} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a2330]">
                      <img src={src} alt="Vorschau" className="h-24 w-full object-cover transition duration-500 group-hover:scale-110 md:h-28" />
                      <span className="absolute left-2 top-2 rounded-full bg-[#071016]/90 px-2 py-1 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#071016]/90 text-sm font-black text-white transition hover:bg-red-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-[#8fa0b2]">
                Zusatzinfos optional
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z. B. Größe M, sehr guter Zustand, Baumwolle, keine Mängel ..."
                className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-[#0a1018] p-4 text-sm text-white outline-none transition placeholder:text-[#647184] focus:border-[#d7ff63] focus:shadow-[0_0_0_4px_rgba(215,255,99,0.08)]"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.82fr]">
              <button
                onClick={analyze}
                disabled={loading || !files.length || !accessToken}
                className="group rounded-2xl bg-[#d7ff63] px-5 py-4 text-left text-[#071016] shadow-[0_18px_46px_rgba(215,255,99,0.14)] transition hover:translate-y-[-3px] hover:shadow-[0_28px_72px_rgba(215,255,99,0.24)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="block text-lg font-black">{buttonLabel}</span>
                <span className="mt-1 block text-xs font-bold opacity-80">Titel, Beschreibung, Hashtags & Preisidee</span>
                <span className="mt-3 inline-flex rounded-full bg-[#071016]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                  1 Listing
                </span>
              </button>

              <button
                type="button"
                disabled
                className="relative cursor-not-allowed rounded-2xl border border-white/10 bg-[#0a1018] px-5 py-4 text-left text-[#8fa0b2] opacity-75"
              >
                <span className="absolute right-3 top-3 rounded-full bg-[#d7ff63]/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#d7ff63]">
                  Coming Soon
                </span>
                <span className="block pr-20 text-base font-black text-white">🔍 Legit Check</span>
                <span className="mt-1 block text-xs font-bold">Echtheitsmerkmale analysieren · Beta</span>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ ...transition, delay: 0.12 }}
            className="min-w-0 space-y-4"
          >
            {!result && !loading && (
              <div className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#101721]/80 p-6 shadow-[0_34px_100px_rgba(0,0,0,0.38)] backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8fa0b2]">Live Preview</p>
                <h3 className="mt-3 max-w-md text-3xl font-black leading-tight tracking-[-0.04em]">
                  Dein fertiges Listing erscheint hier.
                </h3>
                <div className="mt-6 grid gap-3">
                  <div className="rounded-3xl border border-[#d7ff63]/20 bg-[#d7ff63]/8 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d7ff63]">Beispiel Output</p>
                    <h4 className="mt-3 text-2xl font-black">H&M T-Shirt Weiß Loose Fit Gr. M</h4>
                    <p className="mt-3 text-sm leading-6 text-[#cdd6df]">
                      Dieses weiße T-Shirt von H&M überzeugt durch seinen cleanen Look und den lässigen Loose Fit...
                    </p>
                  </div>
                  {["Keyword-starker Titel", "Beschreibung mit Bulletpoints", "Hashtags + Preisidee"].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="rounded-[2rem] border border-white/10 bg-[#101721] p-6">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d7ff63]">KI analysiert deine Bilder</p>
                <div className="mt-5 space-y-3">
                  <div className="h-12 animate-pulse rounded-xl bg-[#1a2330]" />
                  <div className="h-32 animate-pulse rounded-xl bg-[#1a2330]" />
                  <div className="h-20 animate-pulse rounded-xl bg-[#1a2330]" />
                </div>
              </div>
            )}

            {result?.error && (
              <div className="rounded-[2rem] border border-red-400/30 bg-red-950/30 p-6 text-red-200">
                <p className="font-black">Fehler</p>
                <p>{result.error}</p>
              </div>
            )}

            {result?.listing && (
              <article className="rounded-[2rem] border border-white/10 bg-[#101721] p-5 shadow-[0_34px_100px_rgba(0,0,0,0.38)]">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8fa0b2]">Fertiges Listing</p>
                    <h3 className="mt-1 text-xl font-black">Bereit für Vinted</h3>
                  </div>
                  <button
                    onClick={() => copy("Alles", allListing)}
                    className="rounded-full bg-[#d7ff63] px-4 py-2 text-sm font-black text-[#071016] transition hover:scale-105"
                  >
                    {copied === "Alles" ? "Kopiert" : "Alles kopieren"}
                  </button>
                </div>

                <section className="rounded-2xl border border-white/8 bg-[#0a1018] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8fa0b2]">Titel</p>
                    <button onClick={() => copy("Titel", result.listing?.title)} className="text-xs font-black text-[#d7ff63] underline">
                      {copied === "Titel" ? "Kopiert" : "Kopieren"}
                    </button>
                  </div>
                  <h3 className="break-words text-2xl font-black leading-tight tracking-[-0.035em]">{result.listing.title}</h3>
                </section>

                <section className="mt-3 rounded-2xl border border-white/8 bg-[#0a1018] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8fa0b2]">Beschreibung</p>
                    <button
                      onClick={() => copy("Beschreibung", result.listing?.description)}
                      className="text-xs font-black text-[#d7ff63] underline"
                    >
                      {copied === "Beschreibung" ? "Kopiert" : "Kopieren"}
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap break-words leading-6 text-[#dbe3ea]">{result.listing.description}</p>
                </section>

                <section className="mt-3 rounded-2xl border border-white/8 bg-[#0a1018] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8fa0b2]">Hashtags</p>
                    <button onClick={() => copy("Hashtags", hashtags)} className="text-xs font-black text-[#d7ff63] underline">
                      {copied === "Hashtags" ? "Kopiert" : "Kopieren"}
                    </button>
                  </div>
                  <p className="break-words leading-6 text-[#dbe3ea]">{hashtags}</p>
                </section>

                {result.listing.priceSuggestion && (
                  <section className="mt-3 rounded-2xl border border-[#d7ff63]/20 bg-[#d7ff63]/8 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8fa0b2]">Preisidee</p>
                    <p className="mt-1 text-lg font-black text-[#d7ff63]">{result.listing.priceSuggestion}</p>
                  </section>
                )}
              </article>
            )}
          </motion.div>
        </section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          transition={transition}
          className="grid gap-4 md:grid-cols-3"
        >
          {[
            {
              title: "⚡ In unter 30 Sekunden fertig",
              text: "Spare dir lange Schreibarbeit und erstelle Listings deutlich schneller.",
            },
            {
              title: "📝 Titel, Beschreibung & Hashtags",
              text: "Alles automatisch generiert und direkt kopierbereit.",
            },
            {
              title: "🎯 Für Vinted entwickelt",
              text: "Optimiert für echte Reseller und Second-Hand-Verkäufer.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] border border-white/10 bg-[#101721]/72 p-6 shadow-[0_18px_76px_rgba(0,0,0,0.26)] backdrop-blur transition hover:translate-y-[-6px] hover:border-[#d7ff63]/45"
            >
              <h3 className="text-2xl font-black tracking-[-0.04em]">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#aab6c3]">{item.text}</p>
            </div>
          ))}
        </motion.section>

        <motion.section
          id="pricing"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[2.4rem] border border-white/10 bg-[#101721]/78 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.3)] backdrop-blur"
        >
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#d7ff63]">Preise</p>
              <h3 className="mt-3 max-w-2xl break-words text-4xl font-black leading-[0.95] tracking-[-0.055em] md:text-5xl">
                Kostenlos starten. Upgrade, wenn du mehr brauchst.
              </h3>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#aab6c3]">
              Free zum Testen. Creator und Power Seller werden nach Stripe-Anbindung aktiviert.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {prices.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex min-h-[360px] flex-col rounded-[2rem] border p-6 shadow-[0_24px_90px_rgba(0,0,0,0.3)] transition hover:translate-y-[-5px] ${
                  plan.featured ? "border-[#d7ff63]/40 bg-[#d7ff63]/10" : "border-white/10 bg-[#0a1018]/86"
                }`}
              >
                {plan.featured && (
                  <span className="absolute right-5 top-5 rounded-full bg-[#d7ff63] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#071016]">
                    Beliebt
                  </span>
                )}

                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#8fa0b2]">{plan.name}</p>
                <h4 className="mt-5 break-words text-5xl font-black tracking-[-0.07em]">
                  {plan.price}
                  <span className="ml-2 text-sm font-bold tracking-normal text-[#8fa0b2]">/ Monat</span>
                </h4>
                <p className="mt-3 text-lg font-black text-[#d7ff63]">{plan.amount}</p>
                <p className="mt-4 text-sm leading-6 text-[#aab6c3]">{plan.text}</p>

                <div className="mt-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm font-bold text-[#cdd6df]">
                      <span className="text-[#61e7c5]">✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={`mt-auto rounded-full px-5 py-3 text-sm font-black transition hover:scale-[1.02] ${
                    plan.featured
                      ? "bg-[#d7ff63] text-[#071016]"
                      : "border border-white/10 bg-white/[0.04] text-white hover:border-[#d7ff63]/40"
                  }`}
                >
                  {plan.name === "Free" ? "Kostenlos starten" : "Bald verfügbar"}
                </button>

                {plan.name === "Free" && (
                  <p className="mt-3 text-center text-xs font-bold text-[#647184]">Keine Kreditkarte · sofort nutzbar</p>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          transition={transition}
          className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        >
          <div className="rounded-[2.4rem] border border-white/10 bg-[#101721]/78 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.3)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#d7ff63]">Verkaufsziel</p>
            <h3 className="mt-3 max-w-xl break-words text-4xl font-black leading-[0.95] tracking-[-0.055em] md:text-5xl">
              Wie viel Gewinn ist möglich?
            </h3>
            <p className="mt-4 text-sm leading-6 text-[#aab6c3]">
              Nach dem Hochladen erkennt ListingOS Marke, Kategorie und Zustand. Daraus entsteht zusammen mit deinem Einkaufspreis ein realistisches Verkaufsziel.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a1018] p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8fa0b2]">Aktueller Einkaufspreis</p>
              <p className="mt-2 text-3xl font-black text-[#d7ff63]">{formatEuro(purchase)}</p>
              <p className="mt-2 text-xs leading-5 text-[#8fa0b2]">Du kannst den EK oben im Hero ändern.</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2.4rem] border border-[#d7ff63]/25 bg-[#062016]/80 p-6 shadow-[0_24px_100px_rgba(215,255,99,0.08)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(215,255,99,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(215,255,99,0.055)_1px,transparent_1px)] bg-[size:34px_34px]" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#61e7c5]">✣ VK Ziel</p>

              <div className="mt-8 flex items-end gap-2">
                <span className="text-4xl font-black text-[#61e7c5]">€</span>
                <p className="break-words text-7xl font-black leading-none tracking-[-0.08em] text-white md:text-8xl">
                  {formatEuro(targetPrice).replace(" €", "")}
                </p>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8fa0b2]">Marke</p>
                  <p className="mt-1 break-words text-sm font-black">{detectedBrand}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8fa0b2]">Kategorie</p>
                  <p className="mt-1 break-words text-sm font-black">{detectedCategory}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8fa0b2]">Zustand</p>
                  <p className="mt-1 break-words text-sm font-black">{detectedCondition}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-[#8fa0b2]">Niedrig</p>
                  <p className="font-black">{formatEuro(lowPrice)}</p>
                </div>
                <div>
                  <p className="text-[#8fa0b2]">Optimal</p>
                  <p className="font-black text-[#d7ff63]">{formatEuro(targetPrice)}</p>
                </div>
                <div>
                  <p className="text-[#8fa0b2]">Hoch</p>
                  <p className="font-black">{formatEuro(highPrice)}</p>
                </div>
                <div>
                  <p className="text-[#8fa0b2]">Gewinn</p>
                  <p className="font-black text-[#61e7c5]">{formatEuro(profit)}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-[#aab6c3]">
                Berechnung nutzt den erkannten Artikel: Marke, Kategorie und Zustand. Aktuell mit interner Start-Datenbank für bekannte Reseller-Marken.
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[2.4rem] border border-white/10 bg-[#101721]/78 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.3)] backdrop-blur"
        >
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#d7ff63]">Mit ListingOS erstellt</p>
          <h3 className="mt-3 max-w-2xl break-words text-4xl font-black leading-[0.95] tracking-[-0.055em] md:text-5xl">
            Echte Listings. Echte Verkäufe.
          </h3>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {successStories.map((story) => (
              <div key={story.item} className="rounded-[2rem] border border-white/10 bg-[#0a1018]/86 p-6 transition hover:translate-y-[-5px] hover:border-[#d7ff63]/45">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8fa0b2]">{story.sold}</p>
                <h4 className="mt-5 text-2xl font-black tracking-[-0.04em]">{story.item}</h4>
                <p className="mt-2 text-3xl font-black text-[#d7ff63]">{story.price}</p>
                <p className="mt-4 text-sm leading-6 text-[#aab6c3]">{story.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[2rem] border border-[#d7ff63]/20 bg-[#d7ff63]/8 p-5 text-center">
            <p className="text-sm font-black text-[#d7ff63]">
              3 echte Verkäufe · Listings mit ListingOS erstellt · verkauft innerhalb von 30 Minuten bis 1 Tag
            </p>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[2.4rem] border border-white/10 bg-[#101721]/78 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.3)] backdrop-blur"
        >
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#d7ff63]">FAQ</p>
          <h3 className="mt-3 max-w-2xl break-words text-4xl font-black leading-[0.95] tracking-[-0.055em] md:text-5xl">
            Kurz erklärt.
          </h3>
          <div className="mt-6 grid gap-3">
            {faq.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-white/10 bg-[#0a1018]/86 p-5">
                <summary className="cursor-pointer list-none text-lg font-black">{item.q}</summary>
                <p className="mt-3 text-sm leading-6 text-[#aab6c3]">{item.a}</p>
              </details>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={fadeUp}
          transition={transition}
          className="rounded-[2.7rem] border border-[#d7ff63]/20 bg-[#d7ff63]/8 p-8 text-center shadow-[0_24px_110px_rgba(215,255,99,0.08)]"
        >
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d7ff63]">Bereit?</p>
          <h3 className="mx-auto mt-4 max-w-4xl break-words text-4xl font-black leading-[0.9] tracking-[-0.06em] md:text-6xl">
            WARUM SCHREIBST DU DEINE LISTINGS NOCH SELBST?
          </h3>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[#cdd6df]">
            Erstelle dein nächstes Vinted-Listing in weniger als einer Minute.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-6 rounded-full bg-[#d7ff63] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#071016] transition hover:scale-105"
          >
            Jetzt kostenlos testen
          </button>
        </motion.section>

        <footer className="pb-8 pt-2 text-center text-xs font-bold uppercase tracking-[0.25em] text-[#566272]">
          ListingOS · Built for Vinted Resellers
        </footer>
      </section>
    </main>
  );
}

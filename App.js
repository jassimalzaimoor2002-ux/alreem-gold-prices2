import React, { useEffect, useMemo, useRef, useState } from "react";

const TROY_OUNCE_TO_GRAMS = 31.1034768;

function fmtBHD(n) {
  if (n == null || isNaN(n)) return "–";
  return new Intl.NumberFormat("en-BH", { style: "currency", currency: "BHD", maximumFractionDigits: 3 }).format(n);
}

function useInterval(callback, delay) {
  const savedRef = useRef(callback);
  useEffect(() => { savedRef.current = callback }, [callback]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => savedRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default function AlReemGoldPrice() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [intervalSec, setIntervalSec] = useState(60);
  const [perGram24k, setPerGram24k] = useState(null);

  const purity = useMemo(() => ({
    24: 1,
    22: 22/24,
    21: 21/24,
    18: 18/24,
  }), []);

  const fetchSpot = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = "https://api.exchangerate.host/latest?base=XAU&symbols=BHD";
      const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const bhdPerXAU = data?.rates?.BHD;
      if (!bhdPerXAU || isNaN(bhdPerXAU)) throw new Error("Unexpected API response");
      const bhdPerGramPure = bhdPerXAU / TROY_OUNCE_TO_GRAMS;
      setPerGram24k(bhdPerGramPure);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSpot(); }, []);
  useInterval(() => fetchSpot(), Math.max(5, intervalSec) * 1000);

  const karatPrices = useMemo(() => {
    if (perGram24k == null) return null;
    return {
      24: perGram24k * purity[24],
      22: perGram24k * purity[22],
      21: perGram24k * purity[21],
      18: perGram24k * purity[18],
    };
  }, [perGram24k, purity]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", padding: "20px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>AlReem Gold Price</h1>
      <p>Live per-gram prices in Bahraini Dinar • 24k, 22k, 21k, 18k</p>
      <button onClick={fetchSpot} disabled={loading}>
        {loading ? "Updating…" : "Refresh"}
      </button>
      {lastUpdated && <p>Last updated: {lastUpdated.toLocaleString()}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginTop: "20px" }}>
        {[24,22,21,18].map((k) => (
          <div key={k} style={{ background: "#1e293b", padding: "10px", borderRadius: "10px" }}>
            <div>{k} Karat</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{fmtBHD(karatPrices?.[k])} / g</div>
          </div>
        ))}
      </div>
    </div>
  );
}

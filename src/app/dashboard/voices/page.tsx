"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Voice = {
  id: string;
  voice_id: string;
  name: string;
  description?: string | null;
  is_default?: boolean;
};

type ApiResponse = {
  default_voices: Voice[];
  cloned_voices: Voice[];
};

export default function VoiceLabPage() {
  const [defaultVoices, setDefaultVoices] = useState<Voice[]>([]);
  const [clonedVoices, setClonedVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [text, setText] = useState("Write something in your own voice and turn it into audio.");
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [sampleName, setSampleName] = useState("");
  const [sampleDescription, setSampleDescription] = useState("");
  const [sampleFiles, setSampleFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/voice/tts");
      if (!res.ok) throw new Error("Failed to load voices");
      const json = (await res.json()) as ApiResponse;
      setDefaultVoices(json.default_voices ?? []);
      setClonedVoices(json.cloned_voices ?? []);
      const initial = json.cloned_voices?.[0]?.voice_id ?? json.default_voices?.[0]?.voice_id ?? "";
      setSelectedVoiceId(prev => prev || initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    return () => {
      if (generatedAudioUrl) URL.revokeObjectURL(generatedAudioUrl);
    };
  }, [generatedAudioUrl]);

  const allVoices = useMemo(() => [...clonedVoices, ...defaultVoices], [clonedVoices, defaultVoices]);

  const handleClone = async () => {
    if (!sampleName.trim() || !sampleFiles || sampleFiles.length === 0) {
      setError("Add a name and at least one audio file.");
      return;
    }
    setCloning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", sampleName.trim());
      if (sampleDescription.trim()) formData.append("description", sampleDescription.trim());
      Array.from(sampleFiles).forEach(file => formData.append("files", file));

      const res = await fetch("/api/ai/voice/clone", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to clone voice");
      setSampleName("");
      setSampleDescription("");
      setSampleFiles(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clone voice");
    } finally {
      setCloning(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedVoiceId || !text.trim()) {
      setError("Select a voice and enter text.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          text,
          stability,
          similarityBoost,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(json.error || "Failed to generate audio");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (generatedAudioUrl) URL.revokeObjectURL(generatedAudioUrl);
      setGeneratedAudioUrl(url);
      setTimeout(() => audioRef.current?.play().catch(() => null), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate audio");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="voice-page">
      <style>{`
        *{box-sizing:border-box}
        .voice-page{min-height:100vh;background:#020203;padding:32px;font-family:var(--font-body,'Outfit',sans-serif);color:rgba(255,255,255,0.88)}
        .top{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px;flex-wrap:wrap}
        .eyebrow{font-family:var(--font-mono,'DM Mono',monospace);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#7a6030;margin-bottom:8px}
        .title{font-family:var(--font-display,'Cormorant Garamond',serif);font-size:clamp(30px,4vw,52px);font-weight:300;line-height:1;margin:0}
        .sub{margin-top:8px;color:rgba(255,255,255,0.32);font-size:13px}
        .btn{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.16em;text-transform:uppercase;border:none;border-radius:3px;padding:10px 14px;cursor:pointer}
        .btn-gold{background:#c8a96e;color:#090603}
        .btn-ghost{background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.55)}
        .layout{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
        @media(max-width:980px){.layout{grid-template-columns:1fr}}
        .card{background:#0f0f1e;border:1px solid rgba(255,255,255,0.055);border-radius:10px;padding:18px}
        .card-label{font-family:var(--font-mono,'DM Mono',monospace);font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.28);margin-bottom:14px}
        .field{width:100%;margin-bottom:12px}
        .input,.textarea,.select{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(255,255,255,0.85);padding:12px 14px;font-family:var(--font-body,'Outfit',sans-serif);font-size:13px;outline:none}
        .textarea{min-height:130px;resize:vertical;line-height:1.7}
        .input:focus,.textarea:focus,.select:focus{border-color:rgba(200,169,110,0.35)}
        .file{width:100%;padding:12px 0;color:rgba(255,255,255,0.55)}
        .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
        .voice-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media(max-width:720px){.voice-list{grid-template-columns:1fr}}
        .voice-btn{padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.75);cursor:pointer;text-align:left;transition:all 0.15s}
        .voice-btn:hover{border-color:rgba(255,255,255,0.12)}
        .voice-btn.active{border-color:rgba(200,169,110,0.25);background:rgba(200,169,110,0.06)}
        .voice-name{font-size:13px;font-weight:500}
        .voice-sub{margin-top:6px;font-size:11px;color:rgba(255,255,255,0.35);font-family:var(--font-mono,'DM Mono',monospace)}
        .error{padding:12px 14px;border-radius:8px;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.16);color:rgba(224,85,85,0.92);margin-bottom:14px;font-size:13px;line-height:1.6}
        .audioWrap{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06)}
      `}</style>

      <div className="top">
        <div>
          <div className="eyebrow">AI Voice Lab</div>
          <h1 className="title">Voice Clone Studio</h1>
          <div className="sub">Clone a creator voice from samples, then generate usable audio with one click.</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => void load()} disabled={loading}>Reload</button>
          <button className="btn btn-gold" onClick={() => void handleGenerate()} disabled={generating || !selectedVoiceId || !text.trim()}>
            {generating ? "Generating..." : "Generate Audio"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="layout">
        <div className="card">
          <div className="card-label">Select Voice</div>
          {loading ? (
            <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Loading voices…</div>
          ) : (
            <div className="voice-list">
              {allVoices.map(v => (
                <button
                  key={v.voice_id}
                  className={`voice-btn ${selectedVoiceId === v.voice_id ? "active" : ""}`}
                  onClick={() => setSelectedVoiceId(v.voice_id)}
                >
                  <div className="voice-name">{v.name}</div>
                  <div className="voice-sub">{v.is_default ? "default voice" : "cloned voice"}</div>
                </button>
              ))}
            </div>
          )}

          <div className="audioWrap">
            <div className="card-label">Text to Speech</div>
            <div className="field">
              <textarea className="textarea" value={text} onChange={e => setText(e.target.value)} placeholder="Write the script you want spoken aloud..." />
            </div>
            <div className="field">
              <label className="card-label" style={{ marginBottom: 8, display: "block" }}>Stability {stability.toFixed(2)}</label>
              <input className="input" type="range" min="0" max="1" step="0.01" value={stability} onChange={e => setStability(Number(e.target.value))} />
            </div>
            <div className="field">
              <label className="card-label" style={{ marginBottom: 8, display: "block" }}>Similarity Boost {similarityBoost.toFixed(2)}</label>
              <input className="input" type="range" min="0" max="1" step="0.01" value={similarityBoost} onChange={e => setSimilarityBoost(Number(e.target.value))} />
            </div>
            {generatedAudioUrl && (
              <div className="field">
                <audio ref={audioRef} controls src={generatedAudioUrl} style={{ width: "100%" }} />
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-label">Clone A Voice</div>
          <div className="field">
            <input className="input" value={sampleName} onChange={e => setSampleName(e.target.value)} placeholder="Voice name" />
          </div>
          <div className="field">
            <textarea className="textarea" value={sampleDescription} onChange={e => setSampleDescription(e.target.value)} placeholder="Optional description of tone, use case, or speaker style." />
          </div>
          <div className="field">
            <input className="file" type="file" accept="audio/*" multiple onChange={e => setSampleFiles(e.target.files)} />
          </div>
          <div className="row">
            <div className="card-label" style={{ margin: 0 }}>{sampleFiles?.length ?? 0} sample file(s)</div>
            <button className="btn btn-gold" onClick={() => void handleClone()} disabled={cloning}>
              {cloning ? "Cloning..." : "Clone Voice"}
            </button>
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="card-label">Cloned Voices</div>
            {clonedVoices.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.22)", fontSize: 13, lineHeight: 1.8 }}>
                No cloned voices yet. Upload 1 or more audio samples to create one.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {clonedVoices.map(v => (
                  <div key={v.id} style={{ padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                    <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.34)", fontFamily: "var(--font-mono,'DM Mono',monospace)" }}>
                      {v.voice_id}
                    </div>
                    {v.description && <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>{v.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

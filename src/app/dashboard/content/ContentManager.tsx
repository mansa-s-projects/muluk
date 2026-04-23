"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

export type ContentItem = {
  id: string;
  title: string;
  description: string;
  type: "image" | "video" | "audio" | "text" | "link";
  status: "draft" | "published" | "scheduled" | "archived";
  price: number;
  isFree: boolean;
  burnMode: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  fileUrl: string | null;
  accessCount: number;
  earnings: number;
  tags: string[];
  fanCodes: string[];
};

export type ContentManagerProps = {
  userId: string;
  initialContent: ContentItem[];
  fanCodes: Array<{ code: string; custom_name: string | null }>;
};

const CONTENT_TYPES = [
  { value: "image", label: "📷 Image", color: "#4cc88c" },
  { value: "video", label: "🎥 Video", color: "#8dcfff" },
  { value: "audio", label: "🎵 Audio", color: "#ff8fb1" },
  { value: "text", label: "📝 Text", color: "#d9b3ff" },
  { value: "link", label: "🔗 Link", color: "#c8a96e" },
];

export function ContentManager({ userId, initialContent, fanCodes }: ContentManagerProps) {
  const [content, setContent] = useState<ContentItem[]>(initialContent);
  const [view, setView] = useState<"grid" | "list" | "calendar">("grid");
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "scheduled" | "archived">("all");
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
  // Content form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "image" as ContentItem["type"],
    price: "0",
    isFree: false,
    burnMode: false,
    expiresIn: "never",
    tags: "",
    selectedFanCodes: [] as string[],
  });
  
  // Edit modal
  const [_editingItem, setEditingItem] = useState<ContentItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const filteredContent = content.filter(item => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesSearch = 
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
      setUploadStep(2);
    }
  };

  const uploadContent = async () => {
    if (uploadFiles.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        
        // Upload file via server API (handles auth + storage reliably)
        setUploadProgress(Math.round((i / uploadFiles.length) * 100));
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "content");
        
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const uploadResult = await res.json();
        if (!res.ok) {
          throw new Error(uploadResult.error ?? `Upload failed (${res.status})`);
        }
        const publicUrl: string = uploadResult.url;
        
        // Create content record
        const { data: newContent, error: dbError } = await supabase
          .from('content_items')
          .insert({
            creator_id: userId,
            title: formData.title || file.name,
            description: formData.description,
            type: formData.type,
            file_url: publicUrl,
            thumbnail_url: formData.type === 'image' ? publicUrl : null,
            price: parseFloat(formData.price) || 0,
            is_free: formData.isFree,
            burn_mode: formData.burnMode,
            expires_at: formData.expiresIn !== 'never' 
              ? new Date(Date.now() + parseInt(formData.expiresIn) * 24 * 60 * 60 * 1000).toISOString()
              : null,
            status: 'published',
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            fan_codes: formData.selectedFanCodes,
          })
          .select()
          .single();
        
        if (dbError) throw new Error(dbError.message ?? "Database error saving content");
        
        setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));
        
        if (newContent) {
          setContent(prev => [{
            id: newContent.id,
            title: newContent.title,
            description: newContent.description || '',
            type: newContent.type,
            status: newContent.status,
            price: newContent.price,
            isFree: newContent.is_free,
            burnMode: newContent.burn_mode,
            expiresAt: newContent.expires_at,
            createdAt: newContent.created_at,
            updatedAt: newContent.updated_at,
            thumbnailUrl: newContent.thumbnail_url,
            fileUrl: newContent.file_url,
            accessCount: 0,
            earnings: 0,
            tags: newContent.tags || [],
            fanCodes: newContent.fan_codes || [],
          }, ...prev]);
        }
      }
      
      setUploadStep(3);
      setTimeout(() => {
        setShowUpload(false);
        setUploadStep(1);
        setUploadFiles([]);
        setFormData({
          title: "",
          description: "",
          type: "image",
          price: "0",
          isFree: false,
          burnMode: false,
          expiresIn: "never",
          tags: "",
          selectedFanCodes: [],
        });
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Upload error:", msg, err);
      alert(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm("Delete this content? This cannot be undone.")) return;
    
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setContent(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete content.");
    }
  };

  const updateContentStatus = async (id: string, status: ContentItem["status"]) => {
    try {
      const { error } = await supabase
        .from('content_items')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      setContent(prev => prev.map(item => 
        item.id === id ? { ...item, status } : item
      ));
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedItems.length} items?`)) return;
    
    try {
      const { error } = await supabase
        .from('content_items')
        .delete()
        .in('id', selectedItems);
      
      if (error) throw error;
      setContent(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
    } catch (err) {
      console.error("Bulk delete error:", err);
    }
  };

  const formatPrice = (price: number, isFree: boolean) => {
    if (isFree || price === 0) return "FREE";
    return `$${price.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "#4cc88c";
      case "draft": return "#ff8f6a";
      case "scheduled": return "#8dcfff";
      case "archived": return "#888";
      default: return "var(--dim)";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", letterSpacing: "0.15em" }}>
            CONTENT LIBRARY
          </div>
          <div style={{ ...disp, fontSize: "28px", color: "var(--gold)", marginTop: "4px" }}>
            {content.length} Items
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* View Toggle */}
          <div style={{ display: "flex", background: "#111120", borderRadius: "8px", padding: "4px" }}>
            {(["grid", "list", "calendar"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: view === v ? "rgba(200,169,110,0.2)" : "transparent",
                  color: view === v ? "var(--gold)" : "var(--dim)",
                  ...mono,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {v === "grid" ? "⊞" : v === "list" ? "☰" : "📅"}
              </button>
            ))}
          </div>
          
          {/* Upload Button */}
          <button
            onClick={() => setShowUpload(true)}
            style={{
              padding: "12px 24px",
              background: "var(--gold)",
              border: "none",
              borderRadius: "8px",
              color: "#120c00",
              ...mono,
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>+</span> UPLOAD
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search content..."
          style={{
            padding: "12px 16px",
            background: "#111120",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "14px",
            minWidth: "250px",
          }}
        />
        
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as typeof filter)}
          style={{
            padding: "12px 16px",
            background: "#111120",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "14px",
          }}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
        
        {selectedItems.length > 0 && (
          <button
            onClick={bulkDelete}
            style={{
              padding: "12px 16px",
              background: "rgba(200,50,50,0.2)",
              border: "1px solid rgba(200,50,50,0.4)",
              borderRadius: "8px",
              color: "#ff8f8f",
              ...mono,
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Delete {selectedItems.length}
          </button>
        )}
      </div>

      {/* Content Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Published", value: content.filter(c => c.status === "published").length, color: "#4cc88c" },
          { label: "Drafts", value: content.filter(c => c.status === "draft").length, color: "#ff8f6a" },
          { label: "Total Views", value: content.reduce((sum, c) => sum + c.accessCount, 0), color: "#8dcfff" },
          { label: "Earnings", value: `$${content.reduce((sum, c) => sum + c.earnings, 0).toFixed(2)}`, color: "var(--gold)" },
        ].map(stat => (
          <div key={stat.label} style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "16px" }}>
            <div style={{ ...mono, fontSize: "10px", color: "var(--dim)", letterSpacing: "0.1em" }}>{stat.label}</div>
            <div style={{ ...disp, fontSize: "24px", color: stat.color, marginTop: "4px" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      {view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {filteredContent.map(item => (
            <div
              key={item.id}
              style={{
                background: "#111120",
                border: `1px solid ${selectedItems.includes(item.id) ? "var(--gold)" : "rgba(255,255,255,0.05)"}`,
                borderRadius: "12px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  height: "160px",
                  background: item.thumbnailUrl 
                    ? `url(${item.thumbnailUrl}) center/cover`
                    : CONTENT_TYPES.find(t => t.value === item.type)?.color || "#333",
                  position: "relative",
                  cursor: "pointer",
                }}
                onClick={() => toggleSelection(item.id)}
              >
                {!item.thumbnailUrl && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>
                    {CONTENT_TYPES.find(t => t.value === item.type)?.label.split(" ")[0]}
                  </div>
                )}
                
                {/* Status Badge */}
                <div style={{
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  padding: "4px 10px",
                  background: "rgba(0,0,0,0.7)",
                  borderRadius: "4px",
                  ...mono,
                  fontSize: "9px",
                  color: getStatusColor(item.status),
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}>
                  {item.status}
                </div>
                
                {/* Price Badge */}
                <div style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  padding: "4px 10px",
                  background: item.isFree ? "rgba(76,200,140,0.2)" : "rgba(200,169,110,0.2)",
                  borderRadius: "4px",
                  ...mono,
                  fontSize: "10px",
                  color: item.isFree ? "#4cc88c" : "var(--gold)",
                  fontWeight: 600,
                }}>
                  {formatPrice(item.price, item.isFree)}
                </div>
                
                {/* Burn Mode Indicator */}
                {item.burnMode && (
                  <div style={{
                    position: "absolute",
                    bottom: "8px",
                    left: "8px",
                    padding: "4px 10px",
                    background: "rgba(255,100,100,0.2)",
                    borderRadius: "4px",
                    ...mono,
                    fontSize: "9px",
                    color: "#ff8f8f",
                  }}>
                    🔥 BURN MODE
                  </div>
                )}
                
                {/* Selection Checkbox */}
                <div style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  background: selectedItems.includes(item.id) ? "var(--gold)" : "rgba(0,0,0,0.5)",
                  border: `1px solid ${selectedItems.includes(item.id) ? "var(--gold)" : "rgba(255,255,255,0.3)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}>
                  {selectedItems.includes(item.id) && <span style={{ color: "#120c00" }}>✓</span>}
                </div>
              </div>
              
              {/* Info */}
              <div style={{ padding: "14px" }}>
                <div style={{ ...disp, fontSize: "16px", color: "#fff", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "12px", color: "var(--dim)", marginBottom: "12px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.description || "No description"}
                </div>
                
                {/* Tags */}
                {item.tags.length > 0 && (
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ padding: "2px 8px", background: "rgba(200,169,110,0.1)", borderRadius: "4px", ...mono, fontSize: "9px", color: "var(--gold-dim)" }}>
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span style={{ padding: "2px 8px", ...mono, fontSize: "9px", color: "var(--dim)" }}>
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Stats */}
                <div style={{ display: "flex", gap: "16px", marginBottom: "12px", ...mono, fontSize: "10px", color: "var(--dim)" }}>
                  <span>👁 {item.accessCount}</span>
                  <span>💰 ${item.earnings.toFixed(2)}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                
                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setEditingItem(item)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      color: "var(--muted)",
                      ...mono,
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => item.status === "archived" ? updateContentStatus(item.id, "published") : updateContentStatus(item.id, "archived")}
                    style={{
                      flex: 1,
                      padding: "8px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      color: item.status === "archived" ? "#4cc88c" : "var(--muted)",
                      ...mono,
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    {item.status === "archived" ? "RESTORE" : "ARCHIVE"}
                  </button>
                  <button
                    onClick={() => deleteContent(item.id)}
                    style={{
                      padding: "8px 12px",
                      background: "transparent",
                      border: "1px solid rgba(200,50,50,0.3)",
                      borderRadius: "6px",
                      color: "#ff8f8f",
                      ...mono,
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", overflow: "hidden" }}>
          {filteredContent.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 60px 2fr 1fr 1fr 120px",
                gap: "12px",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: index < filteredContent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                background: selectedItems.includes(item.id) ? "rgba(200,169,110,0.05)" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={selectedItems.includes(item.id)}
                onChange={() => toggleSelection(item.id)}
                style={{ cursor: "pointer" }}
              />
              <div style={{ fontSize: "24px", textAlign: "center" }}>
                {CONTENT_TYPES.find(t => t.value === item.type)?.label.split(" ")[0]}
              </div>
              <div>
                <div style={{ ...disp, fontSize: "14px", color: "#fff" }}>{item.title}</div>
                <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "2px" }}>
                  {item.tags.slice(0, 3).join(", ") || "No tags"}
                </div>
              </div>
              <div>
                <span style={{
                  padding: "4px 10px",
                  background: getStatusColor(item.status) + "20",
                  borderRadius: "4px",
                  ...mono,
                  fontSize: "10px",
                  color: getStatusColor(item.status),
                }}>
                  {item.status}
                </span>
              </div>
              <div style={{ ...mono, fontSize: "12px", color: "var(--gold)" }}>
                {formatPrice(item.price, item.isFree)}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setEditingItem(item)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "var(--muted)", ...mono, fontSize: "10px", cursor: "pointer" }}>Edit</button>
                <button onClick={() => deleteContent(item.id)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid rgba(200,50,50,0.3)", borderRadius: "4px", color: "#ff8f8f", ...mono, fontSize: "10px", cursor: "pointer" }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredContent.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#111120", borderRadius: "12px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📂</div>
          <div style={{ ...disp, fontSize: "20px", color: "var(--gold)", marginBottom: "8px" }}>No content yet</div>
          <div style={{ fontSize: "14px", color: "var(--dim)", marginBottom: "20px" }}>Upload your first content item to get started</div>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              padding: "12px 24px",
              background: "var(--gold)",
              border: "none",
              borderRadius: "8px",
              color: "#120c00",
              ...mono,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + UPLOAD CONTENT
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={e => { if (e.target === e.currentTarget && !uploading) setShowUpload(false); }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9200,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "#0d0d18",
            border: "1px solid rgba(200,169,110,0.25)",
            borderRadius: "16px",
            padding: "28px",
          }}>
            {/* Step 1: File Upload */}
            {uploadStep === 1 && (
              <>
                <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "8px" }}>STEP 1 OF 3</div>
                <div style={{ ...disp, fontSize: "24px", color: "var(--gold)", marginBottom: "24px" }}>Select Files</div>
                
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed rgba(200,169,110,0.3)",
                    borderRadius: "12px",
                    padding: "60px 40px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📤</div>
                  <div style={{ fontSize: "16px", color: "#fff", marginBottom: "8px" }}>Drop files here or click to browse</div>
                  <div style={{ fontSize: "12px", color: "var(--dim)" }}>Images, videos, audio files supported</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </>
            )}

            {/* Step 2: Details */}
            {uploadStep === 2 && (
              <>
                <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "8px" }}>STEP 2 OF 3</div>
                <div style={{ ...disp, fontSize: "24px", color: "var(--gold)", marginBottom: "24px" }}>Content Details</div>
                
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>FILES ({uploadFiles.length})</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {uploadFiles.map((file, i) => (
                      <div key={i} style={{ padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>{file.name}</span>
                        <span style={{ ...mono, fontSize: "10px", color: "var(--dim)", marginLeft: "auto" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>TITLE</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Content title"
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#111120",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>DESCRIPTION</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your content..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#111120",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "14px",
                        resize: "none",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>TYPE</label>
                      <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as ContentItem["type"] })}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "#111120",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "14px",
                        }}
                      >
                        {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>EXPIRES</label>
                      <select
                        value={formData.expiresIn}
                        onChange={e => setFormData({ ...formData, expiresIn: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "#111120",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "14px",
                        }}
                      >
                        <option value="never">Never</option>
                        <option value="1">1 day</option>
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>TAGS (COMMA SEPARATED)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={e => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="exclusive, behind-the-scenes, vip"
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: "#111120",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={e => setFormData({ ...formData, isFree: e.target.checked })}
                        style={{ width: "18px", height: "18px" }}
                      />
                      <span style={{ fontSize: "14px", color: "var(--muted)" }}>Free content</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.burnMode}
                        onChange={e => setFormData({ ...formData, burnMode: e.target.checked })}
                        style={{ width: "18px", height: "18px" }}
                      />
                      <span style={{ fontSize: "14px", color: "var(--muted)" }}>🔥 Burn mode (auto-delete)</span>
                    </label>
                  </div>

                  {!formData.isFree && (
                    <div>
                      <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>PRICE (USD)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "#111120",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>RESTRICT TO FAN CODES (OPTIONAL)</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "100px", overflowY: "auto", padding: "8px", background: "#111120", borderRadius: "8px" }}>
                      {fanCodes.length === 0 && <span style={{ fontSize: "12px", color: "var(--dim)" }}>No fan codes available</span>}
                      {fanCodes.map(fc => (
                        <label key={fc.code} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={formData.selectedFanCodes.includes(fc.code)}
                            onChange={e => {
                              setFormData(prev => ({
                                ...prev,
                                selectedFanCodes: e.target.checked
                                  ? [...prev.selectedFanCodes, fc.code]
                                  : prev.selectedFanCodes.filter(c => c !== fc.code)
                              }));
                            }}
                          />
                          <span style={{ ...mono, fontSize: "11px" }}>{fc.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <button
                    onClick={() => setUploadStep(1)}
                    style={{
                      flex: 1,
                      padding: "14px",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "var(--muted)",
                      ...mono,
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    ← BACK
                  </button>
                  <button
                    onClick={() => setUploadStep(3)}
                    style={{
                      flex: 2,
                      padding: "14px",
                      background: "var(--gold)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#120c00",
                      ...mono,
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    REVIEW & UPLOAD →
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Upload */}
            {uploadStep === 3 && (
              <>
                <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "8px" }}>STEP 3 OF 3</div>
                <div style={{ ...disp, fontSize: "24px", color: "var(--gold)", marginBottom: "24px" }}>Review & Upload</div>
                
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>FILES: </span>
                    <span style={{ fontSize: "14px" }}>{uploadFiles.length} file(s)</span>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>TITLE: </span>
                    <span style={{ fontSize: "14px" }}>{formData.title || uploadFiles[0]?.name}</span>
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>PRICE: </span>
                    <span style={{ fontSize: "14px", color: formData.isFree ? "#4cc88c" : "var(--gold)" }}>
                      {formData.isFree ? "FREE" : `$${formData.price || "0.00"}`}
                    </span>
                  </div>
                  {formData.burnMode && (
                    <div style={{ marginBottom: "12px" }}>
                      <span style={{ ...mono, fontSize: "10px", color: "var(--dim)" }}>MODE: </span>
                      <span style={{ fontSize: "14px", color: "#ff8f6a" }}>🔥 BURN MODE</span>
                    </div>
                  )}
                </div>

                {uploading ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📤</div>
                    <div style={{ ...mono, fontSize: "14px", color: "var(--gold)", marginBottom: "12px" }}>
                      Uploading... {uploadProgress}%
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${uploadProgress}%`, background: "var(--gold)", transition: "width 0.3s" }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setUploadStep(2)}
                      style={{
                        flex: 1,
                        padding: "14px",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "var(--muted)",
                        ...mono,
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      ← BACK
                    </button>
                    <button
                      onClick={uploadContent}
                      style={{
                        flex: 2,
                        padding: "14px",
                        background: "var(--gold)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#120c00",
                        ...mono,
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      🚀 UPLOAD NOW
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const disp: React.CSSProperties = { fontFamily: "var(--font-display)" };

const CATEGORIES = [
  { value: "luxury", label: "Luxury & Lifestyle" },
  { value: "fitness", label: "Fitness & Health" },
  { value: "music", label: "Music & Audio" },
  { value: "education", label: "Education & Learning" },
  { value: "gaming", label: "Gaming" },
  { value: "art", label: "Art & Design" },
  { value: "tech", label: "Technology" },
  { value: "fashion", label: "Fashion" },
  { value: "food", label: "Food & Cooking" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other" },
];

const PAYOUT_METHODS = [
  { value: "whop", label: "Whop", icon: "💳" },
  { value: "wise", label: "Wise", icon: "🌐" },
  { value: "usdc", label: "USDC (Polygon)", icon: "₿" },
  { value: "paypal", label: "PayPal", icon: "💰" },
];

export type SettingsData = {
  userId: string;
  email: string;
  profile: {
    displayName: string;
    handle: string;
    bio: string;
    category: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    website: string;
    location: string;
  };
  payout: {
    method: string;
    whopAccountId?: string;
    wiseEmail?: string;
    cryptoWallet?: string;
    paypalEmail?: string;
  };
  notifications: {
    emailNewFan: boolean;
    emailNewEarning: boolean;
    emailWeeklyReport: boolean;
    emailMarketing: boolean;
    pushEnabled: boolean;
  };
  privacy: {
    profilePublic: boolean;
    showEarnings: boolean;
    allowMessages: boolean;
  };
};

export function SettingsPage({ initialData }: { initialData: SettingsData }) {
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "payout" | "notifications" | "privacy">("profile");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [removingAsset, setRemovingAsset] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Profile state
  const [profile, setProfile] = useState(initialData.profile);
  const [payout, setPayout] = useState(initialData.payout);
  const [notifications, setNotifications] = useState(initialData.notifications);
  const [privacy, setPrivacy] = useState(initialData.privacy);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const showMessage = (msg: string, _isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 5000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      
      // Upload avatar if changed
      let avatarUrl = profile.avatarUrl;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${initialData.userId}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('creator-assets')
          .upload(filePath, avatarFile, { upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage.from('creator-assets').getPublicUrl(filePath);
          avatarUrl = data.publicUrl;
        }
      }

      // Upload banner if changed
      let bannerUrl = profile.bannerUrl;
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const filePath = `${initialData.userId}/banner.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('creator-assets')
          .upload(filePath, bannerFile, { upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage.from('creator-assets').getPublicUrl(filePath);
          bannerUrl = data.publicUrl;
        }
      }

      const { error } = await supabase
        .from("creator_applications")
        .upsert({
          user_id: initialData.userId,
          name: profile.displayName,
          handle: profile.handle,
          bio: profile.bio,
          category: profile.category,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          website: profile.website,
          location: profile.location,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      showMessage("Profile saved successfully!");
      setAvatarFile(null);
      setBannerFile(null);
    } catch (_err) {
      console.error("Save error:", _err);
      showMessage("Failed to save profile", true);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMessage("Passwords do not match", true);
      return;
    }
    if (newPassword.length < 8) {
      showMessage("Password must be at least 8 characters", true);
      return;
    }

    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      showMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (_err) {
      showMessage("Failed to change password", true);
    } finally {
      setChangingPassword(false);
    }
  };

  const savePayout = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_payout_settings")
        .upsert({
          creator_id: initialData.userId,
          method: payout.method,
          whop_account_id: payout.whopAccountId,
          wise_email: payout.wiseEmail,
          crypto_wallet: payout.cryptoWallet,
          paypal_email: payout.paypalEmail,
          updated_at: new Date().toISOString(),
        }, { onConflict: "creator_id" });

      if (error) throw error;
      showMessage("Payout settings saved!");
    } catch (_err) {
      showMessage("Failed to save payout settings", true);
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_notification_settings")
        .upsert({
          creator_id: initialData.userId,
          email_new_fan: notifications.emailNewFan,
          email_new_earning: notifications.emailNewEarning,
          email_weekly_report: notifications.emailWeeklyReport,
          email_marketing: notifications.emailMarketing,
          push_enabled: notifications.pushEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: "creator_id" });

      if (error) throw error;
      showMessage("Notification preferences saved!");
    } catch (_err) {
      showMessage("Failed to save notifications", true);
    } finally {
      setSaving(false);
    }
  };

  const savePrivacy = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creator_applications")
        .update({
          profile_public: privacy.profilePublic,
          show_earnings: privacy.showEarnings,
          allow_messages: privacy.allowMessages,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", initialData.userId);

      if (error) throw error;
      showMessage("Privacy settings saved!");
    } catch (_err) {
      showMessage("Failed to save privacy settings", true);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setBannerFile(e.target.files[0]);
    }
  };

  const removeAvatar = async () => {
    if (avatarFile) { setAvatarFile(null); return; }
    setRemovingAsset(true);
    try {
      const supabase = createClient();
      await supabase
        .from("creator_applications")
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq("user_id", initialData.userId);
      setProfile(p => ({ ...p, avatarUrl: null }));
      showMessage("Profile photo removed.");
    } catch { showMessage("Failed to remove photo", true); }
    finally { setRemovingAsset(false); }
  };

  const removeBanner = async () => {
    if (bannerFile) { setBannerFile(null); return; }
    setRemovingAsset(true);
    try {
      const supabase = createClient();
      await supabase
        .from("creator_applications")
        .update({ banner_url: null, updated_at: new Date().toISOString() })
        .eq("user_id", initialData.userId);
      setProfile(p => ({ ...p, bannerUrl: null }));
      showMessage("Banner removed.");
    } catch { showMessage("Failed to remove banner", true); }
    finally { setRemovingAsset(false); }
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: "👤" },
    { key: "account", label: "Account", icon: "🔐" },
    { key: "payout", label: "Payout", icon: "💳" },
    { key: "notifications", label: "Notifications", icon: "🔔" },
    { key: "privacy", label: "Privacy", icon: "🛡️" },
  ] as const;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px", maxWidth: "1200px" }}>
      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === tab.key ? "rgba(200,169,110,0.15)" : "transparent",
              color: activeTab === tab.key ? "var(--gold)" : "var(--muted)",
              ...mono,
              fontSize: "12px",
              letterSpacing: "0.08em",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {message && (
          <div style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            background: message.includes("success") || message.includes("saved") ? "rgba(76,200,140,0.1)" : "rgba(200,100,100,0.1)",
            color: message.includes("success") || message.includes("saved") ? "#4cc88c" : "#ff8f8f",
            border: `1px solid ${message.includes("success") || message.includes("saved") ? "rgba(76,200,140,0.3)" : "rgba(200,100,100,0.3)"}`,
          }}>
            {message}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Banner */}
            <div style={{ position: "relative", height: "180px", borderRadius: "12px", overflow: "hidden", background: "#111120" }}>
              {(profile.bannerUrl || bannerFile) && (
                <img
                  src={bannerFile ? URL.createObjectURL(bannerFile) : profile.bannerUrl!}
                  alt="Banner"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "8px" }}>
                <button
                  onClick={() => bannerInputRef.current?.click()}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(0,0,0,0.7)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "6px",
                    color: "#fff",
                    ...mono,
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {(profile.bannerUrl || bannerFile) ? "Change" : "Add Banner"}
                </button>
                {(profile.bannerUrl || bannerFile) && (
                  <button
                    onClick={removeBanner}
                    disabled={removingAsset}
                    style={{
                      padding: "8px 14px",
                      background: "rgba(224,85,85,0.1)",
                      border: "1px solid rgba(224,85,85,0.28)",
                      borderRadius: "6px",
                      color: "#e05555",
                      ...mono,
                      fontSize: "11px",
                      cursor: removingAsset ? "not-allowed" : "pointer",
                      opacity: removingAsset ? 0.5 : 1,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                style={{ display: "none" }}
              />
            </div>

            {/* Avatar & Basic Info */}
            <div style={{ display: "flex", gap: "20px", marginTop: "-50px", padding: "0 20px" }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  border: "4px solid #0d0d18",
                  background: "#111120",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {(profile.avatarUrl || avatarFile) ? (
                    <img
                      src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatarUrl!}
                      alt="Avatar"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: "48px" }}>👤</span>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    position: "absolute",
                    bottom: "5px",
                    right: "5px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--gold)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  📷
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </div>

              <div style={{ flex: 1, paddingTop: "50px" }}>
                <div style={{ ...disp, fontSize: "24px", color: "var(--gold)" }}>
                  {profile.displayName || "Your Name"}
                </div>
                <div style={{ ...mono, fontSize: "13px", color: "var(--dim)" }}>
                  @{profile.handle || "handle"}
                </div>
                {(profile.avatarUrl || avatarFile) && (
                  <button
                    onClick={removeAvatar}
                    disabled={removingAsset}
                    style={{
                      marginTop: "8px",
                      padding: "0",
                      background: "transparent",
                      border: "none",
                      color: "#e05555",
                      ...mono,
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      cursor: removingAsset ? "not-allowed" : "pointer",
                      opacity: removingAsset ? 0.5 : 1,
                    }}
                  >
                    REMOVE PHOTO
                  </button>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>DISPLAY NAME</label>
                  <input
                    type="text"
                    value={profile.displayName}
                    onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                    placeholder="Your display name"
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#0d0d18",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>HANDLE</label>
                  <input
                    type="text"
                    value={profile.handle}
                    onChange={e => setProfile({ ...profile, handle: e.target.value })}
                    placeholder="your-handle"
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#0d0d18",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>BIO</label>
                <textarea
                  value={profile.bio}
                  onChange={e => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell your fans about yourself..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#0d0d18",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px",
                    resize: "none",
                  }}
                />
                <div style={{ fontSize: "11px", color: "var(--dim)", marginTop: "4px" }}>
                  {profile.bio.length}/500 characters
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>CATEGORY</label>
                  <select
                    value={profile.category}
                    onChange={e => setProfile({ ...profile, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#0d0d18",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                    }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>LOCATION</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={e => setProfile({ ...profile, location: e.target.value })}
                    placeholder="City, Country"
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#0d0d18",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", display: "block", marginBottom: "6px" }}>WEBSITE</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={e => setProfile({ ...profile, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#0d0d18",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  marginTop: "10px",
                  padding: "14px 28px",
                  background: "var(--gold)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#120c00",
                  ...mono,
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  alignSelf: "flex-start",
                }}
              >
                {saving ? "SAVING..." : "SAVE PROFILE"}
              </button>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === "account" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "16px" }}>EMAIL ADDRESS</div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="email"
                  value={initialData.email}
                  disabled
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "var(--dim)",
                    fontSize: "14px",
                  }}
                />
                <span style={{ ...mono, fontSize: "11px", color: "#4cc88c" }}>✓ Verified</span>
              </div>
            </div>

            <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "16px" }}>CHANGE PASSWORD</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  style={{
                    padding: "12px",
                    background: "#0d0d18",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 characters)"
                  style={{
                    padding: "12px",
                    background: "#0d0d18",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  style={{
                    padding: "12px",
                    background: "#0d0d18",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px",
                  }}
                />
                <button
                  onClick={changePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  style={{
                    marginTop: "8px",
                    padding: "12px 24px",
                    background: "var(--gold)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#120c00",
                    ...mono,
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: changingPassword ? "not-allowed" : "pointer",
                    opacity: changingPassword || !currentPassword || !newPassword || !confirmPassword ? 0.6 : 1,
                    alignSelf: "flex-start",
                  }}
                >
                  {changingPassword ? "CHANGING..." : "CHANGE PASSWORD"}
                </button>
              </div>
            </div>

            <div style={{ background: "rgba(200,50,50,0.08)", border: "1px solid rgba(200,50,50,0.2)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "#ff8f8f", marginBottom: "8px" }}>DANGER ZONE</div>
              <div style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "16px" }}>
                Once you delete your account, there is no going back. This action cannot be undone.
              </div>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete your account? This cannot be undone.")) {
                    alert("Contact support@cipher.so to request account deletion.");
                  }
                }}
                style={{
                  padding: "12px 24px",
                  background: "transparent",
                  border: "1px solid rgba(200,50,50,0.5)",
                  borderRadius: "8px",
                  color: "#ff8f8f",
                  ...mono,
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                DELETE ACCOUNT
              </button>
            </div>
          </div>
        )}

        {/* Payout Tab */}
        {activeTab === "payout" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "16px" }}>PAYOUT METHOD</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {PAYOUT_METHODS.map(method => (
                  <button
                    key={method.value}
                    onClick={() => setPayout({ ...payout, method: method.value })}
                    style={{
                      padding: "16px",
                      background: payout.method === method.value ? "rgba(200,169,110,0.15)" : "#0d0d18",
                      border: `1px solid ${payout.method === method.value ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>{method.icon}</div>
                    <div style={{ ...mono, fontSize: "12px", color: payout.method === method.value ? "var(--gold)" : "#fff" }}>
                      {method.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "16px" }}>
                {payout.method === "whop" && "WHOP ACCOUNT / PAYOUT PROFILE"}
                {payout.method === "wise" && "WISE EMAIL"}
                {payout.method === "usdc" && "CRYPTO WALLET ADDRESS"}
                {payout.method === "paypal" && "PAYPAL EMAIL"}
              </div>
              <input
                type="text"
                value={
                  payout.method === "whop" ? payout.whopAccountId || "" :
                  payout.method === "wise" ? payout.wiseEmail || "" :
                  payout.method === "usdc" ? payout.cryptoWallet || "" :
                  payout.paypalEmail || ""
                }
                onChange={e => {
                  const value = e.target.value;
                  setPayout({
                    ...payout,
                    ...(payout.method === "whop" && { whopAccountId: value }),
                    ...(payout.method === "wise" && { wiseEmail: value }),
                    ...(payout.method === "usdc" && { cryptoWallet: value }),
                    ...(payout.method === "paypal" && { paypalEmail: value }),
                  });
                }}
                placeholder={
                  payout.method === "whop" ? "Whop account or payout reference" :
                  payout.method === "wise" ? "your@email.com" :
                  payout.method === "usdc" ? "0x..." :
                  "your@email.com"
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#0d0d18",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                  ...mono,
                }}
              />
              <button
                onClick={savePayout}
                disabled={saving}
                style={{
                  marginTop: "16px",
                  padding: "12px 24px",
                  background: "var(--gold)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#120c00",
                  ...mono,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "SAVING..." : "SAVE PAYOUT SETTINGS"}
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "16px" }}>EMAIL NOTIFICATIONS</div>
              
              {[
                { key: "emailNewFan", label: "New fan signup", desc: "When someone uses your referral link" },
                { key: "emailNewEarning", label: "New earnings", desc: "When you receive a tip or subscription" },
                { key: "emailWeeklyReport", label: "Weekly report", desc: "Summary of your weekly performance" },
                { key: "emailMarketing", label: "Product updates", desc: "New features and platform news" },
              ].map(item => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#fff" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "2px" }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                    style={{
                      width: "44px",
                      height: "24px",
                      borderRadius: "12px",
                      border: "none",
                      background: notifications[item.key as keyof typeof notifications] ? "var(--gold)" : "rgba(255,255,255,0.15)",
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: "3px",
                      left: notifications[item.key as keyof typeof notifications] ? "23px" : "3px",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              ))}

              <button
                onClick={saveNotifications}
                disabled={saving}
                style={{
                  marginTop: "20px",
                  padding: "12px 24px",
                  background: "var(--gold)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#120c00",
                  ...mono,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "SAVING..." : "SAVE PREFERENCES"}
              </button>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.055)", borderRadius: "12px", padding: "24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--gold-dim)", marginBottom: "16px" }}>PRIVACY SETTINGS</div>
              
              {[
                { key: "profilePublic", label: "Public profile", desc: "Allow anyone to view your profile page" },
                { key: "showEarnings", label: "Show earnings", desc: "Display your earnings on your public profile" },
                { key: "allowMessages", label: "Allow messages", desc: "Let fans send you direct messages" },
              ].map(item => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#fff" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "var(--dim)", marginTop: "2px" }}>{item.desc}</div>
                  </div>
                  <button
                    onClick={() => setPrivacy({ ...privacy, [item.key]: !privacy[item.key as keyof typeof privacy] })}
                    style={{
                      width: "44px",
                      height: "24px",
                      borderRadius: "12px",
                      border: "none",
                      background: privacy[item.key as keyof typeof privacy] ? "var(--gold)" : "rgba(255,255,255,0.15)",
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute",
                      top: "3px",
                      left: privacy[item.key as keyof typeof privacy] ? "23px" : "3px",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              ))}

              <button
                onClick={savePrivacy}
                disabled={saving}
                style={{
                  marginTop: "20px",
                  padding: "12px 24px",
                  background: "var(--gold)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#120c00",
                  ...mono,
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "SAVING..." : "SAVE PRIVACY SETTINGS"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

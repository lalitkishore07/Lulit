import { useState } from "react";
import PageHeader from "../components/PageHeader";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { applyPreferences, defaultPreferences, loadPreferences, savePreferences } from "../utils/preferences";

function Toggle({ checked, label, description, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-300/60 p-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        className={`settings-toggle ${checked ? "settings-toggle-on" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          onChange(!checked);
        }}
        type="button"
      >
        <span className={`settings-toggle-knob ${checked ? "settings-toggle-knob-on" : ""}`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState(() => loadPreferences());

  const update = (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
    applyPreferences(next);
  };

  const resetDefaults = () => {
    setPrefs(defaultPreferences);
    savePreferences(defaultPreferences);
    applyPreferences(defaultPreferences);
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Settings" />

        <section className="card p-5">
          <h2 className="text-lg font-display font-bold">Theme</h2>
          <p className="mt-1 text-sm text-slate-600">Choose the visual theme for the app.</p>
          <div className="mt-3">
            <ThemeSwitcher />
          </div>
        </section>

        <section className="card mt-4 p-5">
          <h2 className="text-lg font-display font-bold">General</h2>
          <div className="mt-3 grid gap-3">
            <Toggle
              checked={prefs.motionEffects}
              description="Disable if you prefer minimal motion and transitions."
              label="Motion Effects"
              onChange={(motionEffects) => update({ motionEffects })}
            />
            <Toggle
              checked={prefs.compactMode}
              description="Tighter spacing for higher information density."
              label="Compact Layout"
              onChange={(compactMode) => update({ compactMode })}
            />
            <Toggle
              checked={prefs.autoRefreshFeed}
              description="Refreshes the feed every 30 seconds automatically."
              label="Auto Refresh Feed"
              onChange={(autoRefreshFeed) => update({ autoRefreshFeed })}
            />
            <Toggle
              checked={prefs.blurSensitiveMedia}
              description="Blurs media previews in feed until hovered."
              label="Blur Media Previews"
              onChange={(blurSensitiveMedia) => update({ blurSensitiveMedia })}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">Changes are saved automatically.</p>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold" onClick={resetDefaults} type="button">
              Reset Defaults
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

import { useState } from 'react';
import { Settings, Key, Zap, Database, Cloud } from 'lucide-react';

export default function SettingsPage() {
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a full auth implementation, this would POST to /api/v1/settings/keys
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-surface-2/50 border border-border/20 flex items-center justify-center">
            <Settings className="w-4.5 h-4.5 text-muted-foreground/50" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Settings</h1>
            <p className="text-xs text-muted-foreground/40">Configure your Archon platform</p>
          </div>
        </div>

        <div className="space-y-4">
          <SettingsCard icon={<Key className="w-4 h-4 text-violet/60" />} title="AI Provider Keys">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground/50 mb-1.5">OpenRouter API Key</label>
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={e => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-…"
                  className="w-full bg-surface-2/40 border border-border/20 rounded-lg px-3.5 py-2.5 text-sm font-mono outline-none focus:border-violet/40 focus:ring-1 focus:ring-violet/10 placeholder:text-muted-foreground/20 transition-all"
                />
                <p className="text-[10px] text-muted-foreground/30 mt-1">
                  Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-violet/50 hover:text-violet/70">openrouter.ai/keys</a>
                </p>
              </div>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-violet/20 hover:bg-violet/30 border border-violet/30 text-violet transition-all"
              >
                {saved ? '✓ Saved' : 'Save Keys'}
              </button>
            </div>
          </SettingsCard>

          <SettingsCard icon={<Zap className="w-4 h-4 text-yellow/60" />} title="AI Configuration">
            <div className="space-y-2 text-xs">
              <InfoRow label="Primary Provider" value="OpenRouter" />
              <InfoRow label="Primary Model" value="Claude 3.5 Sonnet" />
              <InfoRow label="Fallback 1" value="GPT-4o (OpenRouter)" />
              <InfoRow label="Fallback 2" value="Gemini 2.0 Flash (OpenRouter)" />
              <InfoRow label="Final Fallback" value="Groq Llama 3.3 70B" />
              <InfoRow label="Streaming" value="Enabled (Socket.IO)" />
              <InfoRow label="Guest Mode" value="Enabled" />
            </div>
          </SettingsCard>

          <SettingsCard icon={<Database className="w-4 h-4 text-cyan/60" />} title="Database">
            <InfoRow label="Provider" value="PostgreSQL" />
            <InfoRow label="ORM" value="Prisma" />
          </SettingsCard>

          <SettingsCard icon={<Cloud className="w-4 h-4 text-blue/60" />} title="Storage">
            <InfoRow label="Driver" value="Local Filesystem" />
            <InfoRow label="Auth" value="Instance Profile (EC2)" />
          </SettingsCard>
        </div>

        <div className="mt-8 p-4 rounded-xl border border-border/15 bg-surface-1/30">
          <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
            <strong className="text-muted-foreground/60">Guest Mode Active</strong> — No login required. All projects are stored under a shared guest identity. Enable JWT authentication by setting <code className="font-mono text-violet/50">GUEST_MODE=false</code> in your backend environment.
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-1/50 border border-border/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
      <span className="text-muted-foreground/50">{label}</span>
      <span className="font-mono text-foreground/70">{value}</span>
    </div>
  );
}

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ArtifactPayload } from '@archon/shared';

type ActiveTab = 'architecture' | 'code' | 'files' | 'preview';
type PreviewViewport = 'desktop' | 'tablet' | 'mobile';
type SidebarState = 'chat' | 'files' | 'history';

interface UIStore {
  // Layout
  activeTab: ActiveTab;
  sidebarState: SidebarState;
  chatPanelWidth: number;
  previewVisible: boolean;
  
  // Current artifact data being displayed
  currentArtifactData: ArtifactPayload | null;
  activeFile: string | null;

  // Preview
  previewViewport: PreviewViewport;

  // Setters
  setActiveTab: (tab: ActiveTab) => void;
  setSidebarState: (state: SidebarState) => void;
  setCurrentArtifactData: (data: ArtifactPayload | null) => void;
  setActiveFile: (file: string | null) => void;
  setPreviewViewport: (viewport: PreviewViewport) => void;
  togglePreview: () => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        activeTab:           'architecture',
        sidebarState:        'chat',
        chatPanelWidth:      360,
        previewVisible:      true,
        currentArtifactData: null,
        activeFile:          null,
        previewViewport:     'desktop',

        setActiveTab:           (tab) => set({ activeTab: tab }),
        setSidebarState:        (state) => set({ sidebarState: state }),
        setCurrentArtifactData: (data) => set({ currentArtifactData: data }),
        setActiveFile:          (file) => set({ activeFile: file }),
        setPreviewViewport:     (viewport) => set({ previewViewport: viewport }),
        togglePreview:          () => set((s) => ({ previewVisible: !s.previewVisible })),
      }),
      { name: 'archon-ui', partialize: (s) => ({ previewViewport: s.previewViewport }) }
    ),
    { name: 'UIStore' }
  )
);

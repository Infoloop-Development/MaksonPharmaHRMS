import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_ORG_BRANDING,
  type OrgBranding,
  type OrgBrandFontFamily,
} from '@mams/types';
import { settingsApi, type Settings } from '../../api/settings';
import { useOrgBranding } from '../../store/orgBranding';
import { extractLogoPalette, isSvgDataUrl } from '../../lib/extractLogoPalette';
import { fontFamilyStack, swatchOptions } from '../../lib/orgBrandingTheme';
import { useToast } from '../ui/Toast';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { FontPreviewGlyph } from './FontPreviewGlyph';
import { FontFamilyPicker } from './FontFamilyPicker';
import { BrandingConfirmDialog, BrandThemeMiniPreview } from './BrandingConfirmDialog';
import { ACTIVITY_QUERY_PREFIX } from '../../api/activity';

function ColorRow({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full border border-border shrink-0" style={{ backgroundColor: color }} />
        <code className="text-xs font-mono text-text">{color}</code>
      </div>
    </div>
  );
}

function FontRow({ label, font }: { label: string; font: OrgBrandFontFamily }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <FontPreviewGlyph font={font} aria-label={`${font} preview`} />
        <span className="text-sm font-medium" style={{ fontFamily: fontFamilyStack(font) }}>
          {font}
        </span>
      </div>
    </div>
  );
}

export function BrandThemeSection({
  settings,
  canManage,
  logoVersion,
}: {
  settings: Settings;
  canManage: boolean;
  logoVersion?: string | null;
}) {
  const { branding, applyPreview, revertPreview, commitBranding } = useOrgBranding();
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrgBranding>(branding);
  const [palette, setPalette] = useState<string[]>(branding.logoPalette);
  const [svgNotice, setSvgNotice] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(branding);
  }, [branding, editing]);

  useEffect(() => {
    const saved = branding.logoPalette.length ? branding.logoPalette : DEFAULT_ORG_BRANDING.logoPalette;
    setPalette(saved);
  }, [branding.logoPalette]);

  const loadPaletteFromLogo = useCallback(async (dataUrl: string | null | undefined) => {
    if (!dataUrl) {
      setSvgNotice(false);
      return;
    }
    if (isSvgDataUrl(dataUrl)) {
      setSvgNotice(true);
      return;
    }
    setSvgNotice(false);
    const colors = await extractLogoPalette(dataUrl);
    if (colors.length) setPalette(colors);
  }, []);

  useEffect(() => {
    void loadPaletteFromLogo(settings.companyLogo);
  }, [settings.companyLogo, loadPaletteFromLogo]);

  useEffect(() => {
    if (!logoVersion || !settings.companyLogo) return;
    const logoUrl = settings.companyLogo;
    void (async () => {
      if (isSvgDataUrl(logoUrl)) return;
      const colors = await extractLogoPalette(logoUrl);
      if (!colors.length) return;
      setPalette(colors);
      setDraft((d) => ({
        ...d,
        logoPalette: colors.slice(0, 6),
        primaryColor: colors[0] ?? d.primaryColor,
        secondaryColor: colors[1] ?? colors[0] ?? d.secondaryColor,
      }));
    })();
  }, [logoVersion, settings.companyLogo]);

  const patchMu = useMutation({
    mutationFn: (body: { orgBranding: OrgBranding }) => settingsApi.patch(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const primaryOptions = swatchOptions(palette, draft.primaryColor, DEFAULT_ORG_BRANDING.logoPalette);
  const secondaryOptions = swatchOptions(palette, draft.secondaryColor, DEFAULT_ORG_BRANDING.logoPalette);

  const startEdit = () => {
    setDraft({
      ...branding,
      logoPalette: branding.logoPalette.length ? branding.logoPalette : palette.slice(0, 6),
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(branding);
    setEditing(false);
  };

  const onSave = () => {
    applyPreview(draft);
    setConfirmOpen(true);
  };

  const onKeep = () => {
    patchMu.mutate(
      { orgBranding: draft },
      {
        onSuccess: () => {
          commitBranding(draft);
          setConfirmOpen(false);
          setEditing(false);
          toast('Branding theme saved', 'success');
        },
      }
    );
  };

  const onRevertConfirm = useCallback(() => {
    revertPreview();
    setConfirmOpen(false);
    setEditing(false);
    setDraft(branding);
  }, [revertPreview, branding]);

  return (
    <>
      <div className="card p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-base font-bold">Branding theme</h3>
          {canManage && !editing && (
            <button type="button" className="btn-outline btn-sm" onClick={startEdit} aria-label="Edit branding theme">
              Edit
            </button>
          )}
        </div>
        <p className="text-sm text-text-muted mb-4">
          Primary and secondary colors apply to the sidebar, buttons, and links app-wide. Font applies to the whole
          application.
        </p>

        {svgNotice && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber/10 border border-amber/30 rounded-md px-3 py-2 mb-4">
            SVG logos cannot be auto-analyzed. Upload a PNG or JPG logo to extract colors, or pick custom colors below.
          </p>
        )}

        {!editing ? (
          <div className="divide-y divide-border rounded-lg border border-border px-4">
            <ColorRow label="Primary color" color={branding.primaryColor} />
            <ColorRow label="Secondary color" color={branding.secondaryColor} />
            <FontRow label="Font" font={branding.fontFamily} />
          </div>
        ) : (
          <div className="space-y-5">
            <ColorSwatchPicker
              label="Primary color"
              value={draft.primaryColor}
              options={primaryOptions}
              disabled={!canManage}
              onChange={(hex) => setDraft((d) => ({ ...d, primaryColor: hex }))}
            />
            <ColorSwatchPicker
              label="Secondary color"
              value={draft.secondaryColor}
              options={secondaryOptions}
              disabled={!canManage}
              onChange={(hex) => setDraft((d) => ({ ...d, secondaryColor: hex }))}
            />
            <div>
              <div className="text-xs font-bold uppercase text-text-muted mb-2">Font family</div>
              <FontFamilyPicker
                value={draft.fontFamily}
                disabled={!canManage}
                onChange={(font) => setDraft((d) => ({ ...d, fontFamily: font }))}
              />
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-text-muted mb-2">Preview</div>
              <BrandThemeMiniPreview branding={draft} />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className="btn-primary" disabled={!canManage || patchMu.isPending} onClick={onSave}>
                Save
              </button>
              <button type="button" className="btn-outline" disabled={patchMu.isPending} onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <BrandingConfirmDialog
        open={confirmOpen}
        busy={patchMu.isPending}
        onKeep={onKeep}
        onRevert={onRevertConfirm}
      />
    </>
  );
}

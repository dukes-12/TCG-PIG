import { useEffect, useState, type CSSProperties } from 'react';
import {
  apiCreateAdminQuery,
  apiDeleteAdminQuery,
  apiFetchAdminQueries,
  apiRunAdminQuery,
  apiUpdateAdminQuery,
  type AdminQuery,
  type AdminQueryRunResult,
} from '../lib/api';

interface RunState {
  loading: boolean;
  error: string | null;
  result: AdminQueryRunResult | null;
}

function btnStyle(bg: string, color: string): CSSProperties {
  return {
    cursor: 'pointer',
    border: 0,
    fontFamily: 'var(--font-heading)',
    fontSize: 11.5,
    padding: '8px 12px',
    borderRadius: 999,
    background: bg,
    color,
    whiteSpace: 'nowrap',
  };
}

/** Requêtes SQL d'administration, pré-enregistrées et éditables — évite de
 *  rouvrir la console D1 du dashboard Cloudflare pour les opérations
 *  manuelles décrites dans ADMIN.md (créditer des glands, notifier un
 *  joueur…). Réservé au compte "Dukes" : gardé côté client par
 *  ProfileScreen (comme le reste d'"Outils de test"), revérifié côté
 *  serveur par `requireAdmin` sur chaque route — un pouvoir bien plus
 *  lourd que le reste de l'appli (SQL arbitraire sur la base de
 *  production), donc jamais fait confiance au seul masquage client.
 *
 *  Chaque requête peut être plusieurs instructions séparées par `;` (voir
 *  le modèle "créditer + notifier") — exécutées comme une transaction côté
 *  serveur (`env.DB.batch`). Éditer le texte juste avant de lancer marche
 *  sans "Enregistrer" d'abord (utile pour changer un pseudo cible à la
 *  volée), mais la modif ne persiste que si on clique "Enregistrer". */
export default function AdminSqlOverlay({ onClose }: { onClose: () => void }) {
  const [queries, setQueries] = useState<AdminQuery[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { name: string; sqlText: string }>>({});
  const [runs, setRuns] = useState<Record<number, RunState>>({});
  const [newName, setNewName] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    apiFetchAdminQueries()
      .then((res) => {
        const list = res.queries ?? [];
        setQueries(list);
        setDrafts(Object.fromEntries(list.map((q) => [q.id, { name: q.name, sqlText: q.sql_text }])));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erreur.'));
  };

  useEffect(load, []);

  const setDraft = (id: number, patch: Partial<{ name: string; sqlText: string }>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const save = async (id: number) => {
    const d = drafts[id];
    if (!d) return;
    await apiUpdateAdminQuery(id, { name: d.name, sqlText: d.sqlText });
    load();
  };

  const remove = async (id: number) => {
    if (!window.confirm('Supprimer cette requête ?')) return;
    await apiDeleteAdminQuery(id);
    load();
  };

  const run = async (id: number) => {
    const d = drafts[id];
    if (!window.confirm(`Exécuter cette requête maintenant, sur la base de production ?\n\n${d?.sqlText ?? ''}`)) return;
    setRuns((r) => ({ ...r, [id]: { loading: true, error: null, result: null } }));
    try {
      const result = await apiRunAdminQuery(id, d?.sqlText);
      setRuns((r) => ({ ...r, [id]: { loading: false, error: null, result } }));
    } catch (e) {
      setRuns((r) => ({ ...r, [id]: { loading: false, error: e instanceof Error ? e.message : 'Erreur.', result: null } }));
    }
  };

  const createNew = async () => {
    const name = newName.trim();
    if (!name) return;
    await apiCreateAdminQuery(name, '-- nouvelle requête\n');
    setNewName('');
    load();
  };

  return (
    <div className="overlay" onClick={onClose} style={{ alignItems: 'stretch' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          margin: 'auto 0',
          maxHeight: '85vh',
          background: 'var(--color-bg)',
          borderRadius: 28,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ padding: '18px 20px 4px', display: 'flex', alignItems: 'center', flex: 'none' }}>
          <h2 style={{ fontSize: 19, margin: 0 }}>Requêtes SQL</h2>
          <button
            className="pressable"
            onClick={onClose}
            aria-label="Fermer"
            style={{ marginLeft: 'auto', border: 0, background: 'none', cursor: 'pointer', fontSize: 18, opacity: 0.5, padding: 4 }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '0 20px 12px', fontSize: 11, opacity: 0.55, flex: 'none' }}>
          Exécuté directement sur la base de production — vérifie le texte avant de lancer.
        </div>

        <div style={{ overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loadError && <p style={{ fontSize: 12.5, color: '#c0392b' }}>{loadError}</p>}
          {!queries && !loadError && <p style={{ fontSize: 12.5, opacity: 0.5, textAlign: 'center', padding: '18px 0' }}>Chargement…</p>}

          {queries?.map((q) => {
            const d = drafts[q.id] ?? { name: q.name, sqlText: q.sql_text };
            const runState = runs[q.id];
            return (
              <div key={q.id} style={{ padding: 14, borderRadius: 18, background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={d.name}
                  onChange={(e) => setDraft(q.id, { name: e.target.value })}
                  style={{ fontFamily: 'var(--font-heading)', fontSize: 14, border: 0, background: 'none', padding: 0, width: '100%', color: 'var(--color-text)' }}
                />
                <textarea
                  value={d.sqlText}
                  onChange={(e) => setDraft(q.id, { sqlText: e.target.value })}
                  rows={4}
                  spellCheck={false}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11.5,
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid var(--color-divider)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="pressable" onClick={() => run(q.id)} disabled={runState?.loading} style={btnStyle('var(--color-accent)', 'var(--color-bg)')}>
                    {runState?.loading ? 'Exécution…' : 'Exécuter'}
                  </button>
                  <button className="pressable" onClick={() => save(q.id)} style={btnStyle('var(--color-neutral-200)', 'var(--color-text)')}>
                    Enregistrer
                  </button>
                  <button className="pressable" onClick={() => remove(q.id)} style={{ ...btnStyle('none', 'var(--color-text)'), marginLeft: 'auto', opacity: 0.5 }}>
                    Supprimer
                  </button>
                </div>
                {runState?.error && <p style={{ fontSize: 11.5, color: '#c0392b', margin: 0 }}>{runState.error}</p>}
                {runState?.result && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(runState.result.results ?? []).map((r, i) => (
                      <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', background: 'var(--color-bg)', borderRadius: 8, padding: 8, overflowX: 'auto' }}>
                        {r.results.length > 0 ? (
                          <pre style={{ margin: 0, whiteSpace: 'pre' }}>{JSON.stringify(r.results, null, 1)}</pre>
                        ) : (
                          <span>{r.meta.changes ?? 0} ligne(s) modifiée(s)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la nouvelle requête…"
              className="input"
              style={{ flex: 1 }}
            />
            <button className="pressable" onClick={createNew} style={btnStyle('var(--color-accent)', 'var(--color-bg)')}>
              + Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

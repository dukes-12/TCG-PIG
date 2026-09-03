import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardById } from '../data/catalog';
import { apiFetchPlayers, apiFetchProfile, apiFetchTrades, apiProposeTrade, apiRespondTrade, type Trade } from '../lib/api';
import { useStore } from '../state/store';

const chipStyle = (active: boolean): React.CSSProperties => ({
  cursor: 'pointer',
  border: 0,
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 12px',
  borderRadius: 14,
  fontSize: 12.5,
  fontFamily: 'var(--font-body)',
  background: active ? 'var(--color-accent-200)' : 'var(--color-neutral-100)',
  color: active ? 'var(--color-accent-800)' : 'var(--color-text)',
  boxShadow: active ? 'inset 0 0 0 1.5px var(--color-accent-500)' : 'none',
});

const STATUS_LABEL: Record<Trade['status'], string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  declined: 'Refusé',
  cancelled: 'Annulé',
};

/** Échanger des doublons avec un autre joueur. Proposition directe : on
 *  choisit ses cartes à donner (parmi ses propres doublons) et celles
 *  demandées (parmi les doublons du destinataire), l'autre accepte ou
 *  refuse — pas de marché public. Le serveur revérifie tout à la proposition
 *  ET à l'acceptation (voir functions/api/trades/) : jamais son dernier
 *  exemplaire, même si le client se trompe ou est trafiqué. */
export default function TradesScreen() {
  const owned = useStore((s) => s.owned);
  const say = useStore((s) => s.say);
  const navigate = useNavigate();

  const [players, setPlayers] = useState<string[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [theirOwned, setTheirOwned] = useState<Record<string, number> | null>(null);
  const [offer, setOffer] = useState<Record<string, number>>({});
  const [request, setRequest] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshTrades = () => apiFetchTrades().then((r) => setTrades(r.trades)).catch(() => {});

  useEffect(() => {
    apiFetchPlayers().then((r) => setPlayers(r.players)).catch(() => {});
    refreshTrades();
  }, []);

  useEffect(() => {
    if (!target) {
      setTheirOwned(null);
      return;
    }
    setOffer({});
    setRequest({});
    apiFetchProfile(target).then((r) => setTheirOwned(r.owned)).catch(() => setTheirOwned({}));
  }, [target]);

  const myDupes = useMemo(() => Object.entries(owned).filter(([, n]) => n > 1).map(([id]) => Number(id)), [owned]);
  const theirDupes = useMemo(
    () => (theirOwned ? Object.entries(theirOwned).filter(([, n]) => n > 1).map(([id]) => Number(id)) : []),
    [theirOwned],
  );

  const toggle = (map: Record<string, number>, set: (m: Record<string, number>) => void, id: number) => {
    const next = { ...map };
    if (next[id]) delete next[id];
    else next[id] = 1;
    set(next);
  };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await apiProposeTrade(target, offer, request);
      say(`Proposition envoyée à ${target}`);
      setOffer({});
      setRequest({});
      setTarget(null);
      refreshTrades();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  };

  const respond = async (id: number, action: 'accept' | 'decline' | 'cancel') => {
    try {
      await apiRespondTrade(id, action);
      say(action === 'accept' ? 'Échange conclu' : action === 'decline' ? 'Échange refusé' : 'Échange annulé');
      refreshTrades();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  const pending = trades.filter((t) => t.status === 'pending');
  const resolved = trades.filter((t) => t.status !== 'pending');

  return (
    <div className="screen">
      <div className="screen-inner">
        <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Échanges</h1>
        <p style={{ fontSize: 13, opacity: 0.6, margin: '10px 0 0', textWrap: 'pretty' as const }}>
          Uniquement tes doublons — tu gardes toujours ton dernier exemplaire.
        </p>
      </div>

      <div className="screen-inner" style={{ paddingTop: 18 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Proposer un échange</div>
        <div className="chip-row">
          {players.length === 0 && <span style={{ fontSize: 12, opacity: 0.5 }}>Aucun autre joueur pour l'instant.</span>}
          {players.map((p) => (
            <button key={p} className="pressable" onClick={() => setTarget(target === p ? null : p)} style={chipStyle(target === p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {target && (
        <div className="screen-inner" style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Tu proposes (tes doublons)</div>
            {myDupes.length === 0 ? (
              <p style={{ fontSize: 12, opacity: 0.5 }}>Aucun doublon à proposer.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {myDupes.map((id) => {
                  const card = cardById(id);
                  if (!card) return null;
                  return (
                    <button key={id} className="pressable" onClick={() => toggle(offer, setOffer, id)} style={chipStyle(!!offer[id])}>
                      {card.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Tu demandes (doublons de {target})</div>
            {theirOwned == null ? (
              <p style={{ fontSize: 12, opacity: 0.5 }}>Chargement…</p>
            ) : theirDupes.length === 0 ? (
              <p style={{ fontSize: 12, opacity: 0.5 }}>{target} n'a aucun doublon pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {theirDupes.map((id) => {
                  const card = cardById(id);
                  if (!card) return null;
                  return (
                    <button key={id} className="pressable" onClick={() => toggle(request, setRequest, id)} style={chipStyle(!!request[id])}>
                      {card.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            className="pressable"
            onClick={submit}
            disabled={busy || Object.keys(offer).length === 0 || Object.keys(request).length === 0}
            style={{
              cursor: 'pointer',
              border: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 15,
              padding: '13px',
              borderRadius: 999,
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              opacity: busy || Object.keys(offer).length === 0 || Object.keys(request).length === 0 ? 0.5 : 1,
            }}
          >
            Proposer l'échange
          </button>
        </div>
      )}

      {pending.length > 0 && (
        <div className="screen-inner" style={{ paddingTop: 22 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>En attente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {pending.map((t) => (
              <TradeRow key={t.id} trade={t} onRespond={respond} onOpen={navigate} />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="screen-inner" style={{ paddingTop: 22, paddingBottom: 12 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Historique</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {resolved.slice(0, 12).map((t) => (
              <TradeRow key={t.id} trade={t} onRespond={respond} onOpen={navigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function cardsLabel(map: Record<string, number>) {
  return Object.keys(map)
    .map((id) => cardById(Number(id))?.name)
    .filter(Boolean)
    .join(', ') || '—';
}

function TradeRow({
  trade,
  onRespond,
  onOpen,
}: {
  trade: Trade;
  onRespond: (id: number, action: 'accept' | 'decline' | 'cancel') => void;
  onOpen: (path: string) => void;
}) {
  const other = trade.direction === 'outgoing' ? trade.toUsername : trade.fromUsername;
  const mine = trade.direction === 'outgoing' ? trade.offer : trade.request;
  const theirs = trade.direction === 'outgoing' ? trade.request : trade.offer;

  return (
    <div style={{ padding: '11px 13px', borderRadius: 22, background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onOpen(`/players/${other}`)}
          style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--color-text)' }}
        >
          {other}
        </button>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            padding: '3px 8px',
            borderRadius: 999,
            background: trade.status === 'accepted' ? 'var(--color-accent-2-200)' : trade.status === 'pending' ? 'var(--color-accent-200)' : 'var(--color-neutral-200)',
            color: trade.status === 'accepted' ? 'var(--color-accent-2-800)' : trade.status === 'pending' ? 'var(--color-accent-800)' : 'var(--color-neutral-600)',
          }}
        >
          {STATUS_LABEL[trade.status]}
        </span>
      </div>
      <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 6, lineHeight: 1.4 }}>
        <div>Tu donnes : {cardsLabel(mine)}</div>
        <div>Tu reçois : {cardsLabel(theirs)}</div>
      </div>
      {trade.status === 'pending' && (
        <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
          {trade.direction === 'incoming' ? (
            <>
              <button className="pressable" onClick={() => onRespond(trade.id, 'accept')} style={smallBtn('var(--color-accent)', 'var(--color-bg)')}>
                Accepter
              </button>
              <button className="pressable" onClick={() => onRespond(trade.id, 'decline')} style={smallBtn('var(--color-neutral-200)', 'var(--color-text)')}>
                Refuser
              </button>
            </>
          ) : (
            <button className="pressable" onClick={() => onRespond(trade.id, 'cancel')} style={smallBtn('var(--color-neutral-200)', 'var(--color-text)')}>
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function smallBtn(bg: string, col: string): React.CSSProperties {
  return { cursor: 'pointer', border: 0, fontFamily: 'var(--font-heading)', fontSize: 12, padding: '7px 13px', borderRadius: 999, background: bg, color: col };
}

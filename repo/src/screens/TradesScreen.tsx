import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import PigCard from '../components/PigCard';
import { SECRET_CARD, cardById } from '../data/catalog';
import { apiFetchFriends, apiFetchProfile, apiFetchTrades, apiProposeTrade, apiRespondTrade, type Trade } from '../lib/api';
import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import type { AvatarKey } from '../types';

interface Friend {
  username: string;
  avatar: AvatarKey;
  avatarPhoto: string | null;
}

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
 *  exemplaire, même si le client se trompe ou est trafiqué.
 *
 *  Repensé pour être plus lisible : le sélecteur de joueur montre son
 *  avatar (comme l'onglet Amis), les cartes à donner/demander se choisissent
 *  sur de vraies vignettes de carte plutôt que des chips de texte, et
 *  chaque proposition dans la liste affiche l'avatar de l'autre + les
 *  cartes en jeu, pas une phrase compacte. */
export default function TradesScreen() {
  const owned = useStore((s) => s.owned);
  const say = useStore((s) => s.say);
  const setTradesUnread = useStore((s) => s.setTradesUnread);
  const holoAnim = useAnimations();
  const navigate = useNavigate();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [theirOwned, setTheirOwned] = useState<Record<string, number> | null>(null);
  const [offer, setOffer] = useState<Record<string, number>>({});
  const [request, setRequest] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshTrades = () =>
    apiFetchTrades()
      .then((r) => {
        setTrades(r.trades);
        setTradesUnread(r.trades.filter((t) => t.direction === 'incoming' && t.status === 'pending').length);
      })
      .catch(() => {});

  useEffect(() => {
    apiFetchFriends().then((r) => setFriends(r.players as Friend[])).catch(() => {});
    refreshTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const targetFriend = friends.find((f) => f.username === target);
  // La carte secrète n'est jamais proposable — `theirOwned` vient déjà
  // filtrée du serveur (voir functions/api/profile/[username].ts), mais
  // `owned` est notre état local complet : on l'exclut ici aussi.
  const myDupes = useMemo(
    () => Object.entries(owned).filter(([id, n]) => n > 1 && Number(id) !== SECRET_CARD?.id).map(([id]) => Number(id)),
    [owned],
  );
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
        <div className="section-label" style={{ marginBottom: 10 }}>Proposer un échange</div>
        {friends.length === 0 ? (
          <p style={{ fontSize: 12, opacity: 0.5 }}>Aucun autre joueur pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {friends.map((f) => {
              const active = target === f.username;
              return (
                <button
                  key={f.username}
                  className="pressable"
                  onClick={() => setTarget(active ? null : f.username)}
                  style={{
                    flex: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    border: 0,
                    background: 'none',
                    cursor: 'pointer',
                    width: 64,
                  }}
                >
                  <div style={{ borderRadius: '50%', padding: 3, boxShadow: active ? '0 0 0 2px var(--color-accent)' : 'none' }}>
                    <Avatar avatar={f.avatar} photo={f.avatarPhoto} size={48} boxShadow="var(--shadow-sm)" />
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? 'var(--color-accent-800)' : 'var(--color-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {f.username}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {target && (
        <div className="screen-inner" style={{ paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <CardPicker
            label="Tu proposes (tes doublons)"
            ids={myDupes}
            counts={owned}
            selected={offer}
            onToggle={(id) => toggle(offer, setOffer, id)}
            holoAnim={holoAnim}
            empty="Aucun doublon à proposer."
          />
          <CardPicker
            label={`Tu demandes (doublons de ${target})`}
            ids={theirDupes}
            counts={theirOwned ?? {}}
            selected={request}
            onToggle={(id) => toggle(request, setRequest, id)}
            holoAnim={holoAnim}
            loading={theirOwned == null}
            empty={`${targetFriend?.username ?? target} n'a aucun doublon pour l'instant.`}
          />

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((t) => (
              <TradeRow key={t.id} trade={t} friends={friends} onRespond={respond} onOpen={navigate} holoAnim={holoAnim} />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="screen-inner" style={{ paddingTop: 22, paddingBottom: 12 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Historique</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resolved.slice(0, 12).map((t) => (
              <TradeRow key={t.id} trade={t} friends={friends} onRespond={respond} onOpen={navigate} holoAnim={holoAnim} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Grille de vraies vignettes de carte (au lieu de chips de texte) — coche
 *  visuelle quand sélectionnée, badge ×N pour le nombre de doublons. */
function CardPicker({
  label,
  ids,
  counts,
  selected,
  onToggle,
  holoAnim,
  loading,
  empty,
}: {
  label: string;
  ids: number[];
  counts: Record<string, number>;
  selected: Record<string, number>;
  onToggle: (id: number) => void;
  holoAnim: boolean;
  loading?: boolean;
  empty: string;
}) {
  return (
    <div>
      <div className="section-label" style={{ marginBottom: 9 }}>{label}</div>
      {loading ? (
        <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Chargement…</p>
      ) : ids.length === 0 ? (
        <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>{empty}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
          {ids.map((id) => {
            const card = cardById(id);
            if (!card) return null;
            const active = !!selected[id];
            const count = counts[id] ?? counts[String(id)] ?? 0;
            return (
              <div
                key={id}
                className="pressable"
                onClick={() => onToggle(id)}
                style={{ position: 'relative', aspectRatio: '0.72', cursor: 'pointer', minWidth: 0, borderRadius: 15, boxShadow: active ? '0 0 0 3px var(--color-accent)' : 'none' }}
              >
                <PigCard card={card} holoAnim={holoAnim} ownedCount={1} />
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    background: 'var(--color-neutral-900)',
                    color: 'var(--color-bg)',
                    fontSize: 7.5,
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: 999,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  ×{count}
                </span>
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      width: 17,
                      height: 17,
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      color: 'var(--color-bg)',
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardStrip({ ids, holoAnim }: { ids: number[]; holoAnim: boolean }) {
  if (ids.length === 0) return <span style={{ fontSize: 11.5, opacity: 0.4 }}>—</span>;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ids.map((id) => {
        const card = cardById(id);
        if (!card) return null;
        return (
          <div key={id} style={{ width: 34, aspectRatio: '0.72', flex: 'none' }} title={card.name}>
            <PigCard card={card} holoAnim={holoAnim} ownedCount={1} />
          </div>
        );
      })}
    </div>
  );
}

function TradeRow({
  trade,
  friends,
  onRespond,
  onOpen,
  holoAnim,
}: {
  trade: Trade;
  friends: Friend[];
  onRespond: (id: number, action: 'accept' | 'decline' | 'cancel') => void;
  onOpen: (path: string) => void;
  holoAnim: boolean;
}) {
  const other = trade.direction === 'outgoing' ? trade.toUsername : trade.fromUsername;
  const mine = trade.direction === 'outgoing' ? trade.offer : trade.request;
  const theirs = trade.direction === 'outgoing' ? trade.request : trade.offer;
  const otherFriend = friends.find((f) => f.username === other);

  return (
    <div style={{ padding: '13px 14px', borderRadius: 22, background: 'var(--color-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <button
          onClick={() => onOpen(`/players/${other}`)}
          style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Avatar avatar={otherFriend?.avatar ?? 'truffe-rose'} photo={otherFriend?.avatarPhoto} size={30} boxShadow="none" />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--color-text)' }}>{other}</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', opacity: 0.45, marginBottom: 5 }}>Tu donnes</div>
          <CardStrip ids={Object.keys(mine).map(Number)} holoAnim={holoAnim} />
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', opacity: 0.45, marginBottom: 5 }}>Tu reçois</div>
          <CardStrip ids={Object.keys(theirs).map(Number)} holoAnim={holoAnim} />
        </div>
      </div>
      {trade.status === 'pending' && (
        <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
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

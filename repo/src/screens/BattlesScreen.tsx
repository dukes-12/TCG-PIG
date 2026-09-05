import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import BattleResultOverlay from '../components/BattleResultOverlay';
import Chip from '../components/Chip';
import PigCard from '../components/PigCard';
import { CARDS, SECRET_RARITY_ID, cardById } from '../data/catalog';
import { apiCreateBattle, apiFetchBattles, apiFetchFriends, apiRespondBattle, type Battle, type TeamSlot } from '../lib/api';
import { randomBotTeam, resolveBattle as resolveBattleLocally, type BotDifficulty } from '../lib/battle';
import { useAnimations } from '../lib/useAnimations';
import { useStore } from '../state/store';
import type { AvatarKey } from '../types';

const BOT_LABEL: Record<BotDifficulty, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };

interface Friend {
  username: string;
  avatar: AvatarKey;
  avatarPhoto: string | null;
}

const STATUS_LABEL: Record<Battle['status'], string> = {
  pending: 'En attente',
  completed: 'Terminé',
  declined: 'Refusé',
  cancelled: 'Annulé',
};

/** Combats entre joueurs — voir IDEES_AMIS_COMBAT.md pour la conception.
 *  Même charpente que TradesScreen (choisir un ami, composer, liste en
 *  attente/historique) : compose ton équipe (5 cartes parmi ta collection,
 *  holo préférée par défaut à rareté égale — c'est toujours strictement
 *  plus fort, voir cardPower dans functions/_lib/battle.ts), défie, ou
 *  réponds à un défi reçu avec ta propre équipe. Résolu et validé
 *  entièrement côté serveur — jamais recalculé ni fait confiance ici. */
export default function BattlesScreen() {
  const owned = useStore((s) => s.owned);
  const ownedHolo = useStore((s) => s.ownedHolo);
  const say = useStore((s) => s.say);
  const account = useStore((s) => s.account);
  const holoAnim = useAnimations();
  const [params, setParams] = useSearchParams();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  // `compose` : un nouveau défi (target = pseudo), une réponse à un défi
  // reçu (respondTo = son id), ou un test contre un bot (bot = difficulté)
  // — même sélecteur d'équipe pour les trois, seul le bouton final et ce
  // qui se passe à la soumission changent.
  const [compose, setCompose] = useState<{ target: string; respondTo?: number; bot?: BotDifficulty } | null>(null);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('moyen');
  const [team, setTeam] = useState<TeamSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<Battle | null>(null);

  const refresh = () => apiFetchBattles().then((r) => setBattles(r.battles)).catch(() => {});

  useEffect(() => {
    apiFetchFriends().then((r) => setFriends(r.players as Friend[])).catch(() => {});
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrivée depuis "Défier" sur la fiche d'un ami (?vs=pseudo).
  useEffect(() => {
    const vs = params.get('vs');
    if (vs) {
      setCompose({ target: vs });
      setTeam([]);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Cartes qu'on peut aligner : possédées (classique et/ou holo), jamais la
  // secrète. Holo préférée par défaut si les deux existent — strictement
  // plus fort à rareté égale, aucune raison de choisir la classique.
  const eligible = useMemo(
    () =>
      CARDS.filter((c) => c.rarity !== SECRET_RARITY_ID && ((owned[c.id] || 0) > 0 || (ownedHolo[c.id] || 0) > 0))
        .map((c) => ({ card: c, holo: (ownedHolo[c.id] || 0) > 0 }))
        .sort((a, b) => b.card.rarity - a.card.rarity || a.card.name.localeCompare(b.card.name)),
    [owned, ownedHolo],
  );

  const toggleCard = (cardId: number, holo: boolean) => {
    setTeam((t) => {
      if (t.some((s) => s.cardId === cardId)) return t.filter((s) => s.cardId !== cardId);
      if (t.length >= 5) return t;
      return [...t, { cardId, holo }];
    });
  };

  const startChallenge = (username: string) => {
    setCompose({ target: username });
    setTeam([]);
  };

  const startBotChallenge = () => {
    setCompose({ target: `Bot (${BOT_LABEL[botDifficulty]})`, bot: botDifficulty });
    setTeam([]);
  };

  const startRespond = (b: Battle) => {
    setCompose({ target: b.challengerUsername, respondTo: b.id });
    setTeam([]);
  };

  const cancelCompose = () => {
    setCompose(null);
    setTeam([]);
  };

  const submit = async () => {
    if (!compose || team.length !== 5) return;
    setBusy(true);
    try {
      if (compose.bot) {
        // Zone de test — tout se passe en local, jamais d'appel serveur ni
        // de ligne ajoutée à l'historique (pas un vrai adversaire, pas de
        // compte). Graine aléatoire à chaque défi pour ne pas rejouer
        // toujours le même combat contre la même équipe de bot.
        const opponentTeam = randomBotTeam(compose.bot);
        const result = resolveBattleLocally(Math.floor(Math.random() * 2 ** 31), team, opponentTeam);
        setViewing({
          id: -1,
          challengerUsername: account ?? 'Toi',
          opponentUsername: compose.target,
          challengerTeam: team,
          opponentTeam,
          result,
          status: 'completed',
          createdAt: Date.now(),
          resolvedAt: Date.now(),
          direction: 'outgoing',
        });
      } else if (compose.respondTo) {
        const res = await apiRespondBattle(compose.respondTo, 'respond', team);
        say(res.result?.winner === 'tie' ? 'Combat terminé — égalité' : 'Combat terminé !');
        await refresh();
        const updated = (await apiFetchBattles()).battles.find((b) => b.id === compose.respondTo);
        if (updated) setViewing(updated);
      } else {
        await apiCreateBattle(compose.target, team);
        say(`Défi envoyé à ${compose.target}`);
        refresh();
      }
      cancelCompose();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Erreur.');
    } finally {
      setBusy(false);
    }
  };

  const respondSimple = async (id: number, action: 'decline' | 'cancel') => {
    try {
      await apiRespondBattle(id, action);
      say(action === 'decline' ? 'Défi refusé' : 'Défi annulé');
      refresh();
    } catch (e) {
      say(e instanceof Error ? e.message : 'Erreur.');
    }
  };

  const pending = battles.filter((b) => b.status === 'pending');
  const resolved = battles.filter((b) => b.status !== 'pending');
  const teamPreview = team.map((s) => cardById(s.cardId)).filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <div className="screen">
      <div className="screen-inner">
        <h1 style={{ fontSize: 30, margin: 0, lineHeight: 1 }}>Combats</h1>
        <p style={{ fontSize: 13, opacity: 0.6, margin: '10px 0 0', textWrap: 'pretty' as const }}>
          5 cartes, la rareté fait la puissance (holo = +50%). Asynchrone : ton adversaire répond quand il veut.
        </p>
      </div>

      {!compose && (
        <div className="screen-inner" style={{ paddingTop: 18 }}>
          <div style={{ padding: 14, borderRadius: 22, background: 'var(--color-surface)', border: '1.5px dashed var(--color-accent-500)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14 }}>Zone de test</div>
                <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 2 }}>Combat immédiat contre un bot, en local — rien n'est envoyé au serveur.</div>
              </div>
            </div>
            <div className="chip-row" style={{ marginBottom: 10 }}>
              {(Object.keys(BOT_LABEL) as BotDifficulty[]).map((d) => (
                <Chip key={d} label={BOT_LABEL[d]} active={botDifficulty === d} onClick={() => setBotDifficulty(d)} />
              ))}
            </div>
            <button
              className="pressable"
              onClick={startBotChallenge}
              style={{
                cursor: 'pointer',
                border: 0,
                fontFamily: 'var(--font-heading)',
                fontSize: 12,
                padding: '9px 16px',
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
              }}
            >
              Défier un bot
            </button>
          </div>
        </div>
      )}

      {!compose && (
        <div className="screen-inner" style={{ paddingTop: 18 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Défier</div>
          {friends.length === 0 ? (
            <p style={{ fontSize: 12, opacity: 0.5 }}>Aucun autre joueur pour l'instant.</p>
          ) : (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {friends.map((f) => (
                <button
                  key={f.username}
                  className="pressable"
                  onClick={() => startChallenge(f.username)}
                  style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: 0, background: 'none', cursor: 'pointer', width: 64 }}
                >
                  <Avatar avatar={f.avatar} photo={f.avatarPhoto} size={48} boxShadow="var(--shadow-sm)" />
                  <span style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{f.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {compose && (
        <div className="screen-inner" style={{ paddingTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div className="section-label" style={{ margin: 0 }}>
              {compose.respondTo ? `Répondre au défi de ${compose.target}` : `Composer ton équipe contre ${compose.target}`}
            </div>
            <button className="pressable" onClick={cancelCompose} style={{ marginLeft: 'auto', border: 0, background: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.5 }}>
              Annuler
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '10px 0', minHeight: 60 }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const slot = team[i];
              const card = slot ? cardById(slot.cardId) : null;
              return (
                <div key={i} style={{ width: 46, aspectRatio: '0.72', flex: 'none', borderRadius: 10, background: 'var(--color-neutral-200)', overflow: 'hidden' }}>
                  {card ? <PigCard card={card} holoAnim={holoAnim} ownedCount={1} isHolo={slot!.holo} /> : null}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 10 }}>{team.length}/5 — {teamPreview.map((c) => c.name).join(', ') || 'aucune carte choisie'}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, maxHeight: '38vh', overflowY: 'auto' }}>
            {eligible.map(({ card, holo }) => {
              const active = team.some((s) => s.cardId === card.id);
              return (
                <div
                  key={card.id}
                  className="pressable"
                  onClick={() => toggleCard(card.id, holo)}
                  style={{ position: 'relative', aspectRatio: '0.72', cursor: 'pointer', minWidth: 0, borderRadius: 15, boxShadow: active ? '0 0 0 3px var(--color-accent)' : 'none' }}
                >
                  <PigCard card={card} holoAnim={holoAnim} ownedCount={1} isHolo={holo} />
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

          <button
            className="pressable"
            onClick={submit}
            disabled={busy || team.length !== 5}
            style={{
              marginTop: 14,
              cursor: 'pointer',
              border: 0,
              fontFamily: 'var(--font-heading)',
              fontSize: 15,
              padding: '13px',
              borderRadius: 999,
              width: '100%',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              opacity: busy || team.length !== 5 ? 0.5 : 1,
            }}
          >
            {compose.respondTo ? 'Répondre au défi' : compose.bot ? 'Lancer le combat' : 'Lancer le défi'}
          </button>
        </div>
      )}

      {!compose && pending.length > 0 && (
        <div className="screen-inner" style={{ paddingTop: 22 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>En attente</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((b) => (
              <BattleRow key={b.id} battle={b} account={account} onRespond={startRespond} onDecline={(id) => respondSimple(id, 'decline')} onCancel={(id) => respondSimple(id, 'cancel')} />
            ))}
          </div>
        </div>
      )}

      {!compose && resolved.length > 0 && (
        <div className="screen-inner" style={{ paddingTop: 22, paddingBottom: 12 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Historique</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resolved.slice(0, 12).map((b) => (
              <BattleRow key={b.id} battle={b} account={account} onOpen={() => setViewing(b)} />
            ))}
          </div>
        </div>
      )}

      {viewing && account && <BattleResultOverlay battle={viewing} myUsername={account} onClose={() => setViewing(null)} />}
    </div>
  );
}

function BattleRow({
  battle,
  account,
  onRespond,
  onDecline,
  onCancel,
  onOpen,
}: {
  battle: Battle;
  account: string | null;
  onRespond?: (b: Battle) => void;
  onDecline?: (id: number) => void;
  onCancel?: (id: number) => void;
  onOpen?: () => void;
}) {
  const other = battle.direction === 'outgoing' ? battle.opponentUsername : battle.challengerUsername;
  const wonBadge =
    battle.status === 'completed' && battle.result && account
      ? (battle.result.winner === 'challenger') === (battle.challengerUsername === account)
        ? 'Victoire'
        : battle.result.winner === 'tie'
          ? 'Égalité'
          : 'Défaite'
      : null;

  return (
    <div
      className={onOpen ? 'pressable' : undefined}
      onClick={onOpen}
      style={{ padding: '13px 14px', borderRadius: 22, background: 'var(--color-surface)', cursor: onOpen ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14 }}>
          {battle.direction === 'outgoing' ? `Toi vs ${other}` : `${other} vs toi`}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            padding: '3px 8px',
            borderRadius: 999,
            background: wonBadge === 'Victoire' ? 'var(--color-accent-2-200)' : battle.status === 'pending' ? 'var(--color-accent-200)' : 'var(--color-neutral-200)',
            color: wonBadge === 'Victoire' ? 'var(--color-accent-2-800)' : battle.status === 'pending' ? 'var(--color-accent-800)' : 'var(--color-neutral-600)',
          }}
        >
          {wonBadge ?? STATUS_LABEL[battle.status]}
        </span>
      </div>
      {battle.status === 'pending' && (
        <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
          {battle.direction === 'incoming' ? (
            <>
              <button className="pressable" onClick={() => onRespond?.(battle)} style={smallBtn('var(--color-accent)', 'var(--color-bg)')}>
                Répondre
              </button>
              <button className="pressable" onClick={() => onDecline?.(battle.id)} style={smallBtn('var(--color-neutral-200)', 'var(--color-text)')}>
                Refuser
              </button>
            </>
          ) : (
            <button className="pressable" onClick={() => onCancel?.(battle.id)} style={smallBtn('var(--color-neutral-200)', 'var(--color-text)')}>
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

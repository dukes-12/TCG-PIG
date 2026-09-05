import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CardDetailOverlay from './components/CardDetailOverlay';
import LotteryOverlay from './components/LotteryOverlay';
import WheelOverlay from './components/WheelOverlay';
import TabBar from './components/TabBar';
import Toast from './components/Toast';
import BattlesScreen from './screens/BattlesScreen';
import CollectionScreen from './screens/CollectionScreen';
import DupesScreen from './screens/DupesScreen';
import FriendsScreen from './screens/FriendsScreen';
import HoloCollectionScreen from './screens/HoloCollectionScreen';
import OpenScreen from './screens/OpenScreen';
import PlayerProfileScreen from './screens/PlayerProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import ShopScreen from './screens/ShopScreen';
import TradesScreen from './screens/TradesScreen';
import { useStore } from './state/store';

/** Le jeu se joue sans compte — tout se fait en local (comme avant les
 *  comptes) jusqu'à ce que le joueur se connecte ou s'inscrive depuis
 *  l'onglet Profil. `bootAuth` restaure juste une session déjà active
 *  (jeton en localStorage) au chargement ; elle ne bloque jamais le rendu :
 *  pas d'écran de connexion imposé, pas d'attente réseau avant de jouer. */
export default function App() {
  const account = useStore((s) => s.account);
  const bootAuth = useStore((s) => s.bootAuth);
  const reconcileDailyGrant = useStore((s) => s.reconcileDailyGrant);
  const reconcileFreeBoosters = useStore((s) => s.reconcileFreeBoosters);
  const reconcileWheel = useStore((s) => s.reconcileWheel);
  const fetchMailbox = useStore((s) => s.fetchMailbox);
  const fetchTradesUnread = useStore((s) => s.fetchTradesUnread);
  const fetchBattlesUnread = useStore((s) => s.fetchBattlesUnread);

  useEffect(() => {
    bootAuth();
  }, [bootAuth]);

  useEffect(() => {
    reconcileDailyGrant();
    const id = setInterval(reconcileDailyGrant, 60 * 1000);
    return () => clearInterval(id);
  }, [reconcileDailyGrant]);
  useEffect(() => {
    reconcileFreeBoosters();
    const id = setInterval(reconcileFreeBoosters, 1000);
    return () => clearInterval(id);
  }, [reconcileFreeBoosters]);
  useEffect(() => {
    reconcileWheel();
    const id = setInterval(reconcileWheel, 60 * 1000);
    return () => clearInterval(id);
  }, [reconcileWheel]);
  useEffect(() => {
    if (!account) return;
    fetchMailbox();
    const id = setInterval(fetchMailbox, 30 * 1000);
    return () => clearInterval(id);
  }, [account, fetchMailbox]);
  useEffect(() => {
    if (!account) return;
    fetchTradesUnread();
    const id = setInterval(fetchTradesUnread, 30 * 1000);
    return () => clearInterval(id);
  }, [account, fetchTradesUnread]);
  useEffect(() => {
    if (!account) return;
    fetchBattlesUnread();
    const id = setInterval(fetchBattlesUnread, 30 * 1000);
    return () => clearInterval(id);
  }, [account, fetchBattlesUnread]);

  // Échanges et vue "profil d'un ami" supposent un compte — sans, on renvoie
  // simplement vers Profil, où se trouve désormais la connexion/inscription.
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/collection" replace />} />
        <Route path="/collection" element={<CollectionScreen />} />
        <Route path="/collection/holo" element={<HoloCollectionScreen />} />
        <Route path="/shop" element={<ShopScreen />} />
        <Route path="/open" element={<OpenScreen />} />
        <Route path="/dupes" element={<DupesScreen />} />
        <Route path="/trades" element={account ? <TradesScreen /> : <Navigate to="/profile" replace />} />
        <Route path="/battles" element={account ? <BattlesScreen /> : <Navigate to="/profile" replace />} />
        <Route path="/friends" element={<FriendsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/players/:username" element={account ? <PlayerProfileScreen /> : <Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/collection" replace />} />
      </Routes>

      <TabBar />
      <CardDetailOverlay />
      <LotteryOverlay />
      <WheelOverlay />
      <Toast />
    </div>
  );
}

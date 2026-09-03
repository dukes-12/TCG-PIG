import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CardDetailOverlay from './components/CardDetailOverlay';
import TabBar from './components/TabBar';
import Toast from './components/Toast';
import AuthScreen from './screens/AuthScreen';
import CollectionScreen from './screens/CollectionScreen';
import DupesScreen from './screens/DupesScreen';
import OpenScreen from './screens/OpenScreen';
import PlayerProfileScreen from './screens/PlayerProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import ShopScreen from './screens/ShopScreen';
import TradesScreen from './screens/TradesScreen';
import { useStore } from './state/store';

export default function App() {
  const account = useStore((s) => s.account);
  const authReady = useStore((s) => s.authReady);
  const bootAuth = useStore((s) => s.bootAuth);
  const reconcileDailyGrant = useStore((s) => s.reconcileDailyGrant);
  const reconcileFreeBoosters = useStore((s) => s.reconcileFreeBoosters);

  useEffect(() => {
    bootAuth();
  }, [bootAuth]);

  useEffect(() => {
    if (!account) return;
    reconcileDailyGrant();
    const id = setInterval(reconcileDailyGrant, 60 * 1000);
    return () => clearInterval(id);
  }, [account, reconcileDailyGrant]);
  useEffect(() => {
    if (!account) return;
    reconcileFreeBoosters();
    const id = setInterval(reconcileFreeBoosters, 1000);
    return () => clearInterval(id);
  }, [account, reconcileFreeBoosters]);

  if (!authReady) return null; // évite un flash de l'écran de connexion pendant la vérification du jeton
  if (!account) return <AuthScreen />;

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/collection" replace />} />
        <Route path="/collection" element={<CollectionScreen />} />
        <Route path="/shop" element={<ShopScreen />} />
        <Route path="/open" element={<OpenScreen />} />
        <Route path="/dupes" element={<DupesScreen />} />
        <Route path="/trades" element={<TradesScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/players/:username" element={<PlayerProfileScreen />} />
        <Route path="*" element={<Navigate to="/collection" replace />} />
      </Routes>

      <TabBar />
      <CardDetailOverlay />
      <Toast />
    </div>
  );
}

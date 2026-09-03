import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CardDetailOverlay from './components/CardDetailOverlay';
import TabBar from './components/TabBar';
import Toast from './components/Toast';
import CollectionScreen from './screens/CollectionScreen';
import DupesScreen from './screens/DupesScreen';
import OpenScreen from './screens/OpenScreen';
import ProfileScreen from './screens/ProfileScreen';
import ShopScreen from './screens/ShopScreen';
import { useStore } from './state/store';

export default function App() {
  // Versement quotidien : on rattrape une fois au chargement (ce qui couvre
  // le temps passé app fermée), puis on revérifie chaque minute pour que les
  // sachets tombent en direct si l'app reste ouverte au passage de minuit.
  // Une minute suffit — inutile de sonder chaque seconde pour une échéance
  // quotidienne. Le store n'est touché (et localStorage écrit) que lorsqu'un
  // versement a réellement lieu.
  const reconcileDailyGrant = useStore((s) => s.reconcileDailyGrant);
  useEffect(() => {
    reconcileDailyGrant();
    const id = setInterval(reconcileDailyGrant, 60 * 1000);
    return () => clearInterval(id);
  }, [reconcileDailyGrant]);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/collection" replace />} />
        <Route path="/collection" element={<CollectionScreen />} />
        <Route path="/shop" element={<ShopScreen />} />
        <Route path="/open" element={<OpenScreen />} />
        <Route path="/dupes" element={<DupesScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/collection" replace />} />
      </Routes>

      <TabBar />
      <CardDetailOverlay />
      <Toast />
    </div>
  );
}

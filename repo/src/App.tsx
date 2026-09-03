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
  // Deux horloges cumulatives, réconciliées séparément :
  //   - le versement quotidien (+3 sachets, directement dans le stock) ;
  //   - le sac gratuit horaire (réserve à part, plafonnée à 3, à réclamer).
  // Chacune rattrape une fois au chargement (temps passé app fermée), puis se
  // revérifie en continu pour que les deux évoluent en direct si l'app reste
  // ouverte. La quotidienne se contente d'une minute — inutile de sonder plus
  // vite une échéance journalière ; l'horaire reste à la seconde pour que le
  // compte à rebours du bandeau boutique soit fluide.
  const reconcileDailyGrant = useStore((s) => s.reconcileDailyGrant);
  const reconcileFreeBoosters = useStore((s) => s.reconcileFreeBoosters);
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

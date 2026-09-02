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
  // Free-booster clock: catch up once on load (covers time elapsed while the
  // app was closed), then recheck every second so a stacked slot appears
  // live if the app is left open across the hour mark. Cheap — it only
  // touches the store (and thus localStorage) when a grant actually happens.
  const reconcileFreeBoosters = useStore((s) => s.reconcileFreeBoosters);
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

import { AppRouter } from './router/AppRouter';
import { PreferencesProvider } from './stores/PreferencesStore';

export function App() {
  return <PreferencesProvider><AppRouter /></PreferencesProvider>;
}

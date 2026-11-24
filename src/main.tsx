import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

const params = new URLSearchParams(window.location.search);
if (import.meta.env.DEV && params.get('character') === 'preview') {
  void import('./components/CharacterPreview').then(({ CharacterPreview }) => {
    root.render(<CharacterPreview />);
  });
} else {
  root.render(<App />);
}

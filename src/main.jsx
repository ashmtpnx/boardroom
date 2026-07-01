import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './app/store';
import App from './App';
import './index.css';

// NOTE: React.StrictMode is intentionally omitted. Fabric.js owns an imperative
// <canvas> instance and our realtime layer opens a BroadcastChannel; StrictMode's
// double-invoke of effects in dev causes flaky double-init of both. Effects still
// clean up properly (canvas.dispose / channel.close) — see useFabricCanvas / App.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

import { createRoot } from 'react-dom/client';
import { AdminApp } from './admin/App.tsx';
import './styles/global.css';
import './admin/admin.css';

createRoot(document.getElementById('root')!).render(<AdminApp />);

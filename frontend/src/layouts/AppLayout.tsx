import { Outlet } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';

export default function AppLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <TopBar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

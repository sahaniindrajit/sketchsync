import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Each page loads only its own code: visitors to the landing page don't download the board
// (Konva, sync, MathJax glue), and people opening a board don't download the landing page.
const Home = lazy(() => import('./pages/Home'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const BoardRedirect = lazy(() => import('./pages/BoardPage').then((m) => ({ default: m.BoardRedirect })));
const LegacyLiveRedirect = lazy(() => import('./pages/BoardPage').then((m) => ({ default: m.LegacyLiveRedirect })));
const NotFound = lazy(() => import('./components/404'));

function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/board" element={<BoardRedirect />} />
                    <Route path="/board/:roomId" element={<BoardPage />} />
                    <Route path="/live" element={<LegacyLiveRedirect />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;

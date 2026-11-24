import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Each page loads only its own code: visitors to the landing page don't download the board
// (Konva, sync, MathJax glue), and people opening a board don't download the landing page.
const Home = lazy(() => import('./pages/Home'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const BoardRedirect = lazy(() => import('./pages/BoardPage').then((m) => ({ default: m.BoardRedirect })));
const LegacyLiveRedirect = lazy(() => import('./pages/BoardPage').then((m) => ({ default: m.LegacyLiveRedirect })));
const NotFound = lazy(() => import('./components/404'));
const SignIn = lazy(() => import('./pages/SignIn'));
const AuthCallback = lazy(() => import('./pages/SignIn').then((m) => ({ default: m.AuthCallback })));
const Boards = lazy(() => import('./pages/Boards'));
const Authorize = lazy(() => import('./pages/Authorize'));

function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/board" element={<BoardRedirect />} />
                    <Route path="/board/:roomId" element={<BoardPage />} />
                    <Route path="/live" element={<LegacyLiveRedirect />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/boards" element={<Boards />} />
                    <Route path="/authorize" element={<Authorize />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;

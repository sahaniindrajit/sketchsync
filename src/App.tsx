import { BrowserRouter, Route, Routes } from 'react-router-dom';
import NotFound from './components/404';
import BoardPage, { BoardRedirect, LegacyLiveRedirect } from './pages/BoardPage';
import Home from './pages/Home';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/board" element={<BoardRedirect />} />
                <Route path="/board/:roomId" element={<BoardPage />} />
                <Route path="/live" element={<LegacyLiveRedirect />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;

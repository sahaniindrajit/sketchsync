import { Board } from '@/board/Board';
import { PeerCursors } from '@/components/presence';

/** The canvas half of the landing page, loaded after the headline has painted. */
export default function LiveCanvas() {
    return (
        <>
            <Board demo />
            <PeerCursors />
        </>
    );
}

import { useLocation, useNavigate } from "react-router-dom"
import { Board } from "./board"
import { useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';


function ColabBoard() {
    const navigate = useNavigate();
    const location = useLocation();
    const getRoomId = () => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get('roomId');
    };
    const roomId = getRoomId();
    useEffect(() => {
        if (roomId) {
            console.log(roomId)

        }
        else {
            const roomId = uuidv4();
            navigate(`/live?roomId=${roomId}`)
        }
    })

    return (
        <>

            <Board />
        </>
    )
}

export default ColabBoard
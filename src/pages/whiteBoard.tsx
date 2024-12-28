import React from "react"
import { Board } from "../components/board"

export const WhiteBoard = React.memo(function WhiteBoard() {

    return (
        <div>
            <Board />
        </div>
    )
})

import { Toolbar } from "@/components/toolBar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { activeToolState } from "@/recoil/atoms/toolBarState"
import { useRecoilState } from "recoil"

function handleDownload() {
    console.log("hii")
}

function WhiteBoard() {
    const [activeTool, setActiveTool] = useRecoilState(activeToolState)
    return (
        <div>
            <TooltipProvider>
                <Toolbar
                    selectedTool={activeTool}
                    onToolSelect={setActiveTool}
                    onDownload={handleDownload}
                />
            </TooltipProvider>
        </div>
    )
}

export default WhiteBoard
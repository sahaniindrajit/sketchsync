export default function Navbar() {
    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <img
                                src="/apple-touch-icon.png"
                                alt="SketchSync Interface"
                                className=" h-10 w-10  rounded-lg mx-2 shadow-2xl"
                            />
                            <span className="text-2xl font-bold text-purple-600">SketchSync</span>
                        </div>

                    </div>

                </div>
            </div>
        </nav>
    )
}


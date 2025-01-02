import { Button } from "@/components/ui/button"
import { ArrowRight, Brush, Users, MessageSquare, Share2, FileImage, Zap } from 'lucide-react'
import Navbar from "../components/navbar"
import Footer from "../components/footer"
import { useNavigate } from "react-router-dom"
import Safari from "../components/ui/safari";

export default function Home() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
            <Navbar />
            <main>
                {/* Hero Section */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <div className="text-center">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
                            Collaborate and Create with{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                                SketchSync
                            </span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                            A dynamic and intuitive whiteboard collaboration app that lets teams sketch, brainstorm, and share ideas in real time.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" onClick={() => navigate('/board')}>
                                Get Started
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>

                        </div>
                    </div>
                    <div className="mt-16 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg transform skew-y-6 sm:skew-y-0 sm:-rotate-3 sm:rounded-3xl"></div>
                        <div className="relative bg-white shadow-lg sm:rounded-3xl">
                            <div className="relative">
                                <Safari
                                    url="https://sketchsync.onrender.com"
                                    className="size-full"
                                    videoSrc="https://utfs.io/f/799t8sfip0HkKLdv68siMOmqvkaoXpjZVHRFfTB3gChYr76t"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Key Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: Brush, title: "Smooth Drawing", description: "Advanced drawing engine for a natural sketching experience" },
                            { icon: Users, title: "Real-time Collaboration", description: "Work together with instant syncing across all devices" },
                            { icon: Zap, title: "Multiple Tools", description: "Various drawing tools to suit your project needs" },
                            { icon: MessageSquare, title: "Live Commenting", description: "Add comments and annotations for effective feedback" },
                            { icon: Share2, title: "Easy Sharing", description: "Share sketches via email, link, or social media" },
                            { icon: FileImage, title: "Export Options", description: "Export as high-quality images or PDFs" },
                        ].map((feature, index) => (
                            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                                <feature.icon className="h-12 w-12 text-purple-600 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    )
}


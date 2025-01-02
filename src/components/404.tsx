import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
    const navigate = useNavigate()
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center space-y-6">
                <h1 className="text-6xl font-bold text-gray-900">404</h1>
                <h2 className="text-3xl font-semibold text-gray-700">Page Not Found</h2>
                <p className="text-xl text-gray-600 max-w-md">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>
                <Button size="lg" className="bg-red-500 hover:bg-red-600" onClick={() => navigate('/')}>
                    <Home className="mr-2 h-5 w-5" />
                    Back to Home
                </Button>
            </div>
        </div>
    )
}


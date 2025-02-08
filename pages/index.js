import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "@heroicons/react/24/solid";


export default function Home() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-800 text-white">
            {/* Hero Section */}
            <div className="flex flex-col items-center justify-center text-center h-screen">
                <motion.h1
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="text-6xl font-bold"
                >
                    Nexro 🚀
                </motion.h1>
                <p className="mt-4 text-lg text-gray-200 max-w-2xl">
                    The **AI-powered community** where **problems find solutions** and
                    **skills get rewarded**.
                </p>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => router.push("/auth/register")}
                    className="mt-6 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-lg flex items-center space-x-2"
                >
                    <span>Get Started</span>
                    <ArrowRightIcon className="h-5 w-5" />
                </motion.button>
            </div>

            {/* Features Section */}
            <div className="py-16 bg-white text-gray-900">
                <h2 className="text-center text-4xl font-semibold">Why Nexro?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-10 mt-8">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className="p-6 shadow-lg rounded-lg bg-gray-100 text-center"
                    >
                        <h3 className="text-2xl font-semibold">📢 Post Problems</h3>
                        <p className="mt-2 text-gray-600">Share challenges and get real-world solutions.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2 }}
                        className="p-6 shadow-lg rounded-lg bg-gray-100 text-center"
                    >
                        <h3 className="text-2xl font-semibold">💰 Earn Rewards</h3>
                        <p className="mt-2 text-gray-600">Get paid for solving problems & contributing value.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.4 }}
                        className="p-6 shadow-lg rounded-lg bg-gray-100 text-center"
                    >
                        <h3 className="text-2xl font-semibold">🌐 AI-Powered</h3>
                        <p className="mt-2 text-gray-600">Smart matching & insights for faster problem-solving.</p>
                    </motion.div>
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-4 bg-gray-900 text-gray-400">
                <p>© 2025 Nexro. All rights reserved.</p>
            </footer>
        </div>
    );
}

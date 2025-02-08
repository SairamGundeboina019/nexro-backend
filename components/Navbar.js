import { useRouter } from "next/router";

export default function Navbar() {
    const router = useRouter();
    return (
        <nav className="w-full py-4 bg-blue-700 text-white flex justify-between px-10">
            <h1 className="text-2xl font-bold cursor-pointer" onClick={() => router.push("/")}>Nexro</h1>
            <div className="space-x-4">
                <button className="bg-white text-blue-600 px-4 py-2 rounded" onClick={() => router.push("/auth/login")}>
                    Login
                </button>
                <button className="bg-white text-blue-600 px-4 py-2 rounded" onClick={() => router.push("/auth/register")}>
                    Sign Up
                </button>
            </div>
        </nav>
    );
}

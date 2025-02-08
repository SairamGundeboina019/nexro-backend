import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import API from "../utils/api";

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/auth/login");
        } else {
            API.get("/users/profile", { headers: { Authorization: `Bearer ${token}` } })
                .then((res) => setUser(res.data))
                .catch(() => router.push("/auth/login"));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/auth/login");
    };

    return user ? (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white shadow-md p-6 rounded-lg">
                <h2 className="text-2xl font-semibold">Welcome, {user.name}!</h2>
                <p className="text-gray-600">Email: {user.email}</p>
                <button onClick={handleLogout} className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                    Logout
                </button>
            </div>
        </div>
    ) : (
        <p className="text-center">Loading...</p>
    );
}

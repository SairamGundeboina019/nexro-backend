import React, { useState } from "react";
import { useRouter } from "next/router";
import API from "../utils/api";
import { toast } from "react-toastify";

const AuthForm = ({ isRegister }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isRegister) {
                await API.post("/users/register", { name, email, password });
                toast.success("Account created! Please log in.");
                router.push("/auth/login");
            } else {
                const res = await API.post("/users/login", { email, password });
                localStorage.setItem("token", res.data.token);
                toast.success("Welcome back!");
                router.push("/dashboard");
            }
        } catch (error) {
            toast.error(error.response?.data?.error || "Something went wrong");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
                    {isRegister ? "Create an Account" : "Welcome Back"}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition">
                        {isRegister ? "Sign Up" : "Login"}
                    </button>
                </form>
                <p className="mt-6 text-center text-gray-600">
                    {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                    <a
                        className="text-blue-500 hover:underline"
                        href={isRegister ? "/auth/login" : "/auth/register"}
                    >
                        {isRegister ? "Login" : "Sign up"}
                    </a>
                </p>
            </div>
        </div>
    );
};

export default AuthForm;

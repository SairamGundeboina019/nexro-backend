import '../styles/globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from "../components/Navbar";

function MyApp({ Component, pageProps }) {
    return (
        <>
            <Navbar />
            <ToastContainer position="top-right" autoClose={3000} />
            <Component {...pageProps} />
        </>
    );
}

export default MyApp;

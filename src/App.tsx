import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import CreateTeam from "./components/CreateTeam";
import Login from "./components/Login";
import Profile from "./components/Profile";
import Dashboard from "./components/Dashboard";
import JoinTeam from "./components/JoinTeam";
import Payment from "./components/Payment";
import Rulebook from "./components/Rulebook";
import Privacy from "./components/Privacy";
import Terms from "./components/Terms";

export default function App() {
    return (
        <div>
            <Router>
                <Routes>
                    <Route index element={<Home />}></Route>
                    <Route path="/create-team" element={<CreateTeam />}></Route>
                    <Route path="/join-team" element={<JoinTeam />}></Route>
                    <Route path="/login" element={<Login />}></Route>
                    <Route path="/profile" element={<Profile />}></Route>
                    <Route path="/team/:teamId" element={<Dashboard />}></Route>
                    <Route path="/:teamId/pay" element={<Payment />} />
                    <Route path="/rulebook" element={<Rulebook />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                </Routes>
            </Router>
        </div>
    );
}

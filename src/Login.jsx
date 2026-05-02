import { useState } from "react";
import { supabase } from "./supabase";

function Login({ onLogin }) {
  const [step, setStep] = useState("login"); // login or register
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!shopName || !phone || !password || !address || !ownerName) {
      setError("Please fill in all fields!"); return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("shops").insert([{
      shop_name: shopName,
      owner_name: ownerName,
      phone,
      address,
      password,
    }]).select().single();

    if (error) {
      setError("Phone number already registered!"); 
      setLoading(false); return;
    }
    onLogin(data);
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      setError("Please enter phone and password!"); return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("shops").select("*")
      .eq("phone", phone)
      .eq("password", password)
      .single();

    if (error || !data) {
      setError("Wrong phone or password!"); 
      setLoading(false); return;
    }
    onLogin(data);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="login-logo">🛒</div>
        <h1 className="login-title">KiranaQuick</h1>
        <p className="login-sub">Billing app for your shop</p>
      </div>

      <div className="login-card">
        <div className="login-tabs">
          <button className={step === "login" ? "ltab active" : "ltab"} onClick={() => { setStep("login"); setError(""); }}>Login</button>
          <button className={step === "register" ? "ltab active" : "ltab"} onClick={() => { setStep("register"); setError(""); }}>New Shop</button>
        </div>

        {step === "login" ? (
          <div className="login-form">
            <p className="form-label">Phone Number</p>
            <input placeholder="Enter your phone number" type="number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="form-label">Password</p>
            <input placeholder="Enter your password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="form-error">{error}</p>}
            <button className="login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? "Logging in..." : "Login →"}
            </button>
          </div>
        ) : (
          <div className="login-form">
            <p className="form-label">Shop Name</p>
            <input placeholder="e.g. Raju General Store" value={shopName} onChange={(e) => setShopName(e.target.value)} />
            <p className="form-label">Owner Name</p>
            <input placeholder="e.g. Raju Kumar" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            <p className="form-label">Phone Number</p>
            <input placeholder="e.g. 9876543210" type="number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <p className="form-label">Shop Address</p>
            <input placeholder="e.g. 12 Main Road, Hubballi" value={address} onChange={(e) => setAddress(e.target.value)} />
            <p className="form-label">Set Password</p>
            <input placeholder="Set a password for your shop" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="form-error">{error}</p>}
            <button className="login-btn" onClick={handleRegister} disabled={loading}>
              {loading ? "Registering..." : "Register Shop →"}
            </button>
          </div>
        )}
      </div>

      <p className="login-footer">Your data is safe and private</p>
    </div>
  );
}

export default Login;
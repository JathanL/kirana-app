import { useState } from "react";
import Scanner from "./Scanner";
import { supabase } from "./supabase";
import "./App.css";

const ADMIN_PASSWORD = "shop123";

function App() {
  const [activeTab, setActiveTab] = useState("billing");
  const [billItems, setBillItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [bills, setBills] = useState([]);
  const [productList, setProductList] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [wrongPassword, setWrongPassword] = useState(false);

  const checkPassword = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setShowSummary(true);
      setWrongPassword(false);
    } else {
      setWrongPassword(true);
    }
  };

  const addItemToBill = (barcode, name, price) => {
    setBillItems((prev) => {
      const existing = prev.find((i) => i.barcode === barcode);
      if (existing) {
        return prev.map((i) =>
          i.barcode === barcode ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { barcode, name, price, qty: 1 }];
    });
  };

  const promptPrice = async (barcode, suggestedName) => {
    const name = window.prompt(`Product name:`, suggestedName || "");
    if (!name) return;
    const price = parseFloat(window.prompt(`Price (₹):`));
    if (isNaN(price)) return;
    await supabase.from("products").insert([{ barcode, name, price }]);
    addItemToBill(barcode, name, price);
  };

  const handleScan = async (barcode) => {
    setShowScanner(false);
    const { data: localProduct } = await supabase
      .from("products").select("*").eq("barcode", barcode).single();
    if (localProduct) {
      addItemToBill(barcode, localProduct.name, localProduct.price);
      return;
    }
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1) {
        promptPrice(barcode, data.product.product_name || "");
      } else {
        promptPrice(barcode, "");
      }
    } catch {
      promptPrice(barcode, "");
    }
  };

  const changeQty = (barcode, delta) => {
    setBillItems((prev) =>
      prev.map((i) =>
        i.barcode === barcode ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      )
    );
  };

  const removeItem = (barcode) => {
    setBillItems((prev) => prev.filter((i) => i.barcode !== barcode));
  };

  const total = billItems.reduce((s, i) => s + i.price * i.qty, 0);

  const finalizeBill = async () => {
    if (billItems.length === 0) return;
    const { error } = await supabase.from("bills").insert([{
      total, subtotal: total, gst: 0, items: billItems,
    }]);
    if (error) { alert("Error saving bill: " + error.message); return; }
    setTodayTotal((prev) => prev + total);
    setBills((prev) => [
      { time: new Date().toLocaleTimeString(), amount: total, items: billItems.length },
      ...prev,
    ]);
    setBillItems([]);
    alert("Bill saved! ₹" + total);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProductList(data);
  };

  const addProduct = async () => {
    const barcode = document.getElementById("admin-barcode").value.trim();
    const name = document.getElementById("admin-name").value.trim();
    const price = parseFloat(document.getElementById("admin-price").value);
    if (!barcode || !name || isNaN(price)) { alert("Please fill in all fields!"); return; }
    const { error } = await supabase.from("products").upsert([{ barcode, name, price }]);
    if (error) { alert("Error: " + error.message); return; }
    document.getElementById("admin-barcode").value = "";
    document.getElementById("admin-name").value = "";
    document.getElementById("admin-price").value = "";
    alert(name + " saved!");
    loadProducts();
  };

  const deleteProduct = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  };

  return (
    <div className="app">

      {/* Header */}
      <div className="header">
        <div>
          <h1>🛒 KiranaQuick</h1>
          <p className="header-date">{new Date().toDateString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={activeTab === "billing" ? "tab active" : "tab"} onClick={() => setActiveTab("billing")}>🧾 Bill</button>
        <button className={activeTab === "summary" ? "tab active" : "tab"} onClick={() => { setActiveTab("summary"); setShowSummary(false); setPasswordInput(""); }}>📊 Sales</button>
        <button className={activeTab === "admin" ? "tab active" : "tab"} onClick={() => { setActiveTab("admin"); loadProducts(); }}>⚙️ Admin</button>
      </div>

      <div className="content">

        {/* BILLING TAB */}
        {activeTab === "billing" && (
          <div>
            {showScanner && <Scanner onScan={handleScan} />}

            <button className="scan-btn" onClick={() => setShowScanner(!showScanner)}>
              {showScanner ? "✕ Close Scanner" : "📷 Scan Barcode"}
            </button>

            {billItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛍️</div>
                <p className="empty-title">No items yet</p>
                <p className="empty-sub">Scan a barcode to add items to the bill</p>
              </div>
            ) : (
              <div className="bill-list">
                {billItems.map((item) => (
                  <div className="bill-item" key={item.barcode}>
                    <div className="item-info">
                      <p className="item-name">{item.name}</p>
                      <p className="item-price">₹{item.price} × {item.qty}</p>
                    </div>
                    <div className="qty-ctrl">
                      <button onClick={() => changeQty(item.barcode, -1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => changeQty(item.barcode, 1)}>+</button>
                    </div>
                    <div className="item-total">₹{item.price * item.qty}</div>
                    <button className="remove-btn" onClick={() => removeItem(item.barcode)}>×</button>
                  </div>
                ))}

                <div className="bill-footer">
                  <div className="bill-total-row">
                    <span>Total Amount</span>
                    <span className="big-total">₹{total}</span>
                  </div>
                  <div className="action-row">
                    <button className="clear-btn" onClick={() => setBillItems([])}>Clear</button>
                    <button className="generate-btn" onClick={finalizeBill}>✓ Done</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SALES SUMMARY TAB - password protected */}
        {activeTab === "summary" && (
          <div>
            {!showSummary ? (
              <div className="password-box">
                <div className="lock-icon">🔒</div>
                <p className="lock-title">Owner Access Only</p>
                <p className="lock-sub">Enter your password to view sales</p>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkPassword()}
                  className="password-input"
                />
                {wrongPassword && <p className="wrong-pass">Wrong password!</p>}
                <button className="generate-btn" onClick={checkPassword}>View Sales →</button>
              </div>
            ) : (
              <div>
                <div className="summary-total">
                  <p className="summary-label">Total collected today</p>
                  <p className="summary-amount">₹{todayTotal}</p>
                  <p className="summary-bills">{bills.length} bills generated</p>
                </div>
                {bills.length === 0 ? (
                  <p className="placeholder-text">No bills yet today</p>
                ) : (
                  bills.map((b, i) => (
                    <div className="bill-item" key={i}>
                      <div className="item-info">
                        <p className="item-name">{b.items} items</p>
                        <p className="item-price">{b.time}</p>
                      </div>
                      <div className="item-total">₹{b.amount}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === "admin" && (
          <div>
            <p className="admin-heading">Add products with fixed prices</p>
            <div className="admin-form">
              <input id="admin-barcode" placeholder="Barcode number" type="number" />
              <input id="admin-name" placeholder="Product name (e.g. Boost 500ml)" />
              <input id="admin-price" placeholder="Price (₹)" type="number" />
              <button className="generate-btn" onClick={addProduct}>+ Add Product</button>
            </div>

            <div style={{ marginTop: "20px" }}>
              <p className="admin-list-title">Saved Products ({productList.length})</p>
              {productList.length === 0 ? (
                <p className="placeholder-text">No products added yet</p>
              ) : (
                productList.map((p) => (
                  <div className="bill-item" key={p.id}>
                    <div className="item-info">
                      <p className="item-name">{p.name}</p>
                      <p className="item-price">{p.barcode}</p>
                    </div>
                    <div className="item-total">₹{p.price}</div>
                    <button className="remove-btn" onClick={() => deleteProduct(p.id)}>×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
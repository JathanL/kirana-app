import { useState, useEffect } from "react";
import Scanner from "./Scanner";
import Login from "./Login";
import Bill from "./Bill";
import QRPayment from "./QRPayment";
import { supabase } from "./supabase";
import "./App.css";
import LooseBarcodes from "./LooseBarcodes";


function App() {
  const [shop, setShop] = useState(null);
  const [activeTab, setActiveTab] = useState("billing");
  const [billItems, setBillItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [bills, setBills] = useState([]);
  const [productList, setProductList] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [wrongPassword, setWrongPassword] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [lastBillItems, setLastBillItems] = useState([]);
  const [lastTotal, setLastTotal] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [onlineTotal, setOnlineTotal] = useState(0);
  const [cashTotal, setCashTotal] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [showLooseBarcodes, setShowLooseBarcodes] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("kirana-shop");
    if (saved) setShop(JSON.parse(saved));
  }, []);

  const handleLogin = (shopData) => {
    localStorage.setItem("kirana-shop", JSON.stringify(shopData));
    setShop(shopData);
  };

  const handleLogout = () => {
    localStorage.removeItem("kirana-shop");
    setShop(null);
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
    await supabase.from("products").insert([{ barcode, name, price, shop_id: shop.id }]);
    addItemToBill(barcode, name, price);
  };

  const handleScan = async (barcode) => {
  setShowScanner(false);

  const { data: localProduct } = await supabase
    .from("products").select("*")
    .eq("barcode", barcode)
    .eq("shop_id", shop.id)
    .single();

  if (localProduct) {
    if (localProduct.is_loose) {
      handleLooseItem(barcode, localProduct.name, localProduct.price, localProduct.unit);
    } else {
      addItemToBill(barcode, localProduct.name, localProduct.price);
    }
    return;
  }

  const { data: masterProduct } = await supabase
    .from("master_products").select("*")
    .eq("barcode", barcode)
    .single();

  if (masterProduct) {
    if (masterProduct.is_loose) {
      const rate = parseFloat(window.prompt(
        `Set your rate for ${masterProduct.name} (per ${masterProduct.unit}):`
      ));
      if (isNaN(rate)) return;
      await supabase.from("products").insert([{
        barcode,
        name: masterProduct.name,
        price: rate,
        shop_id: shop.id,
        is_loose: true,
        unit: masterProduct.unit
      }]);
      handleLooseItem(barcode, masterProduct.name, rate, masterProduct.unit);
    } else {
      addItemToBill(barcode, masterProduct.name, masterProduct.price);
    }
    return;
  }

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status === 1) {
      promptDetails(barcode, data.product.product_name || "");
    } else {
      promptDetails(barcode, "");
    }
  } catch {
    promptDetails(barcode, "");
  }
};

const handleLooseItem = (barcode, name, ratePerUnit, unit) => {
  const qty = parseFloat(window.prompt(
    `${name}\nRate: ₹${ratePerUnit}/${unit}\n\nEnter quantity (${unit}):`
  ));
  if (isNaN(qty) || qty <= 0) return;
  const price = Math.round(ratePerUnit * qty * 100) / 100;
  const uniqueBarcode = barcode + "_" + Date.now();
  setBillItems((prev) => [
    ...prev,
    {
      barcode: uniqueBarcode,
      name: `${name} (${qty}${unit})`,
      price,
      qty: 1,
      isLoose: true
    }
  ]);
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

  const finalizeBill = async (paymentType) => {
    if (billItems.length === 0) return;
    if (paymentType === "online") {
      setShowQR(true);
      return;
    }
    await saveBill("cash");
  };

  const saveBill = async (paymentType) => {
    const { error } = await supabase.from("bills").insert([{
      total, subtotal: total, gst: 0,
      items: billItems, shop_id: shop.id,
      payment_type: paymentType,
    }]);
    if (error) { alert("Error saving bill: " + error.message); return; }
    setTodayTotal((prev) => prev + total);
    setOnlineTotal((prev) => paymentType === "online" ? prev + total : prev);
    setCashTotal((prev) => paymentType === "cash" ? prev + total : prev);
    setBills((prev) => [
      { time: new Date().toLocaleTimeString(), amount: total, items: billItems.length, paymentType },
      ...prev,
    ]);
    setLastBillItems([...billItems]);
    setLastTotal(total);
    setBillItems([]);
    setShowQR(false);
    setShowBill(true);
  };

  const saveUPI = async () => {
    const upiId = document.getElementById("upi-id").value.trim();
    if (!upiId) return;
    const { error } = await supabase.from("shops")
      .update({ upi_id: upiId })
      .eq("id", shop.id);
    if (error) { alert("Error: " + error.message); return; }
    const updated = { ...shop, upi_id: upiId };
    localStorage.setItem("kirana-shop", JSON.stringify(updated));
    setShop(updated);
    alert("UPI ID saved!");
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*")
      .eq("shop_id", shop.id).order("name");
    if (data) setProductList(data);
  };

  const addProduct = async () => {
    const barcode = document.getElementById("admin-barcode").value.trim();
    const name = document.getElementById("admin-name").value.trim();
    const price = parseFloat(document.getElementById("admin-price").value);
    if (!barcode || !name || isNaN(price)) { alert("Please fill in all fields!"); return; }
    const { error } = await supabase.from("products").upsert([{ barcode, name, price, shop_id: shop.id }]);
    if (error) { alert("Error: " + error.message); return; }
    document.getElementById("admin-barcode").value = "";
    document.getElementById("admin-name").value = "";
    document.getElementById("admin-price").value = "";
    alert(name + " saved!");
    loadProducts();
  };
  const addMasterProduct = async () => {
  const barcode = document.getElementById("master-barcode").value.trim();
  const name = document.getElementById("master-name").value.trim();
  const isLoose = document.getElementById("master-loose").checked;
  const unit = document.getElementById("master-unit").value;
  const price = isLoose ? 0 : parseFloat(document.getElementById("master-price").value);

  if (!barcode || !name) { alert("Please fill in all fields!"); return; }
  if (!isLoose && isNaN(price)) { alert("Please enter price!"); return; }

  const { error } = await supabase.from("master_products").upsert([{
    barcode, name, price, is_loose: isLoose, unit
  }]);
  if (error) { alert("Error: " + error.message); return; }

  document.getElementById("master-barcode").value = "";
  document.getElementById("master-name").value = "";
  document.getElementById("master-price").value = "";
  document.getElementById("master-loose").checked = false;
  alert(name + " added to master database!");
};
  const deleteProduct = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  };

  const checkPassword = () => {
  if (passwordInput === shop.password) {
    setShowSummary(true); setWrongPassword(false);
  } else { setWrongPassword(true); }
  };
  if (showLooseBarcodes) return (
  <LooseBarcodes onClose={() => setShowLooseBarcodes(false)} />
);
  if (!shop) return <Login onLogin={handleLogin} />;

  if (showQR) return (
    <QRPayment
      shop={shop}
      total={total}
      onConfirm={() => saveBill("online")}
      onCancel={() => setShowQR(false)}
    />
  );

  if (showBill) return (
    <Bill shop={shop} items={lastBillItems} total={lastTotal} onClose={() => setShowBill(false)} />
  );

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>🛒 {shop.shop_name}</h1>
          <p className="header-date">{shop.address}</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      <div className="tabs">
        <button className={activeTab === "billing" ? "tab active" : "tab"} onClick={() => setActiveTab("billing")}>🧾 Bill</button>
        <button className={activeTab === "summary" ? "tab active" : "tab"} onClick={() => { setActiveTab("summary"); setShowSummary(false); setPasswordInput(""); }}>📊 Sales</button>
        <button className={activeTab === "admin" ? "tab active" : "tab"} onClick={() => { setActiveTab("admin"); loadProducts(); }}>⚙️ Admin</button>
      </div>

      <div className="content">

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
      {editingItem === item.barcode ? (
        <div style={{display:"flex", gap:"6px", alignItems:"center", marginTop:"4px"}}>
          <span style={{fontSize:"12px"}}>₹</span>
          <input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            style={{width:"70px", padding:"3px 6px", border:"1px solid #1a472a", borderRadius:"6px", fontSize:"13px"}}
            autoFocus
          />
          <button
            onClick={() => {
              const newPrice = parseFloat(editPrice);
              if (!isNaN(newPrice)) {
                setBillItems((prev) => prev.map((i) =>
                  i.barcode === item.barcode ? { ...i, price: newPrice } : i
                ));
              }
              setEditingItem(null);
            }}
            style={{background:"#1a472a", color:"white", border:"none", borderRadius:"6px", padding:"3px 8px", fontSize:"12px", cursor:"pointer"}}
          >
            ✓
          </button>
          <button
            onClick={() => setEditingItem(null)}
            style={{background:"#eee", border:"none", borderRadius:"6px", padding:"3px 8px", fontSize:"12px", cursor:"pointer"}}
          >
            ✕
          </button>
        </div>
      ) : (
        <p className="item-price" onClick={() => { setEditingItem(item.barcode); setEditPrice(item.price.toString()); }} style={{cursor:"pointer"}}>
          ₹{item.price} × {item.qty} <span style={{color:"#1a472a", fontSize:"11px"}}>✏️ edit</span>
        </p>
      )}
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
                  <p style={{fontSize:"13px", color:"#888", marginBottom:"10px", textAlign:"center"}}>
                    How is the customer paying?
                  </p>
                  <div className="action-row">
                    <button className="pay-cash-btn" onClick={() => finalizeBill("cash")}>💵 Cash</button>
                    <button className="pay-online-btn" onClick={() => finalizeBill("online")}>📱 Online</button>
                  </div>
                  <button className="clear-btn" style={{width:"100%", marginTop:"10px"}} onClick={() => setBillItems([])}>
                    Clear Bill
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div>
            {!showSummary ? (
              <div className="password-box">
                <div className="lock-icon">🔒</div>
                <p className="lock-title">Owner Access Only</p>
                <p className="lock-sub">Enter your password to view sales</p>
                <input type="password" placeholder="Enter password" value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkPassword()}
                  className="password-input" />
                {wrongPassword && <p className="wrong-pass">Wrong password!</p>}
                <button className="generate-btn" onClick={checkPassword}>View Sales →</button>
              </div>
            ) : (
              <div>
                <div className="summary-total">
                  <p className="summary-label">Total collected today</p>
                  <p className="summary-amount">₹{todayTotal}</p>
                  <p className="summary-bills">{bills.length} bills generated</p>
                  <div className="payment-split">
                    <div className="split-item">
                      <span className="split-icon">💵</span>
                      <span className="split-label">Cash</span>
                      <span className="split-amt">₹{cashTotal}</span>
                    </div>
                    <div className="split-divider"></div>
                    <div className="split-item">
                      <span className="split-icon">📱</span>
                      <span className="split-label">Online</span>
                      <span className="split-amt">₹{onlineTotal}</span>
                    </div>
                  </div>
                </div>
                {bills.length === 0 ? (
                  <p className="placeholder-text">No bills yet today</p>
                ) : (
                  bills.map((b, i) => (
                    <div className="bill-item" key={i}>
                      <div className="item-info">
                        <p className="item-name">{b.items} items · {b.paymentType === "online" ? "📱 Online" : "💵 Cash"}</p>
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

        {activeTab === "admin" && (
          <div>
            <p className="admin-heading">Manage your shop settings</p>
            <button
  style={{width:"100%", marginBottom:"16px", padding:"12px", border:"2px solid #1a472a", color:"#1a472a", background:"white", borderRadius:"12px", fontSize:"14px", fontWeight:"600", cursor:"pointer"}}
  onClick={() => setShowLooseBarcodes(true)}
>
  🏷️ View & Print Loose Item Barcodes
</button>
            <div className="admin-form">
              <p style={{fontSize:"13px", fontWeight:"600", marginBottom:"4px"}}>Your UPI ID</p>
              <div style={{display:"flex", gap:"8px", marginBottom:"16px"}}>
                <input id="upi-id" placeholder="e.g. shopname@upi" defaultValue={shop.upi_id || ""} />
                <button className="generate-btn" style={{flex:"0 0 auto", padding:"11px 16px"}} onClick={saveUPI}>Save</button>
              </div>
              <p style={{fontSize:"13px", fontWeight:"600", marginBottom:"4px"}}>Add Products</p>
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
           <div style={{marginTop:"20px"}}>
  <p className="admin-list-title">Master Product Database</p>
  <p style={{fontSize:"12px", color:"#888", marginBottom:"10px"}}>
    Products here are available to ALL shops
  </p>
  <div className="admin-form">
    <input id="master-barcode" placeholder="Barcode (e.g. LOOSE001 or scan)" type="text" />
    <input id="master-name" placeholder="Product name (e.g. Rice, Maggi)" />
    <div style={{display:"flex", alignItems:"center", gap:"10px", padding:"8px 0"}}>
      <input id="master-loose" type="checkbox" style={{width:"18px", height:"18px"}}
        onChange={(e) => {
          document.getElementById("master-price-div").style.display = e.target.checked ? "none" : "block";
          document.getElementById("master-unit-div").style.display = e.target.checked ? "block" : "none";
        }}
      />
      <label htmlFor="master-loose" style={{fontSize:"14px"}}>
        Loose item (rice, dal, sugar etc.)
      </label>
    </div>
    <div id="master-unit-div" style={{display:"none"}}>
      <select id="master-unit" style={{padding:"11px 14px", border:"1.5px solid #e8e8e8", borderRadius:"10px", fontSize:"14px", background:"#fafafa", width:"100%"}}>
        <option value="kg">kg</option>
        <option value="g">grams</option>
        <option value="litre">litre</option>
        <option value="ml">ml</option>
      </select>
    </div>
    <div id="master-price-div">
      <input id="master-price" placeholder="MRP Price (₹) — for packed items" type="number" />
    </div>
    <button className="generate-btn" onClick={addMasterProduct}>
      + Add to Master Database
    </button>
  </div>
</div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
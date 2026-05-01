import { useState } from "react";
import Scanner from "./Scanner";
import "./App.css";
import { supabase } from './supabase'

const PRODUCTS = {
  "8901030868484": { name: "Tata Salt 1kg", price: 28 },
  "8901499002211": { name: "Aashirvaad Atta 5kg", price: 270 },
  "8906000000004": { name: "Amul Butter 100g", price: 56 },
  "8901058851773": { name: "Maggi Noodles 70g", price: 14 },
  "8901030912117": { name: "Tata Tea Gold 250g", price: 105 },
  "8901764100014": { name: "Parle-G Biscuits 80g", price: 10 },
  "8901526109072": { name: "Sunflower Oil 1L", price: 148 },
  "8901088053750": { name: "Colgate ToothPaste 100g", price: 65 },
};

function App() {
  const [activeTab, setActiveTab] = useState("billing");
  const [billItems, setBillItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [bills, setBills] = useState([]);

  const handleScan = async (barcode) => {
  setShowScanner(false);

  // First check our own database
  const { data: localProduct } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (localProduct) {
    addItemToBill(barcode, localProduct.name, localProduct.price);
    return;
  }

  // If not found locally, try Open Food Facts API
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();

    if (data.status === 1) {
      const name = data.product.product_name || 'Unknown Product';
      const price = 0;
      promptPrice(barcode, name, price);
    } else {
      promptPrice(barcode, '', 0);
    }
  } catch (err) {
    promptPrice(barcode, '', 0);
  }
};

const promptPrice = async (barcode, suggestedName, suggestedPrice) => {
  const name = window.prompt(`Product name:`, suggestedName || '');
  if (!name) return;
  const price = parseFloat(window.prompt(`Price (₹):`, suggestedPrice || ''));
  if (isNaN(price)) return;

  // Save to our products table for next time
  await supabase.from('products').insert([{ barcode, name, price }]);
  addItemToBill(barcode, name, price);
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
    setShowScanner(false);
    setBillItems((prev) => {
      const existing = prev.find((i) => i.barcode === barcode);
      if (existing) {
        return prev.map((i) =>
          i.barcode === barcode ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { barcode, name: product.name, price: product.price, qty: 1 }];
    });
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

  const subtotal = billItems.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

 const finalizeBill = async () => {
  if (billItems.length === 0) return;

  const { error } = await supabase.from('bills').insert([{
    total: total,
    subtotal: subtotal,
    gst: gst,
    items: billItems,
  }]);

  if (error) {
    alert('Error saving bill: ' + error.message);
    return;
  }

  setTodayTotal((prev) => prev + total);
  setBills((prev) => [
    { time: new Date().toLocaleTimeString(), amount: total, items: billItems.length },
    ...prev,
  ]);
  setBillItems([]);
  alert('Bill saved! ₹' + total + ' added to today\'s total.');
};

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>KiranaQuick</h1>
          <p className="header-date">{new Date().toDateString()}</p>
        </div>
        <div className="header-sales">
          <p className="header-sales-label">Today's Sales</p>
          <p className="header-sales-amount">₹{todayTotal}</p>
        </div>
      </div>

      <div className="tabs">
        <button className={activeTab === "billing" ? "tab active" : "tab"} onClick={() => setActiveTab("billing")}>New Bill</button>
        <button className={activeTab === "summary" ? "tab active" : "tab"} onClick={() => setActiveTab("summary")}>Day Summary</button>
      </div>

      <div className="content">
        {activeTab === "billing" && (
          <div>
            {showScanner && <Scanner onScan={handleScan} />}

            <button className="scan-btn" onClick={() => setShowScanner(!showScanner)}>
              {showScanner ? "✕ Close Scanner" : "📷 Scan Barcode"}
            </button>

            {billItems.length === 0 ? (
              <p className="placeholder-text">🧾 No items yet — scan a barcode to start</p>
            ) : (
              <div className="bill-list">
                {billItems.map((item) => (
                  <div className="bill-item" key={item.barcode}>
                    <div className="item-info">
                      <p className="item-name">{item.name}</p>
                      <p className="item-price">₹{item.price} each</p>
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
                  <div className="bill-row"><span>Subtotal</span><span>₹{subtotal}</span></div>
                  <div className="bill-row"><span>GST (5%)</span><span>₹{gst}</span></div>
                  <div className="bill-row total"><span>Total</span><span>₹{total}</span></div>
                  <button className="generate-btn" onClick={finalizeBill}>✓ Generate Bill</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div>
            <div className="summary-total">
              <p className="summary-label">Total collected today</p>
              <p className="summary-amount">₹{todayTotal}</p>
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
    </div>
  );
}

export default App;
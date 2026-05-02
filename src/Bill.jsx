function Bill({ shop, items, total, onClose }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN");
  const timeStr = now.toLocaleTimeString("en-IN");

  const handlePrint = () => window.print();

  return (
    <div className="bill-overlay">
      <div className="bill-print" id="bill-print">
        <div className="bill-shop-name">{shop.shop_name}</div>
        <div className="bill-shop-info">{shop.address}</div>
        <div className="bill-shop-info">📞 {shop.phone}</div>
        <div className="bill-divider">--------------------------------</div>
        <div className="bill-meta">
          <span>{dateStr}</span>
          <span>{timeStr}</span>
        </div>
        <div className="bill-divider">--------------------------------</div>
        <table className="bill-table">
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Item</th>
              <th>Qty</th>
              <th style={{textAlign:"right"}}>Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{textAlign:"left"}}>{item.name}</td>
                <td style={{textAlign:"center"}}>{item.qty}</td>
                <td style={{textAlign:"right"}}>₹{item.price * item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bill-divider">--------------------------------</div>
        <div className="bill-total-line">
          <span>TOTAL</span>
          <span>₹{total}</span>
        </div>
        <div className="bill-divider">--------------------------------</div>
        <div className="bill-thank">Thank you! Visit again 🙏</div>
        <div className="bill-powered">Powered by KiranaQuick</div>
      </div>
      <div className="bill-actions">
        <button className="clear-btn" onClick={onClose}>← Back</button>
        <button className="generate-btn" onClick={handlePrint}>🖨️ Print</button>
      </div>
    </div>
  );
}

export default Bill;
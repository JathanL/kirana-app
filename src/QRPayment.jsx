function QRPayment({ shop, total, onConfirm, onCancel }) {
  return (
    <div className="qr-overlay">
      <div className="qr-card">
        <h2 className="qr-title">Online Payment</h2>
        <p className="qr-amount">₹{total}</p>
        <p className="qr-sub">Show this QR to the customer</p>

        {shop.upi_id ? (
          <div className="qr-box">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${shop.upi_id}&pn=${encodeURIComponent(shop.shop_name)}&am=${total}&cu=INR`}
              alt="UPI QR Code"
              style={{ width: "200px", height: "200px", borderRadius: "12px" }}
            />
            <p className="qr-upi-id">UPI: {shop.upi_id}</p>
          </div>
        ) : (
          <div className="qr-no-upi">
            <div style={{fontSize:"40px", marginBottom:"12px"}}>⚠️</div>
            <p>No UPI ID set!</p>
            <p style={{fontSize:"12px", color:"#888", marginTop:"6px"}}>Go to Admin tab and add your UPI ID</p>
          </div>
        )}

        <p className="qr-confirm-text">Confirm after customer pays</p>

        <div style={{display:"flex", gap:"10px", marginTop:"16px"}}>
          <button className="clear-btn" onClick={onCancel}>← Back</button>
          <button className="generate-btn" onClick={onConfirm}>✓ Payment Done</button>
        </div>
      </div>
    </div>
  );
}

export default QRPayment;
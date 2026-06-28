function LooseBarcodes({ onClose }) {
  const items = [
    { barcode: "LOOSE001", name: "Rice" },
    { barcode: "LOOSE002", name: "Sugar" },
    { barcode: "LOOSE003", name: "Dal (Toor)" },
    { barcode: "LOOSE004", name: "Dal (Chana)" },
    { barcode: "LOOSE005", name: "Wheat Flour" },
    { barcode: "LOOSE006", name: "Peanuts" },
    { barcode: "LOOSE007", name: "Maida" },
    { barcode: "LOOSE008", name: "Sooji (Rava)" },
    { barcode: "LOOSE009", name: "Poha" },
    { barcode: "LOOSE010", name: "Salt" },
    { barcode: "LOOSE011", name: "Cooking Oil" },
    { barcode: "LOOSE012", name: "Coconut Oil" },
  ];

  return (
    <div className="qr-overlay">
      <div style={{width:"100%", maxWidth:"400px"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px"}}>
          <h2 style={{fontSize:"18px", fontWeight:"700"}}>Loose Item Barcodes</h2>
          <button className="clear-btn" onClick={onClose}>← Back</button>
        </div>
        <p style={{fontSize:"13px", color:"#888", marginBottom:"16px"}}>
          Print and paste on boxes in your shop
        </p>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
          {items.map((item) => (
            <div key={item.barcode} style={{background:"white", borderRadius:"10px", padding:"12px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.1)"}}>
              <img
                src={`https://barcodeapi.org/api/128/${item.barcode}`}
                alt={item.name}
                style={{width:"100%", height:"50px", objectFit:"contain"}}
              />
              <p style={{fontSize:"12px", fontWeight:"600", marginTop:"6px"}}>{item.name}</p>
              <p style={{fontSize:"10px", color:"#888"}}>{item.barcode}</p>
            </div>
          ))}
        </div>
        <button className="generate-btn" style={{width:"100%", marginTop:"16px"}} onClick={() => window.print()}>
          🖨️ Print Barcodes
        </button>
      </div>
    </div>
  );
}

export default LooseBarcodes;
// Connect directly to your cloud Supabase database
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZXRtb3JydnRwaXdrZ2llY2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNTAyMzMsImV4cCI6MjEwMzYyNjIzM30.HiZAKbpvNgtj1V87rjNI7EXdGhUfwoaX0xy974PeoRc"; // Right click and paste your long key between these quotes!
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Fetch data from SQL when the website loads
async function fetchInventory() {
    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('id', { ascending: false });

    if (error) return console.error(error);

    const tableBody = document.getElementById("inventoryRows");
    tableBody.innerHTML = ""; // Clear active rows

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No entries logged yet, bro!</td></tr>`;
        return;
    }

    // Loop through your cloud database table rows using your C logic mindset
    data.forEach(item => {
        // Set dynamic stock warnings based on quantities
        let statusBadge = `<span class="badge success">Optimal</span>`;
        let rowClass = "";
        
        if (item.quantity < 15) {
            statusBadge = `<span class="badge danger">Low Stock</span>`;
            rowClass = "alert-row";
        }

        let row = `<tr class="${rowClass}">
            <td>${item.material_name}</td>
            <td>${item.quantity}</td>
            <td>₹${parseFloat(item.unit_price).toFixed(2)}</td>
            <td>₹${parseFloat(item.total_cost).toFixed(2)}</td>
            <td>${statusBadge}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
}

// Intercept form submissions and write row entries into SQL database
document.getElementById("materialForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    let name = document.getElementById("matName").value;
    let qty = parseInt(document.getElementById("matQty").value);
    let price = parseFloat(document.getElementById("matPrice").value);
    
    // Core calculation arithmetic (Identical math concept to C structures!)
    let computedTotal = qty * price;

    // Send an API-driven SQL INSERT command straight to your cloud grid
    const { error } = await supabase
        .from('inventory')
        .insert([{ material_name: name, quantity: qty, unit_price: price, total_cost: computedTotal }]);

    if (error) {
        alert("Error saving your entry to the database!");
        console.error(error);
    } else {
        fetchInventory(); // Instantly refresh data layout grid on your screen
    }
});

// Run immediate data fetch when webpage boots up
fetchInventory();
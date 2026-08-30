// ============================================================
// IDORA — SMART MATERIAL INTELLIGENCE
// Supabase Database Connection
// ============================================================

// IMPORTANT:
// Replace these TWO values with your actual Supabase project
// URL and PUBLIC anon/publishable key.

const SUPABASE_URL = "https://xletmorrvtpiwkgieccn.supabase.co";
const SUPABASE_KEY = "sb_publishable_VyVQ-v-FkOg6LIkk-gdwtQ_auoGdvSo";


// ============================================================
// INITIALIZE SUPABASE
// ============================================================

if (!window.supabase) {
    console.error("Supabase library failed to load.");
    showMessage(
        "Supabase library failed to load. Check your internet connection.",
        "error"
    );
    throw new Error("Supabase library unavailable.");
}

const dbClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ============================================================
// DOM ELEMENTS
// ============================================================

const materialForm = document.getElementById("materialForm");
const inventoryRows = document.getElementById("inventoryRows");

const matName = document.getElementById("matName");
const matQty = document.getElementById("matQty");
const matPrice = document.getElementById("matPrice");

const computedTotal = document.getElementById("computedTotal");
const saveButton = document.getElementById("saveButton");
const refreshButton = document.getElementById("refreshButton");

const totalEntries = document.getElementById("totalEntries");
const stockValue = document.getElementById("stockValue");
const materialTypes = document.getElementById("materialTypes");
const lowStock = document.getElementById("lowStock");


// ============================================================
// HELPER — SHOW FORM MESSAGE
// ============================================================

function showMessage(message, type) {

    const box = document.getElementById("formMessage");

    box.textContent = message;
    box.className = `message ${type}`;

}


// ============================================================
// HELPER — FORMAT RUPEES
// ============================================================

function formatRupees(value) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(Number(value) || 0);

}


// ============================================================
// LIVE TOTAL CALCULATION
// ============================================================

function updateCalculatedTotal() {

    const quantity = Number(matQty.value) || 0;
    const price = Number(matPrice.value) || 0;

    const total = quantity * price;

    computedTotal.textContent = formatRupees(total);

}

matQty.addEventListener("input", updateCalculatedTotal);
matPrice.addEventListener("input", updateCalculatedTotal);


// ============================================================
// FETCH INVENTORY
// ============================================================

async function fetchInventory() {

    inventoryRows.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                Loading live inventory...
            </td>
        </tr>
    `;

    try {

        const { data, error } = await dbClient
            .from("inventory")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            throw error;
        }

        renderInventory(data || []);

    } catch (error) {

        console.error("Inventory fetch error:", error);

        inventoryRows.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Unable to load inventory.
                    <br><br>
                    Check your Supabase URL, public key, and RLS policies.
                </td>
            </tr>
        `;

        totalEntries.textContent = "—";
        stockValue.textContent = "—";
        materialTypes.textContent = "—";
        lowStock.textContent = "—";
    }

}


// ============================================================
// RENDER INVENTORY
// ============================================================

function renderInventory(data) {

    inventoryRows.innerHTML = "";

    if (data.length === 0) {

        inventoryRows.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No material entries yet.
                    <br>
                    Add your first material using the form.
                </td>
            </tr>
        `;

        updateStats([]);

        return;
    }


    data.forEach(item => {

        const quantity = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        const total = Number(item.total_cost) || quantity * price;

        const isLowStock = quantity < 15;

        const row = document.createElement("tr");

        if (isLowStock) {
            row.classList.add("alert-row");
        }

        row.innerHTML = `
            <td class="material-name">
                ${escapeHTML(item.material_name)}
            </td>

            <td>
                ${quantity}
            </td>

            <td class="price">
                ${formatRupees(price)}
            </td>

            <td>
                ${formatRupees(total)}
            </td>

            <td>
                ${
                    isLowStock
                    ? `<span class="badge danger">Low Stock</span>`
                    : `<span class="badge success">Optimal</span>`
                }
            </td>
        `;

        inventoryRows.appendChild(row);

    });


    updateStats(data);

}


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

function updateStats(data) {

    const total = data.reduce(
        (sum, item) => sum + (Number(item.total_cost) || 0),
        0
    );

    const types = new Set(
        data.map(item => item.material_name)
    ).size;

    const low = data.filter(
        item => Number(item.quantity) < 15
    ).length;

    totalEntries.textContent = data.length;
    stockValue.textContent = formatRupees(total);
    materialTypes.textContent = types;
    lowStock.textContent = low;

}


// ============================================================
// SAVE MATERIAL
// ============================================================

materialForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = matName.value;
    const quantity = Number(matQty.value);
    const price = Number(matPrice.value);

    if (!name || quantity <= 0 || price < 0) {

        showMessage(
            "Please enter valid material information.",
            "error"
        );

        return;
    }

    const totalCost = quantity * price;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    showMessage(
        "Writing material to the live database...",
        "success"
    );

    try {

        const { error } = await dbClient
            .from("inventory")
            .insert([
                {
                    material_name: name,
                    quantity: quantity,
                    unit_price: price,
                    total_cost: totalCost
                }
            ]);

        if (error) {
            throw error;
        }

        showMessage(
            "✓ Material successfully saved to IDORA.",
            "success"
        );

        materialForm.reset();

        matQty.value = 50;
        matPrice.value = 450;

        updateCalculatedTotal();

        await fetchInventory();

    } catch (error) {

        console.error("Database insert error:", error);

        showMessage(
            `Unable to save material: ${error.message}`,
            "error"
        );

    } finally {

        saveButton.disabled = false;
        saveButton.textContent = "Save Material";

    }

});


// ============================================================
// REFRESH BUTTON
// ============================================================

refreshButton.addEventListener("click", async function () {

    refreshButton.textContent = "Loading...";
    refreshButton.disabled = true;

    await fetchInventory();

    refreshButton.textContent = "Refresh";
    refreshButton.disabled = false;

});


// ============================================================
// BASIC HTML ESCAPING
// ============================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ============================================================
// START APPLICATION
// ============================================================

updateCalculatedTotal();
fetchInventory();
// ============================================================
// IDORA — SMART MATERIAL INTELLIGENCE
// Inventory + Usage + Live Stock Calculation
// ============================================================


// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================

// ⚠️ KEEP YOUR REAL VALUES HERE
const SUPABASE_URL = "https://xletmorrvtpiwkgieccn.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_VyVQ-v-FkOg6LIkk-gdwtQ_auoGdvSo";


// ============================================================
// 2. INITIALIZE SUPABASE
// ============================================================

if (!window.supabase) {
    console.error("Supabase library failed to load.");
    throw new Error("Supabase library unavailable.");
}

const dbClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ============================================================
// 3. DOM ELEMENTS
// ============================================================

// Inward
const materialForm = document.getElementById("materialForm");
const matName = document.getElementById("matName");
const matQty = document.getElementById("matQty");
const matPrice = document.getElementById("matPrice");
const computedTotal = document.getElementById("computedTotal");
const saveButton = document.getElementById("saveButton");

// Usage
const usageForm = document.getElementById("usageForm");
const usageMaterial = document.getElementById("usageMaterial");
const usageQty = document.getElementById("usageQty");
const usedFor = document.getElementById("usedFor");
const usageSaveButton = document.getElementById("usageSaveButton");
const usageMessage = document.getElementById("usageMessage");

// Messages
const formMessage = document.getElementById("formMessage");

// Ledger
const inventoryRows = document.getElementById("inventoryRows");
const refreshButton = document.getElementById("refreshButton");

// Stats
const totalEntries = document.getElementById("totalEntries");
const stockValue = document.getElementById("stockValue");
const materialTypes = document.getElementById("materialTypes");
const lowStock = document.getElementById("lowStock");

// Tabs
const inwardTab = document.getElementById("inwardTab");
const usageTab = document.getElementById("usageTab");
const inwardPanel = document.getElementById("inwardPanel");
const usagePanel = document.getElementById("usagePanel");


// ============================================================
// 4. MESSAGE HELPERS
// ============================================================

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `message ${type}`;
}

function showUsageMessage(message, type) {
    usageMessage.textContent = message;
    usageMessage.className = `message ${type}`;
}


// ============================================================
// 5. RUPEE FORMATTER
// ============================================================

function formatRupees(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(Number(value) || 0);
}


// ============================================================
// 6. LIVE COST CALCULATION
// ============================================================

function updateCalculatedTotal() {

    const quantity = Number(matQty.value) || 0;
    const price = Number(matPrice.value) || 0;

    computedTotal.textContent =
        formatRupees(quantity * price);
}

matQty.addEventListener(
    "input",
    updateCalculatedTotal
);

matPrice.addEventListener(
    "input",
    updateCalculatedTotal
);


// ============================================================
// 7. TAB SWITCHING
// ============================================================

inwardTab.addEventListener("click", function () {

    inwardTab.classList.add("active");
    usageTab.classList.remove("active");

    inwardPanel.style.display = "block";
    usagePanel.style.display = "none";
});


usageTab.addEventListener("click", function () {

    usageTab.classList.add("active");
    inwardTab.classList.remove("active");

    inwardPanel.style.display = "none";
    usagePanel.style.display = "block";
});


// ============================================================
// 8. FETCH ALL DATA
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

        // Get inward records
        const { data: inventory, error: inventoryError } =
            await dbClient
                .from("inventory")
                .select("*")
                .order("id", {
                    ascending: true
                });

        if (inventoryError) {
            throw inventoryError;
        }


        // Get usage records
        const { data: usage, error: usageError } =
            await dbClient
                .from("material_usage")
                .select("*")
                .order("id", {
                    ascending: true
                });

        if (usageError) {
            throw usageError;
        }


        calculateAndRender(
            inventory || [],
            usage || []
        );

    }

    catch (error) {

        console.error(
            "Database fetch error:",
            error
        );

        inventoryRows.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Unable to load inventory.
                    <br><br>
                    ${escapeHTML(error.message)}
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
// 9. CALCULATE ACTUAL STOCK
// ============================================================

function calculateAndRender(
    inventory,
    usage
) {

    /*
     * We calculate:
     *
     * AVAILABLE STOCK
     * =
     * TOTAL INWARD - TOTAL USED
     */


    // --------------------------------------------------------
    // Calculate total usage for each material
    // --------------------------------------------------------

    const usageTotals = {};

    usage.forEach(record => {

        const name =
            record.material_name;

        const quantity =
            Number(record.quantity) || 0;

        usageTotals[name] =
            (usageTotals[name] || 0) + quantity;
    });


    // --------------------------------------------------------
    // Calculate total inward for each material
    // --------------------------------------------------------

    const inwardTotals = {};

    inventory.forEach(record => {

        const name =
            record.material_name;

        const quantity =
            Number(record.quantity) || 0;

        inwardTotals[name] =
            (inwardTotals[name] || 0) + quantity;
    });


    // --------------------------------------------------------
    // Calculate available stock
    // --------------------------------------------------------

    const availableStock = {};

    Object.keys(inwardTotals).forEach(name => {

        const inward =
            inwardTotals[name] || 0;

        const used =
            usageTotals[name] || 0;

        availableStock[name] =
            Math.max(0, inward - used);
    });


    // --------------------------------------------------------
    // Render ledger
    // --------------------------------------------------------

    renderInventory(
        inventory,
        usageTotals,
        availableStock
    );


    // --------------------------------------------------------
    // Update dashboard
    // --------------------------------------------------------

    updateStats(
        inventory,
        availableStock
    );
}


// ============================================================
// 10. RENDER INVENTORY
// ============================================================

function renderInventory(
    data,
    usageTotals,
    availableStock
) {

    inventoryRows.innerHTML = "";

    if (data.length === 0) {

        inventoryRows.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No material entries yet.
                    <br><br>
                    Add your first material using the form.
                </td>
            </tr>
        `;

        return;
    }


    /*
     * Usage is deducted FIFO-style from inward entries.
     *
     * Example:
     *
     * Entry 1 → 50 cement
     * Entry 2 → 30 cement
     * Used → 60 cement
     *
     * Remaining:
     * Entry 1 → 0
     * Entry 2 → 20
     */


    const remainingUsage = {
        ...usageTotals
    };


    data.forEach(item => {

        const name =
            item.material_name;

        const inwardQuantity =
            Number(item.quantity) || 0;

        const price =
            Number(item.unit_price) || 0;


        let usedFromThisEntry = 0;


        if (remainingUsage[name] > 0) {

            usedFromThisEntry =
                Math.min(
                    inwardQuantity,
                    remainingUsage[name]
                );

            remainingUsage[name] -=
                usedFromThisEntry;
        }


        const availableQuantity =
            Math.max(
                0,
                inwardQuantity - usedFromThisEntry
            );


        const remainingValue =
            availableQuantity * price;


        const isLowStock =
            availableStock[name] < 15;


        const row =
            document.createElement("tr");


        if (isLowStock) {
            row.classList.add("alert-row");
        }


        row.innerHTML = `

            <td class="material-name">
                ${escapeHTML(name)}
            </td>

            <td>
                ${availableQuantity}
            </td>

            <td class="price">
                ${formatRupees(price)}
            </td>

            <td>
                ${formatRupees(remainingValue)}
            </td>

            <td>

                ${
                    isLowStock

                    ? `
                        <span class="badge danger">
                            Low Stock
                        </span>
                      `

                    : `
                        <span class="badge success">
                            Optimal
                        </span>
                      `
                }

            </td>
        `;


        inventoryRows.appendChild(row);
    });
}


// ============================================================
// 11. DASHBOARD STATISTICS
// ============================================================

function updateStats(
    inventory,
    availableStock
) {

    // Total database entries
    totalEntries.textContent =
        inventory.length;


    // Unique material types
    const types =
        Object.keys(availableStock).length;


    materialTypes.textContent =
        types;


    // Low-stock materials
    const low =
        Object.values(
            availableStock
        ).filter(
            quantity => quantity < 15
        ).length;


    lowStock.textContent =
        low;


    // --------------------------------------------------------
    // Calculate current stock value
    // --------------------------------------------------------

    const prices = {};


    inventory.forEach(item => {

        const name =
            item.material_name;

        const price =
            Number(item.unit_price) || 0;

        /*
         * Keep the latest known unit price
         * for each material.
         */

        prices[name] = price;
    });


    let currentValue = 0;


    Object.entries(
        availableStock
    ).forEach(
        ([name, quantity]) => {

            const price =
                prices[name] || 0;

            currentValue +=
                quantity * price;
        }
    );


    stockValue.textContent =
        formatRupees(currentValue);
}


// ============================================================
// 12. SAVE INCOMING MATERIAL
// ============================================================

materialForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const name =
            matName.value;

        const quantity =
            Number(matQty.value);

        const price =
            Number(matPrice.value);


        if (
            !name ||
            quantity <= 0 ||
            price < 0
        ) {

            showMessage(
                "Please enter valid material information.",
                "error"
            );

            return;
        }


        const totalCost =
            quantity * price;


        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";


        showMessage(
            "Writing material to the live database...",
            "success"
        );


        try {

            const { error } =
                await dbClient
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

        }

        catch (error) {

            console.error(
                "Database insert error:",
                error
            );


            showMessage(
                `Unable to save material: ${error.message}`,
                "error"
            );

        }

        finally {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Material";
        }
    }
);


// ============================================================
// 13. SAVE MATERIAL USAGE
// ============================================================

usageForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const material =
            usageMaterial.value;

        const quantity =
            Number(usageQty.value);

        const purpose =
            usedFor.value.trim();


        if (
            !material ||
            quantity <= 0 ||
            !purpose
        ) {

            showUsageMessage(
                "Please enter valid usage information.",
                "error"
            );

            return;
        }


        // ----------------------------------------------------
        // Check current available stock
        // ----------------------------------------------------

        try {

            const { data: inventory, error: inventoryError } =
                await dbClient
                    .from("inventory")
                    .select("material_name, quantity");

            if (inventoryError) {
                throw inventoryError;
            }


            const { data: usage, error: usageError } =
                await dbClient
                    .from("material_usage")
                    .select("material_name, quantity");

            if (usageError) {
                throw usageError;
            }


            let totalInward = 0;
            let totalUsed = 0;


            (inventory || []).forEach(item => {

                if (
                    item.material_name === material
                ) {

                    totalInward +=
                        Number(item.quantity) || 0;
                }
            });


            (usage || []).forEach(item => {

                if (
                    item.material_name === material
                ) {

                    totalUsed +=
                        Number(item.quantity) || 0;
                }
            });


            const available =
                Math.max(
                    0,
                    totalInward - totalUsed
                );


            // ------------------------------------------------
            // Prevent impossible usage
            // ------------------------------------------------

            if (quantity > available) {

                showUsageMessage(
                    `Not enough ${material} in stock. Available: ${available}`,
                    "error"
                );

                return;
            }


            // ------------------------------------------------
            // Save usage
            // ------------------------------------------------

            usageSaveButton.disabled =
                true;

            usageSaveButton.textContent =
                "Saving...";


            showUsageMessage(
                "Recording material consumption...",
                "success"
            );


            const { error } =
                await dbClient
                    .from("material_usage")
                    .insert([

                        {
                            material_name: material,
                            quantity: quantity,
                            used_for: purpose
                        }

                    ]);


            if (error) {
                throw error;
            }


            showUsageMessage(
                "✓ Material usage recorded successfully.",
                "success"
            );


            usageForm.reset();

            usageQty.value = 10;


            // Refresh everything
            await fetchInventory();

        }

        catch (error) {

            console.error(
                "Usage insert error:",
                error
            );


            showUsageMessage(
                `Unable to record usage: ${error.message}`,
                "error"
            );

        }

        finally {

            usageSaveButton.disabled =
                false;

            usageSaveButton.textContent =
                "Record Usage";
        }

    }
);


// ============================================================
// 14. REFRESH BUTTON
// ============================================================

refreshButton.addEventListener(
    "click",
    async function () {

        refreshButton.disabled =
            true;

        refreshButton.textContent =
            "Loading...";


        await fetchInventory();


        refreshButton.disabled =
            false;

        refreshButton.textContent =
            "Refresh";
    }
);


// ============================================================
// 15. HTML ESCAPING
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
// 16. START IDORA
// ============================================================

updateCalculatedTotal();

fetchInventory();
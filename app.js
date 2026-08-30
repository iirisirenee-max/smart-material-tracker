// ============================================================
// IDORA — SMART MATERIAL INTELLIGENCE
// Complete Supabase Application Logic
// ============================================================


// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = "https://xletmorrvtpiwkgieccn.supabase.co";
const SUPABASE_KEY = "sb_publishable_VyVQ-v-FkOg6LIkk-gdwtQ_auoGdvSo";


// ============================================================
// 2. INITIALIZE SUPABASE
// ============================================================

if (!window.supabase) {

    console.error("Supabase library failed to load.");

    throw new Error(
        "Supabase library unavailable."
    );
}

const dbClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ============================================================
// 3. DOM ELEMENTS
// ============================================================

// Inward form
const materialForm =
    document.getElementById("materialForm");

const matName =
    document.getElementById("matName");

const matQty =
    document.getElementById("matQty");

const matPrice =
    document.getElementById("matPrice");

const computedTotal =
    document.getElementById("computedTotal");

const saveButton =
    document.getElementById("saveButton");


// Usage form
const usageForm =
    document.getElementById("usageForm");

const usageMaterial =
    document.getElementById("usageMaterial");

const usageQty =
    document.getElementById("usageQty");

const usedFor =
    document.getElementById("usedFor");

const usageSaveButton =
    document.getElementById("usageSaveButton");

const usageMessage =
    document.getElementById("usageMessage");


// Messages
const formMessage =
    document.getElementById("formMessage");


// Ledger
const inventoryRows =
    document.getElementById("inventoryRows");

const refreshButton =
    document.getElementById("refreshButton");


// Statistics
const totalEntries =
    document.getElementById("totalEntries");

const stockValue =
    document.getElementById("stockValue");

const materialTypes =
    document.getElementById("materialTypes");

const lowStock =
    document.getElementById("lowStock");


// Tabs
const inwardTab =
    document.getElementById("inwardTab");

const usageTab =
    document.getElementById("usageTab");

const inwardPanel =
    document.getElementById("inwardPanel");

const usagePanel =
    document.getElementById("usagePanel");


// ============================================================
// 4. MESSAGE HELPER
// ============================================================

function showMessage(message, type) {

    formMessage.textContent = message;

    formMessage.className =
        `message ${type}`;
}


function showUsageMessage(message, type) {

    usageMessage.textContent = message;

    usageMessage.className =
        `message ${type}`;
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

    const quantity =
        Number(matQty.value) || 0;

    const price =
        Number(matPrice.value) || 0;

    const total =
        quantity * price;

    computedTotal.textContent =
        formatRupees(total);
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

inwardTab.addEventListener(
    "click",
    function () {

        inwardTab.classList.add("active");
        usageTab.classList.remove("active");

        inwardPanel.style.display = "block";
        usagePanel.style.display = "none";

    }
);


usageTab.addEventListener(
    "click",
    function () {

        usageTab.classList.add("active");
        inwardTab.classList.remove("active");

        inwardPanel.style.display = "none";
        usagePanel.style.display = "block";

    }
);


// ============================================================
// 8. FETCH INVENTORY
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

        const { data, error } =
            await dbClient
                .from("inventory")
                .select("*")
                .order("id", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        renderInventory(
            data || []
        );

    }

    catch (error) {

        console.error(
            "Inventory fetch error:",
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
// 9. RENDER INVENTORY
// ============================================================

function renderInventory(data) {

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

        updateStats([]);

        return;
    }


    data.forEach(item => {

        const quantity =
            Number(item.quantity) || 0;

        const price =
            Number(item.unit_price) || 0;

        const total =
            Number(item.total_cost) ||
            quantity * price;

        const isLowStock =
            quantity < 15;


        const row =
            document.createElement("tr");


        if (isLowStock) {

            row.classList.add(
                "alert-row"
            );
        }


        row.innerHTML = `

            <td class="material-name">
                ${escapeHTML(
                    item.material_name
                )}
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


    updateStats(data);
}


// ============================================================
// 10. DASHBOARD STATISTICS
// ============================================================

function updateStats(data) {

    const total =
        data.reduce(

            (sum, item) =>

                sum +
                (Number(item.total_cost) || 0),

            0
        );


    const types =
        new Set(

            data.map(
                item => item.material_name
            )

        ).size;


    const low =
        data.filter(

            item =>
                Number(item.quantity) < 15

        ).length;


    totalEntries.textContent =
        data.length;

    stockValue.textContent =
        formatRupees(total);

    materialTypes.textContent =
        types;

    lowStock.textContent =
        low;
}


// ============================================================
// 11. SAVE INCOMING MATERIAL
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


        saveButton.disabled = true;

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

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Material";
        }

    }
);


// ============================================================
// 12. SAVE MATERIAL USAGE
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


        usageSaveButton.disabled =
            true;

        usageSaveButton.textContent =
            "Saving...";


        showUsageMessage(
            "Recording material consumption...",
            "success"
        );


        try {

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


            /*
             * Refresh the inventory after recording usage.
             * At this stage the ledger still shows
             * incoming quantities.
             *
             * In the next upgrade we can calculate:
             *
             * INWARD - USAGE = ACTUAL STOCK
             */

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
// 13. REFRESH BUTTON
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
// 14. HTML ESCAPING
// ============================================================

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


// ============================================================
// 15. START IDORA
// ============================================================

updateCalculatedTotal();

fetchInventory();
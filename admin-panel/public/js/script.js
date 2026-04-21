const modal = document.getElementById("modal");
const modalText = document.getElementById("modal-text");
const form = document.getElementById("modal-form");

const telegramInput = document.getElementById("telegram_id");
const subInput = document.getElementById("subscripcion_id");

function openModal(action, text, telegramId, subId) {
    modalText.innerText = text;

    form.action = action;

    telegramInput.value = telegramId || "";
    subInput.value = subId || "";

    modal.classList.remove("hidden");
}

function closeModal() {
    modal.classList.add("hidden");
}

/* PAY */
document.querySelectorAll(".btn-pay").forEach(btn => {
    btn.addEventListener("click", (e) => {

        openModal(
            "/pay",
            `¿Confirmar pago y activar suscripción de ${e.currentTarget.dataset.user} ?`,
            btn.dataset.id,
            btn.dataset.sub
        );
    });
});

/* REVOKE */
document.querySelectorAll(".btn-revoke").forEach(btn => {
    btn.addEventListener("click", (e) => {
        openModal(
            "/revoke",
            `¿Revocar acceso de ${e.currentTarget.dataset.user} ?`,
            null,
            btn.dataset.sub
        );
    });
});

/* ACTIVATE */
document.querySelectorAll(".btn-activate").forEach(btn => {
    btn.addEventListener("click", (e) => {
        openModal(
            "/activate",
            `¿Activar acceso de ${e.currentTarget.dataset.user} ?`,
            btn.dataset.id,
            btn.dataset.sub
        );
    });
});

/* ACTIVATE */
document.querySelectorAll(".btn-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
        openModal(
            "/remove",
            `¿Borrar usuario con id ${e.currentTarget.dataset.user} ?`,
            btn.dataset.id,
            null
        );
    });
});
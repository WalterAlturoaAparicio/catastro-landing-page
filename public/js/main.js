/* ============================================================
   TOLIMA PRECISO — Main JavaScript
   ============================================================ */

const API_BASE = '/api';

/* ─── Lucide icons ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initMobileMenu();
    initNavbar();
    initScrollReveal();
    initAccordion();
    initConsultForm();
    initPaymentButtons();
});

/* ─── Mobile menu ───────────────────────────────────────────── */
function initMobileMenu() {
    const menuBtn     = document.getElementById('menuBtn');
    const closeMenuBtn= document.getElementById('closeMenuBtn');
    const mobileMenu  = document.getElementById('mobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    menuBtn?.addEventListener('click',  () => mobileMenu.classList.add('open'));
    closeMenuBtn?.addEventListener('click', () => mobileMenu.classList.remove('open'));
    mobileLinks.forEach(l => l.addEventListener('click', () => mobileMenu.classList.remove('open')));
}

/* ─── Navbar scroll shadow ──────────────────────────────────── */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.style.borderBottom = window.scrollY > 100
            ? '1px solid rgba(255,255,255,0.05)'
            : 'none';
    });
}

/* ─── Scroll reveal (IntersectionObserver) ──────────────────── */
function initScrollReveal() {
    const obs = new IntersectionObserver(
        (entries) => entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        }),
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.scroll-reveal').forEach(el => obs.observe(el));
}

/* ─── Accordion (FAQ) ───────────────────────────────────────── */
function initAccordion() {
    document.querySelectorAll('.accordion-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleAccordion(btn));
    });
}

function toggleAccordion(btn) {
    const item    = btn.closest('.accordion-item');
    const content = item.querySelector('.accordion-content');
    const icon    = item.querySelector('.accordion-icon');
    const isOpen  = content.classList.contains('open');

    document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('open'));
    document.querySelectorAll('.accordion-icon').forEach(i => i.style.transform = 'rotate(0deg)');

    if (!isOpen) {
        content.classList.add('open');
        icon.style.transform = 'rotate(45deg)';
    }
}

/* ─── Video placeholder ─────────────────────────────────────── */
function playVideo() {
    const container = document.getElementById('videoContainer');
    container.innerHTML = `
        <div class="relative h-48 flex items-center justify-center bg-brand-gray">
            <div class="text-center">
                <div class="w-16 h-16 bg-brand-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C25E28" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
                <p class="text-sm text-neutral-400">Video de Walter Alturo Tapiero</p>
                <p class="text-xs text-neutral-600 mt-1">"Cómo no dejarse estafar con el API"</p>
            </div>
        </div>`;
}

/* ─── Toast ─────────────────────────────────────────────────── */
function showToast(msg = '¡Solicitud enviada!', sub = 'Recibirá su diagnóstico en menos de 24 horas.', type = 'success') {
    const toast  = document.getElementById('toast');
    const icon   = document.getElementById('toastIcon');
    const title  = document.getElementById('toastTitle');
    const detail = document.getElementById('toastDetail');

    title.textContent  = msg;
    detail.textContent = sub;
    icon.className = type === 'error'
        ? 'w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center flex-shrink-0'
        : 'w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0';

    toast.classList.add('show');
    setTimeout(hideToast, 5000);
}
function hideToast() { document.getElementById('toast').classList.remove('show'); }

/* ═══════════════════════════════════════════════════════════════
   FREE CONSULTATION FORM → saves client to local DB via API
   ═══════════════════════════════════════════════════════════════ */
function initConsultForm() {
    const form = document.getElementById('consultForm');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn      = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML  = '<span class="spinner"></span> Enviando…';
        btn.disabled   = true;

        const payload = {
            nombre:    document.getElementById('formName').value.trim(),
            telefono:  document.getElementById('formPhone').value.trim(),
            email:     document.getElementById('formEmail').value.trim(),
            predial:   document.getElementById('formPredial').value.trim(),
            municipio: document.getElementById('formMunicipio').value,
        };

        try {
            const res  = await fetch(`${API_BASE}/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Error al enviar');

            showToast('¡Solicitud recibida!', 'Recibirá su diagnóstico en menos de 24 horas.');
            form.reset();
        } catch (err) {
            showToast('Error al enviar', err.message, 'error');
        } finally {
            btn.innerHTML = original;
            btn.disabled  = false;
        }
    });
}

/* ═══════════════════════════════════════════════════════════════
   PAYMENT BUTTONS → open plan modal
   ═══════════════════════════════════════════════════════════════ */
const PLANES = {
    urbano:    { nombre: 'Plan Urbano',           precio: 350000, desc: 'Predio urbano menor a 200m²' },
    rural:     { nombre: 'Plan Rural',            precio: 800000, desc: 'Predio rural menor a 1 hectárea' },
    monitoreo: { nombre: 'Seguridad Catastral',   precio: 50000,  desc: 'Monitoreo API anual del predio' },
};

function initPaymentButtons() {
    document.querySelectorAll('[data-plan]').forEach(btn => {
        btn.addEventListener('click', () => openPaymentModal(btn.dataset.plan));
    });
}

/* ─── Payment modal ─────────────────────────────────────────── */
function openPaymentModal(planKey) {
    const plan   = PLANES[planKey];
    const modal  = document.getElementById('paymentModal');
    const title  = document.getElementById('payModalTitle');
    const detail = document.getElementById('payModalDetail');
    const price  = document.getElementById('payModalPrice');
    const hidden = document.getElementById('payModalPlanKey');

    title.textContent  = plan.nombre;
    detail.textContent = plan.desc;
    price.textContent  = `$${plan.precio.toLocaleString('es-CO')} COP`;
    hidden.value       = planKey;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('open');
    document.body.style.overflow = '';
}

/* ─── Payment form submit → creates MP preference ───────────── */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('paymentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn      = e.target.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML  = '<span class="spinner"></span> Redirigiendo…';
        btn.disabled   = true;

        const planKey  = document.getElementById('payModalPlanKey').value;
        const payload  = {
            plan:     planKey,
            nombre:   document.getElementById('payName').value.trim(),
            email:    document.getElementById('payEmail').value.trim(),
            telefono: document.getElementById('payPhone').value.trim(),
            predial:  document.getElementById('payPredial').value.trim(),
        };

        try {
            const res  = await fetch(`${API_BASE}/pagos/crear-preferencia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago');

            // Redirect to Mercado Pago checkout
            window.location.href = data.init_point;
        } catch (err) {
            showToast('Error de pago', err.message, 'error');
            btn.innerHTML = original;
            btn.disabled  = false;
        }
    });

    // Close modal clicking outside
    document.getElementById('paymentModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('paymentModal')) closePaymentModal();
    });
});

/* ─── Payment result page handler ──────────────────────────────
   Si la URL tiene ?payment_status=approved|failure|pending,
   mostrar feedback al usuario.
   ─────────────────────────────────────────────────────────────── */
(function checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment_status') || params.get('status');
    if (!status) return;

    const messages = {
        approved: ['¡Pago aprobado!',  'Su servicio ha sido registrado. Recibirá confirmación por correo.', 'success'],
        failure:  ['Pago rechazado',   'No se procesó el cobro. Intente de nuevo o use otro medio de pago.', 'error'],
        pending:  ['Pago en revisión', 'Su pago está siendo procesado. Le notificaremos por correo.', 'success'],
    };

    const [msg, sub, type] = messages[status] || ['Estado desconocido', status, 'error'];
    // Wait for DOM to be ready (already inside DOMContentLoaded listener above handles lucide, so we use setTimeout)
    setTimeout(() => showToast(msg, sub, type), 800);

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
})();
